'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Home, FileText, Phone, BarChart3, Settings, Users, Shield, Menu, X, LogOut, Moon, Sun, BookOpen, History, DollarSign, ChevronDown, ChevronUp, Plus, ArrowLeft, ArrowRight, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navigationSections = [
  {
    title: 'Core',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: Home, roles: ['rep', 'manager', 'admin'] },
      { name: 'Scenario Builder', href: '/scenario-builder', icon: FileText, roles: ['rep', 'manager', 'admin'] },
      { name: 'Saved Scenarios', href: '/saved-scenarios', icon: BookOpen, roles: ['rep', 'manager', 'admin'] },
      { name: 'Saved Simulations', href: '/simulations', icon: History, roles: ['rep', 'manager', 'admin'] },
    ]
  },
  {
    title: 'Organization',
    items: [
      { name: 'Pricing', href: '/pricing', icon: DollarSign, roles: ['rep', 'manager', 'admin'], badge: 'Free' },
      { name: 'Admin Panel', href: '/admin', icon: Users, roles: ['manager', 'admin'] },
      { name: 'Compliance', href: '/compliance', icon: Shield, roles: ['admin'] },
      { name: 'Settings', href: '/settings', icon: Settings, roles: ['rep', 'manager', 'admin'] },
    ]
  }
]

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarOpen')
      return saved ? JSON.parse(saved) : true
    }
    return true
  })
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const { user, logout } = useSupabaseAuth()
  const { theme, setTheme } = useTheme()
  const pathname = usePathname()

  const handleSidebarToggle = (newState: boolean) => {
    setSidebarOpen(newState)
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarOpen', JSON.stringify(newState))
    }
  }

  // Flatten navigation sections for easy access
  const allNavigationItems = navigationSections.flatMap(section => section.items)

  return (
    <div className="min-h-screen bg-background">
      {/* Top header - full width */}
      <div className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-b from-primary/90 via-primary/95 to-primary">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-white hover:bg-white/10"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>
            <div className="flex items-center space-x-3">
              <img 
                src="/noBgColorwhite.png" 
                alt="RepScore Logo" 
                className="h-7 w-auto object-contain -ml-2"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              className="text-white/80 hover:text-white hover:bg-white/10 h-8 w-8"
              onClick={() => window.open('mailto:sales@repscore.ai', '_blank')}
              title="Help & Support"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="text-white/80 hover:text-white hover:bg-white/10 h-8 w-8"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>

            <Button 
              variant="ghost" 
              size="icon" 
              className={`text-white/80 hover:text-white hover:bg-white/10 h-8 w-8 ${
                isLoggingOut ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={isLoggingOut}
              onClick={async () => {
                if (isLoggingOut) return; // Prevent multiple clicks
                
                console.log('Logout button clicked');
                setIsLoggingOut(true);
                
                try {
                  await logout();
                } finally {
                  // Reset after delay to prevent rapid re-clicks
                  setTimeout(() => setIsLoggingOut(false), 2000);
                }
              }}
              title={isLoggingOut ? 'Signing out...' : 'Sign out'}
            >
              {isLoggingOut ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      <motion.div
        initial={false}
        animate={{ x: sidebarOpen ? 0 : '-100%' }}
        className="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 lg:hidden"
        style={{ top: '61px' }}
      >
        <div className="flex flex-col h-full">
          {/* Quick action header */}
          <div className="p-3 border-b border-slate-100">
            <Button
              size="sm"
              className="w-full h-8 bg-primary hover:bg-primary/90 text-white text-xs"
              onClick={() => {
                window.location.href = '/scenario-builder'
                setSidebarOpen(false)
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              New Scenario
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-2">
            {navigationSections.map((section, sectionIndex) => (
              <div key={section.title} className={sectionIndex > 0 ? 'mt-6' : ''}>
                {/* Section label */}
                <div className="px-3 mb-2">
                  <h3 className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">
                    {section.title}
                  </h3>
                </div>

                {/* Navigation items */}
                <div className="space-y-0.5 px-2">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href
                    return (
                      <div key={item.name} className="relative">
                        <Link
                          href={item.href}
                          className={cn(
                            "relative flex items-center space-x-3 px-3 py-2 text-sm font-normal transition-all duration-150 rounded-lg",
                            isActive
                              ? "text-primary font-medium bg-primary/5"
                              : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                          )}
                          onClick={() => setSidebarOpen(false)}
                        >
                          {/* Active accent bar */}
                          {isActive && (
                            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full"></div>
                          )}
                          
                          <item.icon className="h-4 w-4 stroke-[1.5]" />
                          
                          <div className="flex items-center justify-between flex-1 min-w-0">
                            <span className="truncate">{item.name}</span>
                            {item.badge && (
                              <span className="ml-2 inline-flex items-center rounded-full bg-slate-100 text-slate-500 px-2 py-0.5 text-xs font-normal">
                                {item.badge}
                              </span>
                            )}
                          </div>
                        </Link>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </motion.div>

      {/* Desktop sidebar */}
      <div className={`hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:bg-white lg:border-r lg:border-slate-200 transition-all duration-300 ease-in-out ${sidebarOpen ? 'lg:w-56' : 'lg:w-16'}`} style={{ top: '61px' }}>
        <div className="flex flex-col h-full">
          {/* Header with collapse toggle */}
          <div className="flex items-center justify-between p-3 border-b border-slate-100">
            {sidebarOpen && (
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  className="h-8 bg-white hover:bg-slate-50 text-primary border border-primary/20 text-xs shadow-sm"
                  onClick={() => window.location.href = '/scenario-builder'}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  New
                </Button>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-50 border-0 shadow-none ${!sidebarOpen ? 'mx-auto' : ''}`}
              onClick={() => handleSidebarToggle(!sidebarOpen)}
            >
              {sidebarOpen ? (
                <ArrowLeft className="h-4 w-4" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Scrollable navigation area */}
          <nav className="flex-1 overflow-y-auto py-2">
            {navigationSections.map((section, sectionIndex) => (
              <div key={section.title} className={sectionIndex > 0 ? 'mt-6' : ''}>
                {/* Section label */}
                {sidebarOpen && (
                  <div className="px-3 mb-2">
                    <h3 className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">
                      {section.title}
                    </h3>
                  </div>
                )}
                
                {/* Section divider for collapsed mode */}
                {!sidebarOpen && sectionIndex > 0 && (
                  <div className="mx-2 mb-2 border-t border-slate-200"></div>
                )}

                {/* Navigation items */}
                <div className="space-y-0.5 px-2">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href
                    return (
                      <div key={item.name} className="relative group">
                        <Link
                          href={item.href}
                          className={cn(
                            "relative flex items-center space-x-3 text-sm font-normal transition-all duration-150 rounded-lg group",
                            sidebarOpen ? "px-3 py-2" : "px-2.5 py-2 justify-center",
                            isActive
                              ? "text-primary font-medium bg-primary/5"
                              : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                          )}
                        >
                          {/* Active accent bar */}
                          {isActive && (
                            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full"></div>
                          )}
                          
                          {/* Icon with motion */}
                          <item.icon 
                            className={cn(
                              "h-4 w-4 stroke-[1.5] transition-all duration-150",
                              "group-hover:translate-x-0.5",
                              !sidebarOpen && "mx-auto"
                            )} 
                          />
                          
                          {/* Label and badge */}
                          {sidebarOpen && (
                            <div className="flex items-center justify-between flex-1 min-w-0">
                              <span className="truncate">{item.name}</span>
                              {item.badge && (
                                <span className="ml-2 inline-flex items-center rounded-full bg-slate-100 text-slate-500 px-2 py-0.5 text-xs font-normal">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                          )}
                        </Link>

                        {/* Tooltip for collapsed mode */}
                        {!sidebarOpen && (
                          <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 top-1/2 transform -translate-y-1/2">
                            {item.name}
                            {item.badge && (
                              <span className="ml-1 text-slate-300">({item.badge})</span>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Profile section at bottom */}
          <div className="border-t border-slate-100 p-3">
            <div className={cn(
              "flex items-center space-x-3 transition-all duration-150",
              !sidebarOpen && "justify-center"
            )}>
              <Avatar className="h-7 w-7 ring-1 ring-slate-200">
                <AvatarImage src="/placeholder.svg" />
                <AvatarFallback className="bg-primary text-white text-xs">
                  {user?.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {sidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-normal text-slate-700 truncate">{user?.name}</p>
                  <p className="text-xs text-slate-500 capitalize truncate">{user?.subscription_status}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`pt-[61px] transition-all duration-300 ease-in-out ${sidebarOpen ? 'lg:pl-56' : 'lg:pl-16'}`}>
        {/* Page content */}
        <main className="p-6 bg-gray-50 min-h-screen">
          {children}
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          style={{ top: '61px' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}
