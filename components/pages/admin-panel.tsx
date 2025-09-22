'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileText, Clock, Search, Filter, Download, Settings, CheckCircle } from 'lucide-react'

const leaderboardData = [
  { id: 1, name: 'Sarah Johnson', calls: 47, avgScore: 89, certifications: 8, trend: '+5%' },
  { id: 2, name: 'Mike Chen', calls: 42, avgScore: 85, certifications: 6, trend: '+12%' },
  { id: 3, name: 'Emily Davis', calls: 38, avgScore: 91, certifications: 9, trend: '+8%' },
  { id: 4, name: 'Alex Rodriguez', calls: 35, avgScore: 78, certifications: 4, trend: '-2%' },
  { id: 5, name: 'Jessica Kim', calls: 33, avgScore: 87, certifications: 7, trend: '+15%' },
]

const reviewQueue = [
  { id: 1, rep: 'Sarah Johnson', scenario: 'Enterprise Demo', date: '2024-01-15', status: 'pending' },
  { id: 2, rep: 'Mike Chen', scenario: 'Objection Handling', date: '2024-01-15', status: 'pending' },
  { id: 3, rep: 'Emily Davis', scenario: 'Negotiation', date: '2024-01-14', status: 'reviewed' },
  { id: 4, rep: 'Alex Rodriguez', scenario: 'Cold Outbound', date: '2024-01-14', status: 'pending' },
]

const scenarios = [
  { id: 1, title: 'Enterprise Software Demo', type: 'Warm Inbound', difficulty: 'Medium', uses: 23 },
  { id: 2, title: 'Price Objection Handling', type: 'Objection Handling', difficulty: 'Hard', uses: 18 },
  { id: 3, title: 'C-Level Cold Outreach', type: 'Cold Outbound', difficulty: 'Hard', uses: 15 },
  { id: 4, title: 'Product Demo Follow-up', type: 'Warm Inbound', difficulty: 'Easy', uses: 12 },
]

export function AdminPanel() {
  const [searchTerm, setSearchTerm] = useState('')
  const [autoApproval, setAutoApproval] = useState(false)

  return (
    <div className="space-y-6">
      {/* Compressed Hero Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] px-6 py-4 h-20"
      >
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Admin Panel</h1>
          <p className="text-sm text-slate-500">
            Manage team performance, scenarios, and system settings
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50">
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
          <Button className="bg-primary hover:bg-primary/90 text-white">
            <Settings className="mr-2 h-4 w-4" />
            System Settings
          </Button>
        </div>
      </motion.div>

      <Tabs defaultValue="leaderboard" className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-2">
          <TabsList className="grid w-full grid-cols-4 bg-slate-50 rounded-lg">
            <TabsTrigger value="leaderboard" className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">Leaderboard</TabsTrigger>
            <TabsTrigger value="reviews" className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">Review Queue</TabsTrigger>
            <TabsTrigger value="scenarios" className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">Scenario Library</TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">Settings</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="leaderboard" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Team Leaderboard</CardTitle>
                <CardDescription>
                  Performance rankings and statistics for all sales reps
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search reps..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button variant="outline">
                    <Filter className="mr-2 h-4 w-4" />
                    Filter
                  </Button>
                </div>

                <div className="space-y-4">
                  {leaderboardData.map((rep, index) => (
                    <div
                      key={rep.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{rep.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {rep.calls} calls completed
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-6 text-sm">
                        <div className="text-center">
                          <p className="font-medium">{rep.avgScore}</p>
                          <p className="text-muted-foreground">Avg Score</p>
                        </div>
                        <div className="text-center">
                          <p className="font-medium">{rep.certifications}</p>
                          <p className="text-muted-foreground">Certs</p>
                        </div>
                        <Badge variant={rep.trend.startsWith('+') ? 'default' : 'destructive'}>
                          {rep.trend}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="reviews" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Review Queue</CardTitle>
                <CardDescription>
                  Calls awaiting manager review and approval
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reviewQueue.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        {item.status === 'pending' ? (
                          <Clock className="h-5 w-5 text-yellow-500" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        )}
                        <div>
                          <p className="font-medium">{item.rep}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.scenario} • {item.date}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={item.status === 'pending' ? 'outline' : 'secondary'}>
                          {item.status}
                        </Badge>
                        {item.status === 'pending' && (
                          <Button size="sm">Review</Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="scenarios" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Scenario Library</CardTitle>
                <CardDescription>
                  Manage and organize training scenarios
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-6">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search scenarios..."
                      className="pl-10"
                    />
                  </div>
                  <Button>
                    <FileText className="mr-2 h-4 w-4" />
                    Create Scenario
                  </Button>
                </div>

                <div className="space-y-4">
                  {scenarios.map((scenario) => (
                    <div
                      key={scenario.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{scenario.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {scenario.type} • {scenario.difficulty}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-sm text-muted-foreground">
                          {scenario.uses} uses
                        </div>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="grid gap-6 md:grid-cols-2"
          >
            <Card>
              <CardHeader>
                <CardTitle>Review Settings</CardTitle>
                <CardDescription>
                  Configure automatic review and approval settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-approval">Enable AI Auto-Certification</Label>
                  <Switch
                    id="auto-approval"
                    checked={autoApproval}
                    onCheckedChange={setAutoApproval}
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  When enabled, calls scoring above 85 will be automatically certified
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Certification Tracking</CardTitle>
                <CardDescription>
                  Monitor team certification progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Certifications</span>
                    <Badge>34</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Pending Reviews</span>
                    <Badge variant="outline">8</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Auto-Approved</span>
                    <Badge variant="secondary">12</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
