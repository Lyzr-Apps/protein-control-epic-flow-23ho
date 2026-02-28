'use client'

import React, { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { FileText, MessageSquare, Target, Activity, Loader2, Video } from 'lucide-react'
import ContentGenerator from './sections/ContentGenerator'
import MetabolicConsultant from './sections/MetabolicConsultant'
import StrategyLab from './sections/StrategyLab'
import VideoOptimizer from './sections/VideoOptimizer'

const AGENTS = [
  { id: '69a24ec3f89af5d059caa2dd', name: 'Recipe Content Agent', purpose: 'Blog + Pinterest content generation' },
  { id: '69a24ec3305bea55e2780a4b', name: 'Metabolic Q&A Agent', purpose: 'Metabolic health consultations' },
  { id: '69a24ec46095bea2cef47175', name: 'Strategy Ideation Agent', purpose: 'Content strategy ideation' },
  { id: '69a2528d6095bea2cef47181', name: 'Video Content Agent', purpose: 'Video title & description optimization' },
]

const THEME_VARS = {
  '--background': '0 0% 98%',
  '--foreground': '0 0% 8%',
  '--card': '0 0% 100%',
  '--card-foreground': '0 0% 8%',
  '--primary': '0 0% 8%',
  '--primary-foreground': '0 0% 98%',
  '--secondary': '0 0% 94%',
  '--secondary-foreground': '0 0% 12%',
  '--accent': '0 80% 45%',
  '--accent-foreground': '0 0% 98%',
  '--muted': '0 0% 92%',
  '--muted-foreground': '0 0% 40%',
  '--border': '0 0% 85%',
  '--input': '0 0% 80%',
  '--ring': '0 0% 8%',
  '--radius': '0rem',
} as React.CSSProperties

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-4 py-2 bg-primary text-primary-foreground text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

type TabKey = 'content' | 'consultant' | 'strategy' | 'video'

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'content', label: 'Content Generator', icon: <FileText className="h-4 w-4" /> },
  { key: 'consultant', label: 'Metabolic Consultant', icon: <MessageSquare className="h-4 w-4" /> },
  { key: 'strategy', label: 'Strategy Lab', icon: <Target className="h-4 w-4" /> },
  { key: 'video', label: 'Video Optimizer', icon: <Video className="h-4 w-4" /> },
]

export default function Page() {
  const [activeTab, setActiveTab] = useState<TabKey>('content')
  const [showSample, setShowSample] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  return (
    <ErrorBoundary>
      <div style={THEME_VARS} className="min-h-screen bg-background text-foreground font-sans flex flex-col">
        {/* Header */}
        <header className="border-b border-border bg-card sticky top-0 z-50">
          <div className="max-w-[1400px] mx-auto px-4 md:px-6">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <h1 className="font-serif text-xl font-bold tracking-tight">MetaboContent</h1>
                <Separator orientation="vertical" className="h-6 hidden md:block" />
                <span className="text-xs text-muted-foreground hidden md:block uppercase tracking-widest">Metabolic Authority Content Suite</span>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="sample-toggle" className="text-xs text-muted-foreground cursor-pointer">Sample Data</Label>
                <Switch id="sample-toggle" checked={showSample} onCheckedChange={setShowSample} />
              </div>
            </div>
            <nav className="flex gap-0 -mb-px">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === tab.key ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'}`}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </header>

        {/* Main */}
        <main className="max-w-[1400px] mx-auto px-4 md:px-6 py-6 flex-grow w-full">
          {activeTab === 'content' && (
            <ContentGenerator showSample={showSample} setActiveAgentId={setActiveAgentId} />
          )}
          {activeTab === 'consultant' && (
            <MetabolicConsultant showSample={showSample} setActiveAgentId={setActiveAgentId} />
          )}
          {activeTab === 'strategy' && (
            <StrategyLab showSample={showSample} setActiveAgentId={setActiveAgentId} />
          )}
          {activeTab === 'video' && (
            <VideoOptimizer showSample={showSample} setActiveAgentId={setActiveAgentId} />
          )}
        </main>

        {/* Agent Status Footer */}
        <footer className="border-t border-border bg-card mt-auto">
          <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Agents</span>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                {AGENTS.map((agent) => (
                  <div key={agent.id} className="flex items-center gap-1.5" title={agent.purpose}>
                    {activeAgentId === agent.id ? (
                      <Loader2 className="h-3 w-3 animate-spin text-accent" />
                    ) : (
                      <div className="h-2 w-2 bg-muted-foreground rounded-full" />
                    )}
                    <span className={`text-xs ${activeAgentId === agent.id ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                      {agent.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  )
}
