'use client'

import React, { useState } from 'react'
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
import { Target, TrendingUp, Loader2, Copy, Check, ChevronRight, Lightbulb, BarChart3, ListChecks } from 'lucide-react'

const STRATEGY_AGENT_ID = '69a24ec46095bea2cef47175'

const SAMPLE_STRATEGY = {
  ideas: "### Pinterest Angle Ideas for January Diet Reset\n\n**1. The \"Not a Diet\" Reset Series**\nPosition metabolic eating as anti-diet. Pin titles like \"Why Your January Diet is Making You Hungrier\" and \"The Science of Eating More to Weigh Less.\" These contrarian angles generate massive saves because they challenge the dominant narrative.\n\n**2. 21-Day Visual Transformation Pins**\nCreate before/during/after content showing meal complexity evolution. Week 1: simple swaps. Week 2: full metabolic meals. Week 3: intuitive eating. Each pin links to the corresponding blog post.\n\n**3. Macro Cheat Sheet Carousel**\nDesign 5-slide carousel pins showing protein/carb/fat ratios for common meals. Title: \"Stop Counting Calories. Start Reading These Numbers Instead.\" This format averages 3x more saves than single-image pins.\n\n**4. Hormone Education Mini-Series**\nCreate a 4-pin series: GLP-1, Ghrelin, Insulin, Leptin. Each pin explains one hormone's role in hunger with a simple food recommendation. Title format: \"Your [Hormone] is Trying to Tell You Something.\"\n\n**5. Seasonal Ingredient Spotlights**\nJanuary superfood pins featuring winter squash, citrus, and root vegetables with metabolic benefit callouts. Tie each to a specific recipe post for traffic.",
  strategy_summary: "**Core Strategy: Counter-Narrative Positioning**\n\nThe January fitness space is saturated with restriction-based messaging. Your competitive advantage is the metabolic authority angle -- positioning eating MORE of the right foods as the path to results. This counter-narrative approach typically generates 40-60% higher engagement because it creates cognitive dissonance that drives saves and shares.\n\n**Content Funnel:**\n- Top of funnel: Contrarian pins that challenge diet culture (awareness)\n- Middle of funnel: Educational carousels with actionable macro data (consideration)\n- Bottom of funnel: Recipe posts with embedded 21-day challenge CTAs (conversion)",
  platform_recommendations: "**Pinterest (Primary):**\n- Post frequency: 5-8 pins daily during January (peak diet search volume)\n- Best formats: Carousel (5-slide), infographic, recipe pin with macro overlay\n- Keywords to target: \"metabolic health,\" \"hormone balance diet,\" \"protein breakfast ideas,\" \"stop counting calories\"\n- Best posting times: 8-11 PM EST (highest save rates)\n\n**Blog (Secondary):**\n- Publish 2-3 long-form posts per week\n- Each post should be 1,500-2,500 words for SEO depth\n- Include embedded Pinterest-optimized images every 300 words\n- Internal linking strategy: every post links to the 21-day challenge landing page\n\n**Cross-platform synergy:** Every blog post generates 3-5 derivative pins. Every pin drives traffic to the corresponding blog post. The blog post converts to email list via the ebook offer.",
  next_steps: "1. **This week:** Create 5 contrarian pin templates using the \"Not a Diet\" angle. Schedule for Jan 1-5 launch.\n2. **By Friday:** Write the cornerstone blog post \"Why Eating More Protein Will Make You Less Hungry\" (link to 3 recipe posts).\n3. **Next week:** Design the hormone education carousel series (4 carousels, 5 slides each).\n4. **By Jan 15:** Publish the 21-Day Metabolic Reset Challenge landing page with email capture.\n5. **Ongoing:** Track pin save rates and blog CTR weekly. Double down on angles that exceed 5% save rate.",
}

interface StrategyResponse {
  ideas?: string
  strategy_summary?: string
  platform_recommendations?: string
  next_steps?: string
}

interface StrategyLabProps {
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

export default function StrategyLab({ showSample, setActiveAgentId }: StrategyLabProps) {
  const [query, setQuery] = useState('')
  const [platform, setPlatform] = useState('All')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [strategy, setStrategy] = useState<StrategyResponse | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const displayStrategy = showSample ? SAMPLE_STRATEGY : strategy

  const handleGenerate = async () => {
    if (!query.trim()) {
      setError('Please describe your content strategy needs.')
      return
    }
    setLoading(true)
    setError('')
    setStrategy(null)
    setActiveAgentId(STRATEGY_AGENT_ID)
    try {
      const platformSuffix = platform !== 'All' ? ` Focus on ${platform} platform.` : ''
      const message = `Generate content strategy ideas for: ${query.trim()}.${platformSuffix}`
      const result = await callAIAgent(message, STRATEGY_AGENT_ID)
      if (result?.success) {
        let data = result?.response?.result
        if (typeof data === 'string') {
          try { data = JSON.parse(data) } catch { /* keep as-is */ }
        }
        if (data) {
          setStrategy(data as StrategyResponse)
        } else {
          setError('Received empty response. Please try again.')
        }
      } else {
        setError(result?.error ?? 'Failed to generate strategy. Please try again.')
      }
    } catch {
      setError('Failed to generate strategy. Please try again.')
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

  return (
    <div className="space-y-6">
      {/* Input Area */}
      <Card className="border border-border rounded-none">
        <CardHeader className="pb-4">
          <CardTitle className="font-serif text-lg tracking-tight flex items-center gap-2">
            <Target className="h-5 w-5" />
            Strategy Lab
          </CardTitle>
          <p className="text-sm text-muted-foreground leading-relaxed mt-1">
            Generate content strategy ideas, Pinterest angles, blog themes, and engagement frameworks aligned with metabolic authority positioning.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-grow space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Strategy Request</Label>
              <Input
                placeholder="e.g., Pinterest angles for January diet reset"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="rounded-none border-border"
                onKeyDown={(e) => { if (e.key === 'Enter' && !loading) handleGenerate() }}
              />
            </div>
            <div className="w-full md:w-48 space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger className="rounded-none border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-none">
                  <SelectItem value="All">All Platforms</SelectItem>
                  <SelectItem value="Pinterest">Pinterest</SelectItem>
                  <SelectItem value="Blog">Blog</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleGenerate}
                disabled={loading || !query.trim()}
                className="rounded-none font-semibold w-full md:w-auto"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Generate Ideas
                  </>
                )}
              </Button>
            </div>
          </div>
          {error && (
            <p className="text-sm text-destructive leading-relaxed mt-3">{error}</p>
          )}
        </CardContent>
      </Card>

      {/* Output Area */}
      {!displayStrategy ? (
        <Card className="border border-border rounded-none">
          <CardContent className="text-center py-16">
            <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-serif text-lg font-semibold mb-2">Your strategy will appear here</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              Describe your content strategy needs and click Generate Ideas to receive actionable strategy recommendations.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-420px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Ideas */}
            {displayStrategy?.ideas && (
              <Card className="border border-border rounded-none lg:col-span-2">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-serif text-base tracking-tight flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-accent" />
                      Content Ideas
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="rounded-none h-8" onClick={() => handleCopy(displayStrategy?.ideas ?? '', 'ideas')}>
                      {copiedField === 'ideas' ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                      <span className="text-xs">{copiedField === 'ideas' ? 'Copied!' : 'Copy'}</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {renderMarkdown(displayStrategy.ideas)}
                </CardContent>
              </Card>
            )}

            {/* Strategy Summary */}
            {displayStrategy?.strategy_summary && (
              <Card className="border-2 border-foreground rounded-none">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-serif text-base tracking-tight flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Strategy Summary
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="rounded-none h-8" onClick={() => handleCopy(displayStrategy?.strategy_summary ?? '', 'summary')}>
                      {copiedField === 'summary' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {renderMarkdown(displayStrategy.strategy_summary)}
                </CardContent>
              </Card>
            )}

            {/* Platform Recommendations */}
            {displayStrategy?.platform_recommendations && (
              <Card className="border border-border rounded-none">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-serif text-base tracking-tight flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Platform Recommendations
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="rounded-none h-8" onClick={() => handleCopy(displayStrategy?.platform_recommendations ?? '', 'platform')}>
                      {copiedField === 'platform' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {renderMarkdown(displayStrategy.platform_recommendations)}
                </CardContent>
              </Card>
            )}

            {/* Next Steps */}
            {displayStrategy?.next_steps && (
              <Card className="border border-border rounded-none bg-secondary lg:col-span-2">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-serif text-base tracking-tight flex items-center gap-2">
                      <ListChecks className="h-4 w-4 text-accent" />
                      Next Steps
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="rounded-none h-8" onClick={() => handleCopy(displayStrategy?.next_steps ?? '', 'steps')}>
                      {copiedField === 'steps' ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                      <span className="text-xs">{copiedField === 'steps' ? 'Copied!' : 'Copy'}</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {renderMarkdown(displayStrategy.next_steps)}
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
