'use client'

import { createContext, useContext, useState, useEffect } from 'react'

type User = {
  id: string
  email: string
  name: string
  role: 'rep' | 'manager' | 'admin'
  avatar?: string
}

type AuthContextType = {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate checking for existing session
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser)
      // Check if the saved user has the old ID format and force re-login
      if (parsedUser.id === '1') {
        console.log('Detected old user ID format, clearing and re-logging in...')
        localStorage.removeItem('user')
        // Auto-login with new UUID format
        const mockUser: User = {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: parsedUser.email || 'samuel.k@example.com',
          name: parsedUser.name || 'samuel.k',
          role: parsedUser.role || 'rep',
          avatar: parsedUser.avatar || `/placeholder.svg?height=40&width=40&query=avatar`
        }
        setUser(mockUser)
        localStorage.setItem('user', JSON.stringify(mockUser))
      } else {
        setUser(parsedUser)
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    // Simulate login - replace with actual auth logic
    const mockUser: User = {
      id: '550e8400-e29b-41d4-a716-446655440000', // Use a proper UUID format
      email,
      name: email.split('@')[0],
      role: email.includes('manager') ? 'manager' : email.includes('admin') ? 'admin' : 'rep',
      avatar: `/placeholder.svg?height=40&width=40&query=avatar`
    }
    setUser(mockUser)
    localStorage.setItem('user', JSON.stringify(mockUser))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('user')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
