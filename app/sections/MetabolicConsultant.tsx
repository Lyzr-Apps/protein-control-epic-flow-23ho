'use client'

import React, { useState, useRef, useEffect } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { copyToClipboard } from '@/lib/clipboard'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { MessageSquare, Send, Loader2, Copy, Check, User, Bot } from 'lucide-react'

const QA_AGENT_ID = '69a24ec3305bea55e2780a4b'

const SUGGESTED_PROMPTS = [
  'How does protein control hunger?',
  'Suggest a 14-day challenge',
  'Explain glycemic response',
  'What happens at 21 days?',
]

const SAMPLE_MESSAGES: ChatMessage[] = [
  {
    role: 'user',
    content: 'How does protein control hunger?',
  },
  {
    role: 'assistant',
    content: '',
    parsedResponse: {
      answer: "**Protein is your most powerful hunger-control macronutrient**, and understanding why gives you a strategic edge in metabolic management.\n\nWhen you consume protein, your body triggers the release of **GLP-1 (glucagon-like peptide-1)** and **PYY (peptide YY)** -- two satiety hormones that signal your brain to reduce appetite. This is fundamentally different from how carbohydrates work: while carbs spike insulin and can lead to reactive hunger, protein creates a sustained hormonal environment that keeps cravings in check.\n\n### The Thermic Effect\nProtein has the highest thermic effect of any macronutrient -- your body uses **20-30% of protein calories** just to digest it, compared to only 5-10% for carbs. This means a 400-calorie high-protein meal effectively becomes a 280-320 calorie meal after digestion.\n\n### The Ghrelin Connection\nGhrelin, your primary hunger hormone, is significantly suppressed after protein-rich meals. Studies show that a breakfast with 30g+ of protein can suppress ghrelin for **4-5 hours**, compared to just 2 hours for a carb-heavy breakfast.\n\n### Practical Application\nAim for **25-35g of protein** at each meal. Front-loading protein at breakfast is especially powerful -- it sets the metabolic tone for the entire day, reducing overall caloric intake by 15-20%.",
      key_takeaways: "- **GLP-1 and PYY** are released when you eat protein, directly signaling satiety to your brain\n- Protein has the **highest thermic effect** (20-30%), meaning your body burns calories just digesting it\n- **30g+ protein at breakfast** suppresses ghrelin (hunger hormone) for 4-5 hours\n- Front-loading protein at breakfast reduces daily caloric intake by **15-20%**\n- Protein creates **sustained satiety** unlike carbs which can cause reactive hunger",
      follow_up_suggestions: "What's the best protein source for breakfast?,How do I calculate my daily protein needs?,Can too much protein be harmful?,What's the difference between animal and plant protein for satiety?",
    },
  },
]

interface QAResponse {
  answer?: string
  key_takeaways?: string
  follow_up_suggestions?: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  parsedResponse?: QAResponse
}

interface MetabolicConsultantProps {
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

export default function MetabolicConsultant({ showSample, setActiveAgentId }: MetabolicConsultantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const displayMessages = showSample ? SAMPLE_MESSAGES : messages

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [displayMessages.length])

  const handleSend = async (messageText?: string) => {
    const text = (messageText ?? input).trim()
    if (!text || loading) return

    const userMessage: ChatMessage = { role: 'user', content: text }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)
    setError('')
    setActiveAgentId(QA_AGENT_ID)

    try {
      const result = await callAIAgent(text, QA_AGENT_ID)
      if (result?.success) {
        let data = result?.response?.result
        if (typeof data === 'string') {
          try { data = JSON.parse(data) } catch { /* keep as-is */ }
        }
        const parsed: QAResponse = data ?? {}
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: parsed?.answer ?? '',
          parsedResponse: parsed,
        }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        setError(result?.error ?? 'Failed to get response. Please try again.')
      }
    } catch {
      setError('Failed to get response. Please try again.')
    } finally {
      setLoading(false)
      setActiveAgentId(null)
    }
  }

  const handleCopy = async (text: string, idx: number) => {
    await copyToClipboard(text)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  const parseFollowUps = (text?: string): string[] => {
    if (!text) return []
    return text.split(/[,?\n]/).map(s => s.trim()).filter(s => s.length > 5).map(s => s.endsWith('?') ? s : s + '?')
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-w-4xl mx-auto">
      {/* Chat Area */}
      <Card className="border border-border rounded-none flex-grow flex flex-col min-h-0">
        <div className="flex-grow min-h-0 overflow-y-auto" ref={scrollRef}>
          <div className="p-6 space-y-6">
            {displayMessages.length === 0 && !loading && (
              <div className="text-center py-16">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-serif text-lg font-semibold mb-2">Metabolic Consultant</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed mb-8">
                  Ask questions about metabolism, satiety hormones, glycemic response, hunger control, and dietary structure. Get science-backed answers with actionable takeaways.
                </p>
                {/* Suggested Prompts */}
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTED_PROMPTS.map((prompt, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="rounded-none text-xs"
                      onClick={() => handleSend(prompt)}
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {displayMessages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 bg-foreground text-background flex items-center justify-center">
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                  {msg.role === 'user' ? (
                    <div className="bg-foreground text-background p-4">
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Main Answer */}
                      {msg.parsedResponse?.answer && (
                        <div className="border border-border p-4 bg-card">
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Answer</span>
                            <Button variant="ghost" size="sm" className="rounded-none h-6 px-2" onClick={() => handleCopy(msg.parsedResponse?.answer ?? '', idx)}>
                              {copiedIdx === idx ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            </Button>
                          </div>
                          {renderMarkdown(msg.parsedResponse.answer)}
                        </div>
                      )}

                      {/* Key Takeaways */}
                      {msg.parsedResponse?.key_takeaways && (
                        <div className="border-l-4 border-accent p-4 bg-secondary">
                          <span className="text-xs font-semibold uppercase tracking-wider text-accent block mb-2">Key Takeaways</span>
                          {renderMarkdown(msg.parsedResponse.key_takeaways)}
                        </div>
                      )}

                      {/* Follow-up Suggestions */}
                      {msg.parsedResponse?.follow_up_suggestions && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {parseFollowUps(msg.parsedResponse.follow_up_suggestions).slice(0, 4).map((suggestion, si) => (
                            <Button
                              key={si}
                              variant="outline"
                              size="sm"
                              className="rounded-none text-xs h-auto py-1.5 px-3"
                              onClick={() => handleSend(suggestion)}
                              disabled={loading}
                            >
                              {suggestion}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 bg-secondary flex items-center justify-center">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 bg-foreground text-background flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="border border-border p-4 bg-card">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Analyzing your question...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="px-6 pb-2">
            <p className="text-sm text-destructive leading-relaxed">{error}</p>
          </div>
        )}

        {/* Suggested prompts above input when messages exist */}
        {displayMessages.length > 0 && !loading && (
          <div className="px-6 pb-2">
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_PROMPTS.map((prompt, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="rounded-none text-xs h-7"
                  onClick={() => handleSend(prompt)}
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-border flex-shrink-0">
          <div className="flex gap-2">
            <Input
              placeholder="Ask about metabolism, satiety, hunger control..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !loading) handleSend() }}
              className="rounded-none border-border flex-grow"
              disabled={loading}
            />
            <Button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="rounded-none px-4"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
