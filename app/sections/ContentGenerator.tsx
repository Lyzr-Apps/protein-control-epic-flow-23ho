'use client'

import React, { useState, useRef } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { copyToClipboard } from '@/lib/clipboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileText, Layout, Loader2, Copy, Check, ChevronRight } from 'lucide-react'

const RECIPE_AGENT_ID = '69a24ec3f89af5d059caa2dd'

const LANGUAGES = [
  { value: 'English', label: 'English' },
  { value: 'Spanish', label: 'Spanish' },
  { value: 'French', label: 'French' },
  { value: 'German', label: 'German' },
  { value: 'Portuguese', label: 'Portuguese' },
  { value: 'Italian', label: 'Italian' },
  { value: 'Japanese', label: 'Japanese' },
  { value: 'Korean', label: 'Korean' },
  { value: 'Chinese', label: 'Chinese' },
]

const SAMPLE_CONTENT = {
  pinterest_title: '5-Minute High-Protein Breakfast Pancakes That Actually Keep You Full Until Lunch',
  blog_headline: 'High-Protein Breakfast Pancakes: The Metabolic Morning Fuel Your Body Has Been Craving',
  meta_description: 'Discover how high-protein breakfast pancakes stabilize blood sugar and crush mid-morning cravings. Get the science-backed recipe plus macro breakdown. Start your 21-day metabolic reset today.',
  metabolic_introduction: "Here's the truth most diet plans won't tell you: **your breakfast sets the metabolic tone for your entire day.** When you start with a protein-rich meal, you trigger a cascade of hormonal responses -- from GLP-1 release that signals satiety, to stabilized insulin that prevents the dreaded 10 AM energy crash.\n\nThese aren't just any pancakes. They're engineered for metabolic performance, delivering 32g of protein per serving while keeping your glycemic response smooth and steady. The result? Sustained energy, controlled hunger, and a body that's burning fuel efficiently rather than storing it.",
  recipe_ingredients: "- 1 cup oat flour (or blended rolled oats)\n- 1 scoop vanilla whey protein powder (30g)\n- 2 large eggs\n- 1/2 cup Greek yogurt (full fat)\n- 1/4 cup unsweetened almond milk\n- 1 tsp baking powder\n- 1/2 tsp cinnamon\n- 1 tbsp coconut oil (for cooking)\n- Pinch of sea salt\n- Optional: 1/4 cup blueberries",
  recipe_instructions: "1. **Combine dry ingredients:** In a large bowl, mix the oat flour, protein powder, baking powder, cinnamon, and salt.\n2. **Whisk wet ingredients:** In a separate bowl, beat the eggs, then stir in the Greek yogurt and almond milk until smooth.\n3. **Merge and rest:** Pour the wet mixture into the dry ingredients and stir until just combined. Let the batter rest for 3 minutes -- this allows the oat flour to hydrate for fluffier pancakes.\n4. **Heat the pan:** Warm a non-stick skillet over medium heat. Add a thin layer of coconut oil.\n5. **Cook:** Pour 1/4 cup batter per pancake. Cook for 2-3 minutes until bubbles form on the surface, then flip and cook for 1-2 more minutes.\n6. **Serve:** Stack 3-4 pancakes and top with fresh berries. Avoid syrup -- the natural sweetness from cinnamon and berries is metabolically optimal.",
  macro_breakdown: "**Per Serving (3 pancakes):**\n- Calories: 420 kcal\n- Protein: 32g\n- Carbohydrates: 38g (net carbs: 34g)\n- Fat: 16g\n- Fiber: 4g\n- Sugar: 5g\n\n**Metabolic Profile:** High protein-to-carb ratio (0.84:1) supports sustained GLP-1 release. The fiber and fat content slows gastric emptying, keeping you satiated for 4-5 hours.",
  weekly_sustainability: "These pancakes aren't just a one-off recipe -- they're a **metabolic anchor meal** designed for weekly repetition. Research shows that consistent high-protein breakfasts over 21 days can recalibrate your hunger hormones, reducing overall daily caloric intake by 15-20%.\n\n**Week 1:** Your body begins adapting. You'll notice fewer mid-morning cravings.\n**Week 2:** Ghrelin patterns shift. Hunger becomes predictable rather than urgent.\n**Week 3:** The metabolic adaptation completes. This breakfast becomes your body's expected fuel source.",
  strategic_closing: "Your metabolism isn't broken -- it's just waiting for the right signals. Every time you choose a protein-forward breakfast like these pancakes, you're telling your body: **we're building, not storing.**\n\nReady to go deeper? Download our free 21-Day Metabolic Reset Guide and discover the full breakfast-to-dinner framework that transforms how your body processes fuel.\n\n**Start tomorrow morning. Your metabolism will thank you by lunch.**",
}

interface RecipeContent {
  pinterest_title?: string
  blog_headline?: string
  meta_description?: string
  metabolic_introduction?: string
  recipe_ingredients?: string
  recipe_instructions?: string
  macro_breakdown?: string
  weekly_sustainability?: string
  strategic_closing?: string
}

interface ContentGeneratorProps {
  showSample: boolean
  setActiveAgentId: (id: string | null) => void
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-serif font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## ')) return <h3 key={i} className="font-serif font-semibold text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# ')) return <h2 key={i} className="font-serif font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc text-sm leading-relaxed">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-sm leading-relaxed">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-2" />
        return <p key={i} className="text-sm leading-relaxed">{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part
  )
}

export default function ContentGenerator({ showSample, setActiveAgentId }: ContentGeneratorProps) {
  const [topic, setTopic] = useState('')
  const [language, setLanguage] = useState('English')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [content, setContent] = useState<RecipeContent | null>(null)
  const [outputTab, setOutputTab] = useState('blog')
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const displayContent: RecipeContent | null = showSample ? SAMPLE_CONTENT : content

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Please enter a recipe topic.')
      return
    }
    setLoading(true)
    setError('')
    setContent(null)
    setActiveAgentId(RECIPE_AGENT_ID)
    try {
      const message = language === 'English'
        ? `Create a complete blog post and Pinterest content package for: ${topic.trim()}`
        : `Create a complete blog post and Pinterest content package for: ${topic.trim()}. Write the output in ${language}.`
      const result = await callAIAgent(message, RECIPE_AGENT_ID)
      if (result?.success) {
        let data = result?.response?.result
        if (typeof data === 'string') {
          try { data = JSON.parse(data) } catch { /* keep as-is */ }
        }
        if (data) {
          setContent(data as RecipeContent)
        } else {
          setError('Received empty response. Please try again.')
        }
      } else {
        setError(result?.error ?? 'Failed to generate content. Please try again.')
      }
    } catch {
      setError('Failed to generate content. Please try again.')
    } finally {
      setLoading(false)
      setActiveAgentId(null)
    }
  }

  const handleCopy = async (text: string, field: string) => {
    await copyToClipboard(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const getFullBlogPost = () => {
    if (!displayContent) return ''
    return [
      displayContent.blog_headline ?? '',
      '',
      displayContent.meta_description ?? '',
      '',
      displayContent.metabolic_introduction ?? '',
      '',
      '## Ingredients',
      displayContent.recipe_ingredients ?? '',
      '',
      '## Instructions',
      displayContent.recipe_instructions ?? '',
      '',
      '## Macro Breakdown',
      displayContent.macro_breakdown ?? '',
      '',
      displayContent.weekly_sustainability ?? '',
      '',
      displayContent.strategic_closing ?? '',
    ].join('\n')
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Left Panel - Inputs */}
      <div className="w-full lg:w-[30%] flex-shrink-0">
        <Card className="border border-border rounded-none">
          <CardHeader className="pb-4">
            <CardTitle className="font-serif text-lg tracking-tight flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Content Generator
            </CardTitle>
            <p className="text-sm text-muted-foreground leading-relaxed mt-1">
              Generate complete blog posts and Pinterest content packages optimized for metabolic authority positioning.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recipe Topic</Label>
              <Input
                placeholder="e.g., High-protein breakfast pancakes"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="rounded-none border-border"
                onKeyDown={(e) => { if (e.key === 'Enter' && !loading) handleGenerate() }}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="rounded-none border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-none">
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={loading || !topic.trim()}
              className="w-full rounded-none font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <ChevronRight className="mr-2 h-4 w-4" />
                  Generate Content
                </>
              )}
            </Button>
            {error && (
              <p className="text-sm text-destructive leading-relaxed">{error}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Output */}
      <div className="w-full lg:w-[70%] flex-grow min-h-0">
        {!displayContent ? (
          <Card className="border border-border rounded-none h-full flex items-center justify-center">
            <CardContent className="text-center py-16">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-serif text-lg font-semibold mb-2">Your content package will appear here</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                Enter a recipe topic and click Generate Content to create a complete blog post and Pinterest content package.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border border-border rounded-none h-full flex flex-col">
            <Tabs value={outputTab} onValueChange={setOutputTab} className="flex flex-col h-full">
              <CardHeader className="pb-0 flex-shrink-0">
                <TabsList className="rounded-none w-full justify-start bg-transparent border-b border-border p-0 h-auto">
                  <TabsTrigger value="blog" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:shadow-none px-4 pb-3 text-sm font-semibold">
                    <FileText className="h-4 w-4 mr-2" />
                    Blog Post
                  </TabsTrigger>
                  <TabsTrigger value="pinterest" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:shadow-none px-4 pb-3 text-sm font-semibold">
                    <Layout className="h-4 w-4 mr-2" />
                    Pinterest Assets
                  </TabsTrigger>
                </TabsList>
              </CardHeader>

              <TabsContent value="blog" className="flex-grow min-h-0 m-0">
                <ScrollArea className="h-[calc(100vh-320px)]">
                  <div className="p-6 space-y-6">
                    {/* Copy All button */}
                    <div className="flex justify-end">
                      <Button variant="outline" size="sm" className="rounded-none text-xs" onClick={() => handleCopy(getFullBlogPost(), 'full')}>
                        {copiedField === 'full' ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                        {copiedField === 'full' ? 'Copied!' : 'Copy Full Post'}
                      </Button>
                    </div>

                    {/* Blog Headline */}
                    {displayContent?.blog_headline && (
                      <div>
                        <h1 className="font-serif text-2xl lg:text-3xl font-bold tracking-tight leading-tight">
                          {displayContent.blog_headline}
                        </h1>
                      </div>
                    )}

                    {/* Meta Description */}
                    {displayContent?.meta_description && (
                      <div className="border-l-2 border-muted-foreground pl-4">
                        <p className="text-sm text-muted-foreground italic leading-relaxed">
                          {displayContent.meta_description}
                        </p>
                        <Badge variant="secondary" className="rounded-none mt-2 text-xs">
                          {(displayContent.meta_description?.length ?? 0)} chars
                        </Badge>
                      </div>
                    )}

                    <Separator className="my-4" />

                    {/* Metabolic Introduction */}
                    {displayContent?.metabolic_introduction && (
                      <section>
                        <h2 className="font-serif text-lg font-bold tracking-tight mb-3 uppercase text-xs text-muted-foreground">Introduction</h2>
                        {renderMarkdown(displayContent.metabolic_introduction)}
                      </section>
                    )}

                    <Separator className="my-4" />

                    {/* Recipe Ingredients */}
                    {displayContent?.recipe_ingredients && (
                      <section>
                        <h2 className="font-serif text-lg font-bold tracking-tight mb-3">Ingredients</h2>
                        {renderMarkdown(displayContent.recipe_ingredients)}
                      </section>
                    )}

                    <Separator className="my-4" />

                    {/* Recipe Instructions */}
                    {displayContent?.recipe_instructions && (
                      <section>
                        <h2 className="font-serif text-lg font-bold tracking-tight mb-3">Instructions</h2>
                        {renderMarkdown(displayContent.recipe_instructions)}
                      </section>
                    )}

                    <Separator className="my-4" />

                    {/* Macro Breakdown */}
                    {displayContent?.macro_breakdown && (
                      <section>
                        <Card className="border border-border rounded-none bg-secondary">
                          <CardHeader className="pb-2">
                            <CardTitle className="font-serif text-base tracking-tight">Macro Breakdown</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {renderMarkdown(displayContent.macro_breakdown)}
                          </CardContent>
                        </Card>
                      </section>
                    )}

                    <Separator className="my-4" />

                    {/* Weekly Sustainability */}
                    {displayContent?.weekly_sustainability && (
                      <section>
                        <h2 className="font-serif text-lg font-bold tracking-tight mb-3">Weekly Sustainability</h2>
                        {renderMarkdown(displayContent.weekly_sustainability)}
                      </section>
                    )}

                    <Separator className="my-4" />

                    {/* Strategic Closing */}
                    {displayContent?.strategic_closing && (
                      <section className="border-l-4 border-accent pl-5">
                        <h2 className="font-serif text-lg font-bold tracking-tight mb-3">Strategic Closing</h2>
                        {renderMarkdown(displayContent.strategic_closing)}
                      </section>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="pinterest" className="flex-grow min-h-0 m-0">
                <ScrollArea className="h-[calc(100vh-320px)]">
                  <div className="p-6 space-y-6">
                    {/* Pinterest Title Card */}
                    {displayContent?.pinterest_title && (
                      <Card className="border-2 border-foreground rounded-none">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="font-serif text-sm uppercase tracking-wider text-muted-foreground">Pinterest Title</CardTitle>
                            <Button variant="ghost" size="sm" className="rounded-none h-8" onClick={() => handleCopy(displayContent.pinterest_title ?? '', 'pinterest_title')}>
                              {copiedField === 'pinterest_title' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="font-serif text-xl font-bold tracking-tight leading-tight">
                            {displayContent.pinterest_title}
                          </p>
                          <div className="mt-3 flex items-center gap-3">
                            <Badge variant="secondary" className="rounded-none text-xs">
                              {(displayContent.pinterest_title?.length ?? 0)} characters
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {(displayContent.pinterest_title?.length ?? 0) <= 100 ? 'Optimal length' : 'Consider shortening'}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Blog Headline for Pinterest */}
                    {displayContent?.blog_headline && (
                      <Card className="border border-border rounded-none">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="font-serif text-sm uppercase tracking-wider text-muted-foreground">Blog Headline</CardTitle>
                            <Button variant="ghost" size="sm" className="rounded-none h-8" onClick={() => handleCopy(displayContent.blog_headline ?? '', 'blog_headline')}>
                              {copiedField === 'blog_headline' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="font-semibold text-base leading-snug">{displayContent.blog_headline}</p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Meta Description for Pinterest */}
                    {displayContent?.meta_description && (
                      <Card className="border border-border rounded-none">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="font-serif text-sm uppercase tracking-wider text-muted-foreground">Meta Description</CardTitle>
                            <Button variant="ghost" size="sm" className="rounded-none h-8" onClick={() => handleCopy(displayContent.meta_description ?? '', 'meta_desc')}>
                              {copiedField === 'meta_desc' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground leading-relaxed">{displayContent.meta_description}</p>
                          <Badge variant="secondary" className="rounded-none mt-2 text-xs">
                            {(displayContent.meta_description?.length ?? 0)} chars
                          </Badge>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </Card>
        )}
      </div>
    </div>
  )
}
