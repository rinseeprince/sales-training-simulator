'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { User, Bell, Shield, Palette, Save, Upload, MessageSquare, Volume2, RefreshCw, Trash2, AlertTriangle, LogOut } from 'lucide-react'
import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { useTheme } from 'next-themes'
import { clearAllCache, clearAuthState, forceAppRefresh, clearUserData, emergencyLogout } from '@/lib/auth-cleanup'
import { CacheManager } from '@/lib/cache-manager'
import { SessionManager } from '@/lib/session-manager'
import { checkForUpdates, APP_VERSION } from '@/lib/version-check'
import { toast } from '@/components/ui/use-toast'

export function SettingsPage() {
  const { user } = useSupabaseAuth()
  const { theme, setTheme } = useTheme()
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    sms: false
  })
  const [preferences, setPreferences] = useState({
    autoSave: true,
    subtitles: true,
    voiceVolume: '80'
  })

  const handleSaveProfile = () => {
    console.log('Saving profile...')
  }

  const handleSaveNotifications = () => {
    console.log('Saving notifications...')
  }

  const handleClearCache = async () => {
    try {
      const success = await clearAllCache()
      if (success) {
        toast({
          title: "Cache Cleared",
          description: "Application cache has been cleared successfully.",
        })
      } else {
        throw new Error('Cache clear failed')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear cache. Please try refreshing the page.",
        variant: "destructive"
      })
    }
  }

  const handleForceRefresh = async () => {
    try {
      await forceAppRefresh()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh app. Please try manually refreshing.",
        variant: "destructive"
      })
    }
  }

  const handleClearUserData = async () => {
    if (confirm('This will clear all your local data and sign you out. Are you sure?')) {
      try {
        const success = await clearUserData()
        if (success) {
          toast({
            title: "Data Cleared",
            description: "All user data has been cleared. Redirecting to sign in...",
          })
          // Redirect to sign in after a delay
          setTimeout(() => {
            window.location.href = '/auth/signin'
          }, 2000)
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to clear user data.",
          variant: "destructive"
        })
      }
    }
  }

  const handleCheckUpdates = async () => {
    try {
      const versionInfo = await checkForUpdates()
      if (versionInfo?.needsUpdate) {
        toast({
          title: "Update Available",
          description: `Version ${versionInfo.version} is available. Please refresh to update.`,
        })
      } else {
        toast({
          title: "Up to Date",
          description: "You're running the latest version.",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to check for updates.",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Compressed Hero Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] px-6 py-4 h-20"
      >
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
          <p className="text-sm text-slate-500">
            Manage your account settings and preferences
          </p>
        </div>
      </motion.div>

      <Tabs defaultValue="profile" className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-2">
          <TabsList className="grid w-full grid-cols-5 bg-slate-50 rounded-lg">
            <TabsTrigger value="profile" className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">Profile</TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">Notifications</TabsTrigger>
            <TabsTrigger value="preferences" className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">Preferences</TabsTrigger>
            <TabsTrigger value="appearance" className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">Appearance</TabsTrigger>
            <TabsTrigger value="system" className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">System</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="profile" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-6"
          >
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-1 flex items-center">
                <User className="mr-2 h-5 w-5 text-primary" />
                Profile Information
              </h3>
              <p className="text-sm text-slate-500">Update your personal information and profile settings</p>
            </div>
            <div className="space-y-6">
              <div className="flex items-center space-x-6">
                <Avatar className="w-20 h-20 ring-2 ring-slate-200">
                  <AvatarImage src="/placeholder.svg" />
                  <AvatarFallback className="text-lg bg-primary text-white">
                    {user?.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Button variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50">
                    <Upload className="mr-2 h-4 w-4" />
                    Change Avatar
                  </Button>
                  <p className="text-sm text-slate-500 mt-2">
                    JPG, PNG or GIF. Max size 2MB.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">Full Name</Label>
                  <Input id="name" defaultValue={user?.name} className="border-slate-200 focus:ring-primary" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">Email</Label>
                  <Input id="email" type="email" defaultValue={user?.email} className="border-slate-200 focus:ring-primary" />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">Role</Label>
                  <Input id="role" value={user?.subscription_status} disabled className="border-slate-200 bg-slate-50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department" className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">Department</Label>
                  <Select defaultValue="sales">
                    <SelectTrigger className="border-slate-200 focus:ring-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="support">Support</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleSaveProfile} className="bg-white hover:bg-slate-50 text-primary border border-primary/20 shadow-sm px-6 py-2.5 rounded-xl font-medium">
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-6"
          >
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-1 flex items-center">
                <Bell className="mr-2 h-5 w-5 text-primary" />
                Notification Preferences
              </h3>
              <p className="text-sm text-slate-500">Choose how you want to be notified about important updates</p>
            </div>
            <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="email-notifications" className="text-sm font-medium text-slate-900">Email Notifications</Label>
                      <p className="text-sm text-slate-500">
                        Receive updates about your training progress
                      </p>
                    </div>
                    <Switch
                      id="email-notifications"
                      checked={notifications.email}
                      onCheckedChange={(checked) => 
                        setNotifications(prev => ({ ...prev, email: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="push-notifications" className="text-sm font-medium text-slate-900">Push Notifications</Label>
                      <p className="text-sm text-slate-500">
                        Get notified about new scenarios and reviews
                      </p>
                    </div>
                    <Switch
                      id="push-notifications"
                      checked={notifications.push}
                      onCheckedChange={(checked) => 
                        setNotifications(prev => ({ ...prev, push: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="sms-notifications" className="text-sm font-medium text-slate-900">SMS Notifications</Label>
                      <p className="text-sm text-slate-500">
                        Urgent notifications via text message
                      </p>
                    </div>
                    <Switch
                      id="sms-notifications"
                      checked={notifications.sms}
                      onCheckedChange={(checked) => 
                        setNotifications(prev => ({ ...prev, sms: checked }))
                      }
                    />
                  </div>
                </div>

                <Button onClick={handleSaveNotifications} className="bg-white hover:bg-slate-50 text-primary border border-primary/20 shadow-sm px-6 py-2.5 rounded-xl font-medium">
                  <Save className="mr-2 h-4 w-4" />
                  Save Preferences
                </Button>
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-6"
          >
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-1 flex items-center">
                <Shield className="mr-2 h-5 w-5 text-primary" />
                Training Preferences
              </h3>
              <p className="text-sm text-slate-500">Customize your training experience</p>
            </div>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="auto-save" className="text-sm font-medium text-slate-900">Auto-save Scenarios</Label>
                    <p className="text-sm text-slate-500">
                      Automatically save your scenario progress
                    </p>
                  </div>
                  <Switch
                    id="auto-save"
                    checked={preferences.autoSave}
                    onCheckedChange={(checked) => 
                      setPreferences(prev => ({ ...prev, autoSave: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="subtitles" className="text-sm font-medium text-slate-900">Show Subtitles by Default</Label>
                    <p className="text-sm text-slate-500">
                      Display subtitles during voice simulations
                    </p>
                  </div>
                  <Switch
                    id="subtitles"
                    checked={preferences.subtitles}
                    onCheckedChange={(checked) => 
                      setPreferences(prev => ({ ...prev, subtitles: checked }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">Voice Volume</Label>
                  <div className="flex items-center space-x-4">
                    <Volume2 className="h-4 w-4 text-slate-400" />
                    <Select 
                      value={preferences.voiceVolume} 
                      onValueChange={(value) => 
                        setPreferences(prev => ({ ...prev, voiceVolume: value }))
                      }
                    >
                      <SelectTrigger className="w-32 border-slate-200 focus:ring-primary">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="20">20%</SelectItem>
                        <SelectItem value="40">40%</SelectItem>
                        <SelectItem value="60">60%</SelectItem>
                        <SelectItem value="80">80%</SelectItem>
                        <SelectItem value="100">100%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button className="bg-white hover:bg-slate-50 text-primary border border-primary/20 shadow-sm px-6 py-2.5 rounded-xl font-medium">
                  <Save className="mr-2 h-4 w-4" />
                  Save Preferences
                </Button>
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-6"
          >
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-1 flex items-center">
                <Palette className="mr-2 h-5 w-5 text-primary" />
                Appearance Settings
              </h3>
              <p className="text-sm text-slate-500">Customize the look and feel of your interface</p>
            </div>
            <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">Theme</Label>
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger className="w-48 border-slate-200 focus:ring-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-slate-500">
                    Choose your preferred color scheme
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-slate-900">Preview</h4>
                  <div className="p-4 border border-slate-200 rounded-lg bg-white">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-12 h-12 bg-primary rounded-full"></div>
                      <div>
                        <h5 className="font-medium text-slate-900">Sample Card</h5>
                        <p className="text-sm text-slate-500">
                          This is how your interface will look
                        </p>
                      </div>
                    </div>
                    <Button size="sm" className="bg-white hover:bg-slate-50 text-primary border border-primary/20 shadow-sm px-4 py-2 rounded-xl font-medium">Sample Button</Button>
                  </div>
                </div>
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-6"
          >
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-1 flex items-center">
                <Shield className="mr-2 h-5 w-5 text-primary" />
                System & Maintenance
              </h3>
              <p className="text-sm text-slate-500">Manage app updates, cache, and troubleshooting</p>
            </div>
            <div className="space-y-6">
              {/* Version Info */}
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-slate-900">App Version</h4>
                  <span className="text-sm font-mono bg-white px-2 py-1 rounded border">
                    v{APP_VERSION}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mb-3">
                  Current version of RepScore Sales Training Simulator
                </p>
                <Button onClick={handleCheckUpdates} variant="outline" size="sm" className="border-slate-200">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Check for Updates
                </Button>
              </div>

              {/* Cache Management */}
              <div className="space-y-4">
                <h4 className="font-medium text-slate-900">Cache Management</h4>
                <div className="grid gap-3">
                  <div className="p-4 border border-slate-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium text-slate-900">Clear Application Cache</Label>
                        <p className="text-sm text-slate-500">
                          Clear cached files and data to fix loading issues
                        </p>
                      </div>
                      <Button onClick={handleClearCache} variant="outline" size="sm" className="border-slate-200">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Clear Cache
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 border border-slate-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium text-slate-900">Force App Refresh</Label>
                        <p className="text-sm text-slate-500">
                          Clear all cache and reload the application
                        </p>
                      </div>
                      <Button onClick={handleForceRefresh} variant="outline" size="sm" className="border-slate-200">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Force Refresh
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="border-t border-slate-200 pt-6">
                <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-red-900 mb-1">Danger Zone</h4>
                      <p className="text-sm text-red-700 mb-3">
                        These actions cannot be undone and will affect your account data.
                      </p>
                      <div className="space-y-2">
                        <Button
                          onClick={async () => {
                            if (confirm('Fix session issues will clean up corrupted session data. Continue?')) {
                              SessionManager.forceCleanup();
                            }
                          }}
                          variant="outline"
                          size="sm"
                          className="border-green-300 text-green-700 hover:bg-green-50 mr-2"
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Fix Session Issues
                        </Button>
                        <Button
                          onClick={async () => {
                            if (confirm('Force refresh will clear all app cache and reload. Continue?')) {
                              await CacheManager.forceRefresh();
                            }
                          }}
                          variant="outline"
                          size="sm"
                          className="border-blue-300 text-blue-700 hover:bg-blue-50 mr-2"
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Force App Refresh
                        </Button>
                        <Button
                          onClick={async () => {
                            if (confirm('Emergency logout will force sign you out and clear all auth data. Continue?')) {
                              const success = await emergencyLogout();
                              if (success) {
                                toast({
                                  title: "Emergency Logout",
                                  description: "Successfully signed out. Redirecting...",
                                });
                                setTimeout(() => {
                                  window.location.href = '/auth/signin';
                                }, 1000);
                              } else {
                                toast({
                                  title: "Error",
                                  description: "Emergency logout failed. Try refreshing the page.",
                                  variant: "destructive"
                                });
                              }
                            }
                          }}
                          variant="outline"
                          size="sm"
                          className="border-red-300 text-red-700 hover:bg-red-50 mr-2"
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          Emergency Logout
                        </Button>
                        <Button
                          onClick={handleClearUserData}
                          variant="destructive"
                          size="sm"
                          className="bg-red-600 hover:bg-red-700"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Clear All Data & Sign Out
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Troubleshooting Tips */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Troubleshooting Tips</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>App won't load after closing tab?</strong> Use "Fix Session Issues"</li>
                  <li>• <strong>Seeing old content?</strong> Try "Force App Refresh"</li>
                  <li>• <strong>Features seem broken?</strong> Check for updates first</li>
                  <li>• <strong>Still having issues?</strong> Use "Emergency Logout" as last resort</li>
                  <li>• <strong>Pro tip:</strong> Always logout properly to prevent session issues</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
