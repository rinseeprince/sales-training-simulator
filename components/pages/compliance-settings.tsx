'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, Download, Trash2, AlertTriangle, CheckCircle, Clock, Database } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function ComplianceSettings() {
  const [gdprEnabled, setGdprEnabled] = useState(true)
  const [voiceStorage, setVoiceStorage] = useState(false)
  const [dataRetention, setDataRetention] = useState('90')
  const [consentRequired, setConsentRequired] = useState(true)

  const handleDownloadData = () => {
    console.log('Downloading user data...')
  }

  const handleDeleteData = () => {
    console.log('Deleting user data...')
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
          <h1 className="text-xl font-semibold text-slate-900">Compliance Settings</h1>
          <p className="text-sm text-slate-500">
            Manage data privacy, GDPR compliance, and user consent settings
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-emerald-500" />
          <span className="text-sm font-medium text-emerald-600">Compliant</span>
        </div>
      </motion.div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* GDPR Settings */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-6"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5" />
                GDPR Compliance
              </CardTitle>
              <CardDescription>
                General Data Protection Regulation settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="gdpr-enabled">Enable GDPR Compliance</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically handle data protection requirements
                  </p>
                </div>
                <Switch
                  id="gdpr-enabled"
                  checked={gdprEnabled}
                  onCheckedChange={setGdprEnabled}
                />
              </div>

              <div className="space-y-2">
                <Label>Data Retention Period</Label>
                <Select value={dataRetention} onValueChange={setDataRetention}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="180">180 days</SelectItem>
                    <SelectItem value="365">1 year</SelectItem>
                    <SelectItem value="never">Never delete</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Data will be automatically deleted after this period
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="consent-required">Require User Consent</Label>
                  <p className="text-sm text-muted-foreground">
                    Show consent screen before recording
                  </p>
                </div>
                <Switch
                  id="consent-required"
                  checked={consentRequired}
                  onCheckedChange={setConsentRequired}
                />
              </div>

              {gdprEnabled && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    GDPR compliance is active. User data will be handled according to EU regulations.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Voice & Recording Settings</CardTitle>
              <CardDescription>
                Configure voice data storage and processing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="voice-storage">Enable Voice Storage</Label>
                  <p className="text-sm text-muted-foreground">
                    Store voice recordings for playback and analysis
                  </p>
                </div>
                <Switch
                  id="voice-storage"
                  checked={voiceStorage}
                  onCheckedChange={setVoiceStorage}
                />
              </div>

              {!voiceStorage && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Voice storage is disabled. Only transcripts will be saved.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Data Management */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-6"
        >
          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
              <CardDescription>
                Export and delete user data for compliance requests
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Export User Data</h4>
                    <Download className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Download all user data in a portable format
                  </p>
                  <Button variant="outline" onClick={handleDownloadData}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Data
                  </Button>
                </div>

                <div className="p-4 border rounded-lg border-red-200 dark:border-red-800">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-red-600 dark:text-red-400">Delete User Data</h4>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Permanently delete all user data (irreversible)
                  </p>
                  <Button variant="destructive" onClick={handleDeleteData}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete All Data
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Compliance Status</CardTitle>
              <CardDescription>
                Current compliance status and metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">GDPR Compliant</span>
                  </div>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                    Active
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="text-sm">Data Retention</span>
                  </div>
                  <Badge variant="outline">
                    {dataRetention} days
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Database className="h-4 w-4 text-purple-500" />
                    <span className="text-sm">Stored Records</span>
                  </div>
                  <Badge variant="secondary">
                    1,247 records
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-orange-500" />
                    <span className="text-sm">Consent Rate</span>
                  </div>
                  <Badge variant="outline">
                    98.5%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Consent Management</CardTitle>
              <CardDescription>
                User consent tracking and management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Users:</span>
                  <span>156</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Consented:</span>
                  <span className="text-green-600">154</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pending:</span>
                  <span className="text-yellow-600">2</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Withdrawn:</span>
                  <span className="text-red-600">0</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
