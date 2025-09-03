'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AuthModal } from '@/components/auth/auth-modal'
import { Mic, Plus, BarChart3, ChevronDown, Settings, DollarSign, Shield, User, Menu, ChevronUp, LogIn, UserPlus } from 'lucide-react'

export function Homepage() {
  const router = useRouter()
  const [isSignUpOpen, setIsSignUpOpen] = useState(false)
  const [isAdminSignUpOpen, setIsAdminSignUpOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleRunScenario = () => {
    if (prompt.trim()) {
      setIsSignUpOpen(true)
    }
  }

  const handleAdminPanelClick = () => {
    setIsAdminSignUpOpen(true)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleRunScenario()
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-16'} transition-all duration-300 ease-in-out bg-white flex flex-col`}>
        {/* Logo Section */}
        <div className="p-4">
          <div 
            className="flex items-center space-x-3 cursor-pointer group relative"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <div className="relative h-6 w-6">
              <img 
                src="/symbol (1).png"
                alt="RepScore Logo" 
                className="h-6 w-6 object-contain transition-all duration-300 group-hover:opacity-0"
              />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                {sidebarOpen ? (
                  <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            </div>

            {/* Hover tooltip - always present */}
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
              {sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            </div>

          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-2 space-y-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className={`w-full justify-start ${sidebarOpen ? 'px-3' : 'px-2.5'} py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 font-normal`}
            onClick={() => router.push('/pricing')}
          >
            <DollarSign className="h-4 w-4 stroke-[1.5]" />
            {sidebarOpen && <span className="ml-3">Pricing</span>}
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className={`w-full justify-start ${sidebarOpen ? 'px-3' : 'px-2.5'} py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 font-normal`}
            onClick={handleAdminPanelClick}
          >
            <User className="h-4 w-4 stroke-[1.5]" />
            {sidebarOpen && <span className="ml-3">Admin Panel</span>}
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className={`w-full justify-start ${sidebarOpen ? 'px-3' : 'px-2.5'} py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 font-normal`}
            onClick={() => router.push('/compliance')}
          >
            <Shield className="h-4 w-4 stroke-[1.5]" />
            {sidebarOpen && <span className="ml-3">Compliance</span>}
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className={`w-full justify-start ${sidebarOpen ? 'px-3' : 'px-2.5'} py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 font-normal`}
            onClick={() => router.push('/settings')}
          >
            <Settings className="h-4 w-4 stroke-[1.5]" />
            {sidebarOpen && <span className="ml-3">Settings</span>}
          </Button>
        </nav>

        {/* Sign In/Up Buttons at Bottom */}
        <div className="p-2 space-y-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className={`w-full justify-start ${sidebarOpen ? 'px-3' : 'px-2.5'} py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 font-normal`}
            onClick={() => router.push('/auth/signin')}
          >
            <LogIn className="h-4 w-4 stroke-[1.5]" />
            {sidebarOpen && <span className="ml-3">Sign In</span>}
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`w-full justify-start ${sidebarOpen ? 'px-3' : 'px-2.5'} py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 font-normal`}
            onClick={() => router.push('/auth/signup')}
          >
            <UserPlus className="h-4 w-4 stroke-[1.5]" />
            {sidebarOpen && <span className="ml-3">Sign Up</span>}
          </Button>
        </div>

      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <div className="max-w-2xl w-full text-center space-y-8">
            {/* Hero Section */}
            <div className="space-y-4">
              <h1 className="text-3xl font-semibold text-slate-900">
                What's on the agenda today?
              </h1>
              <p className="text-base font-medium text-slate-600">
                Practice your sales skills with AI-powered roleplays
              </p>
            </div>

            {/* Input Section */}
            <div className="relative max-w-xl mx-auto">
              <div className="relative">
                <Input
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Describe your sales scenario..."
                  className="w-full h-12 pl-12 pr-20 text-base border border-gray-200 focus:border-gray-200 focus:ring-0 focus-visible:ring-0 focus-visible:outline-none rounded-xl bg-white shadow-sm"
                />
                <Plus className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <Mic className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <BarChart3 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <Dialog open={isSignUpOpen} onOpenChange={setIsSignUpOpen}>
                <DialogTrigger asChild>
                  <Button
                    onClick={handleRunScenario}
                    disabled={!prompt.trim()}
                    className="mt-4 w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-medium"
                  >
                    Start Call
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle></DialogTitle>
                  </DialogHeader>
                  <AuthModal onSuccess={() => {
                    setIsSignUpOpen(false)
                    router.push('/dashboard')
                  }} />
                </DialogContent>
              </Dialog>
            </div>

            {/* Admin Sign-In Modal */}
            <Dialog open={isAdminSignUpOpen} onOpenChange={setIsAdminSignUpOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Sign In Required</DialogTitle>
                </DialogHeader>
                <AuthModal onSuccess={() => {
                  setIsAdminSignUpOpen(false)
                  router.push('/admin')
                }} />
              </DialogContent>
            </Dialog>

          </div>
        </main>

        {/* Footer */}
        <footer className="p-4">
          <div className="flex items-center justify-center text-sm text-muted-foreground">
            <div className="flex items-center space-x-4">
              <span>© 2025 RepScore</span>
              <span>•</span>
              <span>Privacy Policy</span>
              <span>•</span>
              <span>Terms of Service</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
