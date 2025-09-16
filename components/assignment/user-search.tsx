'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandGroup, CommandItem } from '@/components/ui/command'
import { Search, Check } from 'lucide-react'
import { authenticatedGet } from '@/lib/api-client'
import { useLoadingManager } from '@/lib/loading-manager'

interface SearchUser {
  id: string
  name: string
  email: string
  role: string
}

interface UserSearchProps {
  selectedUsers: SearchUser[]
  onUsersChange: (users: SearchUser[]) => void
  userDomain: string
}

export function UserSearch({ selectedUsers, onUsersChange, userDomain }: UserSearchProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const loadingManager = useLoadingManager()

  const searchUsers = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([])
      return
    }

    const searchKey = `user-search-${query}-${userDomain}`
    
    try {
      await loadingManager.withLoading(searchKey, async () => {
        setIsSearching(true)
        
        const url = `/api/users/search?q=${encodeURIComponent(query)}&domain=${userDomain}`
        
        const response = await authenticatedGet(url)
        
        if (response.ok) {
          const data = await response.json()
          setSearchResults(data.users || [])
        } else {
          const errorData = await response.json()
          console.error('User search failed:', { status: response.status, error: errorData })
          setSearchResults([])
        }
      })
    } catch (error) {
      console.error('User search error:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchUsers(searchQuery)
      } else {
        setSearchResults([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, userDomain])

  const addUser = (user: SearchUser) => {
    if (!selectedUsers.find(u => u.id === user.id)) {
      onUsersChange([...selectedUsers, user])
    }
    setSearchQuery('')
  }

  const removeUser = (userId: string) => {
    onUsersChange(selectedUsers.filter(u => u.id !== userId))
  }

  return (
    <div className="space-y-4">
      {/* User Search */}
      <div className="space-y-2">
        <Label className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">
          Search Users ({userDomain})
        </Label>
        <Popover open={searchQuery.length > 0}>
          <PopoverTrigger asChild>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-3 rounded-lg border-slate-200 focus:ring-primary"
              />
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command>
              <CommandGroup>
                {isSearching && (
                  <CommandItem disabled>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                    Searching...
                  </CommandItem>
                )}
                {!isSearching && searchResults.length === 0 && searchQuery && (
                  <CommandItem disabled>No users found</CommandItem>
                )}
                {searchResults.map((searchUser) => (
                  <CommandItem
                    key={searchUser.id}
                    onSelect={() => addUser(searchUser)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <div className="font-medium">{searchUser.name}</div>
                        <div className="text-sm text-slate-500">{searchUser.email}</div>
                      </div>
                      {selectedUsers.find(u => u.id === searchUser.id) && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Selected Users */}
      {selectedUsers.length > 0 && (
        <div className="space-y-2">
          <Label className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">
            Selected Users ({selectedUsers.length})
          </Label>
          <div className="space-y-2">
            {selectedUsers.map((selectedUser) => (
              <div key={selectedUser.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                <div>
                  <div className="text-sm font-medium">{selectedUser.name}</div>
                  <div className="text-xs text-slate-500">{selectedUser.email}</div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeUser(selectedUser.id)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}