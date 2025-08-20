'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Home, FileText, Phone, BarChart3, Settings, Users, Shield, Menu, X, LogOut, Moon, Sun, BookOpen, History, DollarSign, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home, roles: ['rep', 'manager', 'admin'] },
  { name: 'Scenario Builder', href: '/scenario-builder', icon: FileText, roles: ['rep', 'manager', 'admin'] },
  { name: 'Saved Scenarios', href: '/saved-scenarios', icon: BookOpen, roles: ['rep', 'manager', 'admin'] },
  { name: 'Saved Simulations', href: '/simulations', icon: History, roles: ['rep', 'manager', 'admin'] },
  { name: 'Review', href: '/review', icon: BarChart3, roles: ['rep', 'manager', 'admin'] },
  { name: 'Pricing', href: '/pricing', icon: DollarSign, roles: ['rep', 'manager', 'admin'] },
  { name: 'Admin Panel', href: '/admin', icon: Users, roles: ['manager', 'admin'] },
  { name: 'Compliance', href: '/compliance', icon: Shield, roles: ['admin'] },
  { name: 'Settings', href: '/settings', icon: Settings, roles: ['rep', 'manager', 'admin'] },
]

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarOpen')
      return saved ? JSON.parse(saved) : true
    }
    return true
  })
  const { user, logout } = useSupabaseAuth()
  const { theme, setTheme } = useTheme()
  const pathname = usePathname()

  const handleSidebarToggle = (newState: boolean) => {
    setSidebarOpen(newState)
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarOpen', JSON.stringify(newState))
    }
  }

  const filteredNavigation = navigation

  return (
    <div className="min-h-screen bg-background">
      {/* Top header - full width */}
              <div className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-teal-600 via-teal-500 to-teal-400 shadow-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-6">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-white hover:bg-white/10"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-6 h-6 bg-white/10 rounded-xl border border-white/20">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="currentColor"/>
                  <path d="M19 15L19.5 17L22 17.5L19.5 18L19 20L18.5 18L16 17.5L18.5 17L19 15Z" fill="currentColor"/>
                  <path d="M5 15L5.5 17L8 17.5L5.5 18L5 20L4.5 18L2 17.5L4.5 17L5 15Z" fill="currentColor"/>
                </svg>
              </div>
              <h1 className="text-lg font-normal text-white tracking-tight">
                RepScore
              </h1>
            </div>
            <div className="hidden md:block text-white/90 text-sm font-normal">
              Have questions? Email <a href="mailto:sales@repscore.ai" className="underline hover:text-white transition-colors">sales@repscore.ai</a>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>

            <div className="flex items-center space-x-3">
              <Avatar className="ring-2 ring-white/20">
                <AvatarImage src="/placeholder.svg" />
                <AvatarFallback className="bg-white/10 text-white">
                  {user?.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-white">{user?.name}</p>
                <p className="text-xs text-white/80 capitalize">{user?.subscription_status}</p>
              </div>
            </div>

            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-white/10" 
              onClick={() => {
                console.log('Logout button clicked');
                logout();
              }}
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      <motion.div
        initial={false}
        animate={{ x: sidebarOpen ? 0 : '-100%' }}
        className="fixed inset-y-0 left-0 z-50 w-64 bg-gray-50 border-r lg:hidden"
        style={{ top: '64px' }}
      >
        <nav className="p-4 space-y-2">
          {filteredNavigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>
      </motion.div>

      {/* Desktop sidebar */}
      <div className={`hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:bg-gray-50 lg:border-r transition-all duration-300 ease-in-out ${sidebarOpen ? 'lg:w-64' : 'lg:w-16'}`} style={{ top: '64px' }}>
        {/* Logo Section */}
        <div className="p-4">
                      <div 
              className="flex items-center space-x-3 cursor-pointer group relative"
              onClick={() => handleSidebarToggle(!sidebarOpen)}
            >
            <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </div>
            {sidebarOpen && (
              <div className="flex items-center space-x-1">
                <span className="font-semibold text-lg">RepScore</span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
            {/* Hover tooltip for collapsed state */}
            {!sidebarOpen && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                Open sidebar
              </div>
            )}
            {/* Hover icon for collapsed state */}
            {!sidebarOpen && (
              <div className="absolute left-full ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>

        <nav className="p-2 space-y-1">
          {filteredNavigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent",
                !sidebarOpen && "justify-center px-2"
              )}
            >
              <item.icon className="h-5 w-5" />
              {sidebarOpen && <span>{item.name}</span>}
            </Link>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <div className={`pt-16 transition-all duration-300 ease-in-out ${sidebarOpen ? 'lg:pl-64' : 'lg:pl-16'}`}>
        {/* Page content */}
        <main className="p-4 bg-gray-50 min-h-screen">
          {children}
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          style={{ top: '64px' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}
