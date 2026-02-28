'use client'

import React, { useState, useRef, useCallback } from 'react'
import { callAIAgent, uploadFiles } from '@/lib/aiAgent'
import { copyToClipboard } from '@/lib/clipboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Video, Upload, Loader2, Copy, Check, Hash, Search, Type, FileText, X, Image as ImageIcon } from 'lucide-react'

const VIDEO_AGENT_ID = '69a2528d6095bea2cef47181'

const LANGUAGES = [
  { value: 'English', label: 'English' },
  { value: 'Portuguese', label: 'Portugues' },
  { value: 'Spanish', label: 'Espanol' },
  { value: 'French', label: 'Francais' },
  { value: 'German', label: 'Deutsch' },
  { value: 'Italian', label: 'Italiano' },
  { value: 'Japanese', label: 'Japanese' },
  { value: 'Korean', label: 'Korean' },
  { value: 'Chinese', label: 'Chinese' },
]

const SAMPLE_RESPONSE = {
  primary_title: "Pare de Passar Fome | Muffins de Frango Proteicos Que Controlam Sua Ghrelin por 5 Horas",
  alternative_title: "Seus Desejos Acabam Aqui: Muffins de Frango Alto Proteina Que Resetam Seu Metabolismo",
  short_description: "Cansada de sentir fome 2 horas depois de comer? Esses muffins de frango alto proteina ativam seu GLP-1 e silenciam a ghrelin -- a hormona da fome. 38g de proteina por porcao, zero acucar, zero gluten. O lanche que muda tudo.",
  long_description: "Se voce ja sentiu aquela fome incontrolavel no meio da tarde, o problema nao e falta de forca de vontade -- e bioquimica. A ghrelin (hormonio da fome) dispara quando sua refeicao anterior nao tinha proteina suficiente para ativar o GLP-1, o hormonio da saciedade.\n\nEstes muffins de frango com especiarias foram desenhados com precisao metabolica: 38g de proteina por unidade, zero acucar adicionado, sem gluten. O efeito termico da proteina queima ate 30% das calorias durante a digestao, enquanto a fibra estabiliza sua glicemia por horas.\n\nMacros por muffin: 285 cal | 38g proteina | 8g carbs | 12g gordura | 4g fibra.\n\nQuer o plano completo de 21 dias com receitas como esta? O ebook Metabolic Authority tem 60+ receitas estrategicas com roteiros semanais prontos.",
  hashtags: "#PareDeFome #ControleDeGhrelin #ReceitaAltoProteina #MuffinsDeFramgo #SemGluten #SemAcucar #SaudeMetabolica #EquilibrioGlicemico #GLP1Natural #EfeitoTermico #MealPrep #LancheSaudavel #ReceitaFitness #ProteínaReal #MetabolicReset #ReceitasSemGluten #DietaLowCarb #SaciedadeReal #ReceitaQueEmagece #NutricaoInteligente",
  seo_keywords: "muffins de frango alto proteina, receita sem gluten sem acucar, controle de fome natural, GLP-1 alimentos, lanche proteico meal prep, receita metabolica, emagrecer sem fome",
  cta_text: "Quer descobrir como montar 21 dias de refeicoes que controlam sua fome naturalmente? O ebook Metabolic Authority tem o roteiro completo -- com listas de compras, macros calculados e a ciencia por tras de cada receita."
}

interface VideoResponse {
  primary_title?: string
  alternative_title?: string
  short_description?: string
  long_description?: string
  hashtags?: string
  seo_keywords?: string
  cta_text?: string
}

interface VideoOptimizerProps {
  showSample: boolean
  setActiveAgentId: (id: string | null) => void
}

function renderMarkdown(text: string): React.ReactNode {
  if (!text) return null
  const lines = text.split('\n')
  return lines.map((line, i) => {
    if (line.startsWith('### ')) return <h3 key={i} className="font-serif font-bold text-lg mt-4 mb-2 tracking-tight">{line.replace('### ', '')}</h3>
    if (line.startsWith('## ')) return <h2 key={i} className="font-serif font-bold text-xl mt-4 mb-2 tracking-tight">{line.replace('## ', '')}</h2>
    if (line.startsWith('# ')) return <h1 key={i} className="font-serif font-bold text-2xl mt-4 mb-2 tracking-tight">{line.replace('# ', '')}</h1>
    if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-bold mt-2">{line.replace(/\*\*/g, '')}</p>
    if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc">{line.replace(/^[-*] /, '').replace(/\*\*(.*?)\*\*/g, '$1')}</li>
    if (line.match(/^\d+\./)) return <li key={i} className="ml-4 list-decimal">{line.replace(/^\d+\.\s*/, '').replace(/\*\*(.*?)\*\*/g, '$1')}</li>
    if (line.trim() === '') return <br key={i} />
    const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/--(.*?)--/g, '<em>$1</em>')
    return <p key={i} className="leading-relaxed" dangerouslySetInnerHTML={{ __html: formatted }} />
  })
}

export default function VideoOptimizer({ showSample, setActiveAgentId }: VideoOptimizerProps) {
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [context, setContext] = useState('')
  const [language, setLanguage] = useState('Portuguese')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [response, setResponse] = useState<VideoResponse | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const displayData: VideoResponse | null = showSample ? SAMPLE_RESPONSE : response

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = (ev) => {
        setImagePreview(ev.target?.result as string)
      }
      reader.readAsDataURL(file)
      setError('')
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = (ev) => {
        setImagePreview(ev.target?.result as string)
      }
      reader.readAsDataURL(file)
      setError('')
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleGenerate = async () => {
    if (!imageFile) {
      setError('Por favor, envie um frame ou thumbnail do video.')
      return
    }

    setLoading(true)
    setError('')
    setResponse(null)
    setActiveAgentId(VIDEO_AGENT_ID)

    try {
      // Step 1: Upload the image
      const uploadResult = await uploadFiles(imageFile)
      if (!uploadResult.success || uploadResult.asset_ids.length === 0) {
        setError('Falha ao enviar a imagem. Tente novamente.')
        setLoading(false)
        setActiveAgentId(null)
        return
      }

      // Step 2: Call the agent with the asset
      const message = `Analyze this video frame/thumbnail and generate optimized video titles, descriptions, hashtags, and CTAs.${context ? `\n\nAdditional context about this recipe: ${context}` : ''}${language !== 'English' ? `\n\nPlease generate all content in ${language}.` : ''}`

      const result = await callAIAgent(message, VIDEO_AGENT_ID, {
        assets: uploadResult.asset_ids,
      })

      let data = result?.response?.result
      if (typeof data === 'string') {
        try { data = JSON.parse(data) } catch {}
      }

      if (data && typeof data === 'object') {
        setResponse(data as VideoResponse)
      } else {
        setError('Resposta inesperada do agente. Tente novamente.')
      }
    } catch (err) {
      setError('Falha ao gerar conteudo. Por favor, tente novamente.')
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

  const CopyButton = ({ text, field }: { text: string; field: string }) => (
    <button
      onClick={() => handleCopy(text, field)}
      className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
      title="Copiar"
    >
      {copiedField === field ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )

  return (
    <div className="flex gap-6 min-h-[calc(100vh-12rem)]">
      {/* Left Panel - Input */}
      <div className="w-full md:w-[30%] md:min-w-[320px] flex flex-col gap-5">
        <div>
          <h2 className="font-serif text-2xl font-bold tracking-tight mb-1">Video Optimizer</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Envie um frame ou thumbnail do seu video de receita. O agente analisa a imagem e gera titulos, descricoes e hashtags otimizados com foco na dor do espectador.
          </p>
        </div>

        <Separator />

        {/* Image Upload */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider">Frame do Video / Thumbnail</Label>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => !imagePreview && fileInputRef.current?.click()}
            className={`border-2 border-dashed border-border bg-secondary/30 flex flex-col items-center justify-center min-h-[180px] cursor-pointer transition-colors hover:border-muted-foreground relative ${imagePreview ? 'p-2' : 'p-6'}`}
          >
            {imagePreview ? (
              <div className="relative w-full">
                <img
                  src={imagePreview}
                  alt="Preview do frame"
                  className="w-full h-auto max-h-[200px] object-contain"
                />
                <button
                  onClick={(e) => { e.stopPropagation(); removeImage() }}
                  className="absolute top-1 right-1 bg-foreground/80 text-background p-1 hover:bg-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground text-center">
                  Arraste e solte aqui ou clique para selecionar
                </p>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP</p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
        </div>

        {/* Context */}
        <div className="space-y-2">
          <Label htmlFor="video-context" className="text-xs font-semibold uppercase tracking-wider">
            Contexto da Receita (opcional)
          </Label>
          <Input
            id="video-context"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Ex: Muffins de frango alto proteina, sem gluten..."
            className="border-border bg-card text-sm"
          />
        </div>

        {/* Language */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider">Idioma</Label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="border-border bg-card text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={loading || !imageFile}
          className="w-full bg-foreground text-background hover:bg-foreground/90 font-semibold text-sm py-5"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analisando frame...
            </>
          ) : (
            <>
              <Video className="h-4 w-4 mr-2" />
              Gerar Conteudo do Video
            </>
          )}
        </Button>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>

      {/* Right Panel - Output */}
      <div className="flex-1 hidden md:block">
        {!displayData ? (
          <div className="h-full flex items-center justify-center border border-dashed border-border bg-secondary/20">
            <div className="text-center max-w-sm">
              <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-serif text-lg font-semibold mb-2">Envie um Frame do Video</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Selecione um frame ou thumbnail do seu video de receita e clique em &quot;Gerar Conteudo&quot; para criar titulos, descricoes e hashtags otimizados.
              </p>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-12rem)]">
            <div className="space-y-5">
              {/* Primary Title */}
              {displayData.primary_title && (
                <Card className="border border-border shadow-none">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Type className="h-4 w-4 text-accent" />
                        <CardTitle className="font-serif text-sm font-semibold uppercase tracking-wider">Titulo Principal</CardTitle>
                      </div>
                      <CopyButton text={displayData.primary_title} field="primary_title" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="font-serif text-xl font-bold tracking-tight leading-tight">{displayData.primary_title}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs font-mono">
                        {displayData.primary_title.length} caracteres
                      </Badge>
                      {displayData.primary_title.length <= 100 && (
                        <Badge variant="outline" className="text-xs text-green-700 border-green-300">Dentro do limite</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Alternative Title */}
              {displayData.alternative_title && (
                <Card className="border border-border shadow-none">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Type className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="font-serif text-sm font-semibold uppercase tracking-wider">Titulo Alternativo</CardTitle>
                      </div>
                      <CopyButton text={displayData.alternative_title} field="alt_title" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="font-serif text-lg font-bold tracking-tight leading-tight">{displayData.alternative_title}</p>
                    <Badge variant="secondary" className="text-xs font-mono mt-2">
                      {displayData.alternative_title.length} caracteres
                    </Badge>
                  </CardContent>
                </Card>
              )}

              {/* Short Description */}
              {displayData.short_description && (
                <Card className="border border-border shadow-none">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-accent" />
                        <CardTitle className="font-serif text-sm font-semibold uppercase tracking-wider">Descricao Curta</CardTitle>
                        <Badge variant="outline" className="text-xs">Instagram / TikTok</Badge>
                      </div>
                      <CopyButton text={displayData.short_description} field="short_desc" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm leading-relaxed">{renderMarkdown(displayData.short_description)}</div>
                  </CardContent>
                </Card>
              )}

              {/* Long Description */}
              {displayData.long_description && (
                <Card className="border border-border shadow-none">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-accent" />
                        <CardTitle className="font-serif text-sm font-semibold uppercase tracking-wider">Descricao Completa</CardTitle>
                        <Badge variant="outline" className="text-xs">YouTube / Substack</Badge>
                      </div>
                      <CopyButton text={displayData.long_description} field="long_desc" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm leading-relaxed space-y-2">{renderMarkdown(displayData.long_description)}</div>
                  </CardContent>
                </Card>
              )}

              {/* Hashtags */}
              {displayData.hashtags && (
                <Card className="border border-border shadow-none">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-accent" />
                        <CardTitle className="font-serif text-sm font-semibold uppercase tracking-wider">Hashtags</CardTitle>
                      </div>
                      <CopyButton text={displayData.hashtags} field="hashtags" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5">
                      {displayData.hashtags.split(/\s+/).filter(Boolean).map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-xs font-normal">
                          {tag.startsWith('#') ? tag : `#${tag}`}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* SEO Keywords */}
              {displayData.seo_keywords && (
                <Card className="border border-border shadow-none">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-accent" />
                        <CardTitle className="font-serif text-sm font-semibold uppercase tracking-wider">Palavras-chave SEO</CardTitle>
                      </div>
                      <CopyButton text={displayData.seo_keywords} field="seo" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5">
                      {displayData.seo_keywords.split(',').map((kw, i) => (
                        <Badge key={i} variant="outline" className="text-xs font-normal">
                          {kw.trim()}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* CTA */}
              {displayData.cta_text && (
                <Card className="border-2 border-accent/30 shadow-none bg-accent/5">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4 text-accent" />
                        <CardTitle className="font-serif text-sm font-semibold uppercase tracking-wider text-accent">Call to Action</CardTitle>
                      </div>
                      <CopyButton text={displayData.cta_text} field="cta" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm leading-relaxed">{renderMarkdown(displayData.cta_text)}</div>
                  </CardContent>
                </Card>
              )}

              {/* Copy All Button */}
              <div className="pt-2 pb-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    const allText = [
                      `TITULO: ${displayData.primary_title || ''}`,
                      `TITULO ALT: ${displayData.alternative_title || ''}`,
                      `\nDESCRICAO CURTA:\n${displayData.short_description || ''}`,
                      `\nDESCRICAO COMPLETA:\n${displayData.long_description || ''}`,
                      `\nHASHTAGS: ${displayData.hashtags || ''}`,
                      `\nPALAVRAS-CHAVE SEO: ${displayData.seo_keywords || ''}`,
                      `\nCTA: ${displayData.cta_text || ''}`,
                    ].join('\n')
                    handleCopy(allText, 'all')
                  }}
                  className="w-full border-border text-sm font-semibold"
                >
                  {copiedField === 'all' ? (
                    <><Check className="h-4 w-4 mr-2 text-green-600" /> Copiado!</>
                  ) : (
                    <><Copy className="h-4 w-4 mr-2" /> Copiar Todo o Conteudo</>
                  )}
                </Button>
              </div>
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Mobile Output - shown below input on small screens */}
      <div className="md:hidden w-full">
        {displayData && (
          <div className="space-y-4 mt-6">
            {displayData.primary_title && (
              <Card className="border border-border shadow-none">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-serif text-sm font-semibold">Titulo Principal</CardTitle>
                    <CopyButton text={displayData.primary_title} field="m_primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="font-serif text-lg font-bold tracking-tight">{displayData.primary_title}</p>
                </CardContent>
              </Card>
            )}
            {displayData.short_description && (
              <Card className="border border-border shadow-none">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-serif text-sm font-semibold">Descricao Curta</CardTitle>
                    <CopyButton text={displayData.short_description} field="m_short" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{displayData.short_description}</p>
                </CardContent>
              </Card>
            )}
            {displayData.hashtags && (
              <Card className="border border-border shadow-none">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-serif text-sm font-semibold">Hashtags</CardTitle>
                    <CopyButton text={displayData.hashtags} field="m_hash" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {displayData.hashtags.split(/\s+/).filter(Boolean).map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
