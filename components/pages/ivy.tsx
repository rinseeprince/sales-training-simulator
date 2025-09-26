'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { ContactModal } from '@/components/ui/contact-modal'
import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { Bot, Sparkles, Mic, MessageSquare, Zap, Clock, Users, Shield, Info, Play, Volume2 } from 'lucide-react'

export function IvyPage() {
  const { user } = useSupabaseAuth()
  const [isScriptLoaded, setIsScriptLoaded] = useState(false)
  const [showWidget, setShowWidget] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [contactModalOpen, setContactModalOpen] = useState(false)
  const [userSubscription, setUserSubscription] = useState<'free' | 'paid' | 'enterprise' | null>(null)

  useEffect(() => {
    // Check if custom element is already defined (prevents re-registration error)
    if (typeof window !== 'undefined' && window.customElements && window.customElements.get('elevenlabs-convai')) {
      console.log('ElevenLabs custom element already registered')
      setIsScriptLoaded(true)
      return
    }

    // Check if script is already loaded
    const existingScript = document.querySelector('script[src*="elevenlabs"]')
    if (existingScript) {
      console.log('ElevenLabs script already exists')
      setIsScriptLoaded(true)
      return
    }

    // Load the ElevenLabs script when component mounts
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed'
    script.async = true
    script.type = 'text/javascript'
    script.id = 'elevenlabs-convai-script'
    
    script.onload = () => {
      console.log('ElevenLabs script loaded successfully')
      
      // Check that the custom element is now available
      if (window.customElements && window.customElements.get('elevenlabs-convai')) {
        setIsScriptLoaded(true)
      } else {
        console.error('ElevenLabs custom element not found after script load')
      }
    }
    
    script.onerror = (error) => {
      console.error('Failed to load ElevenLabs ConvAI script:', error)
      setIsScriptLoaded(false)
    }

    document.head.appendChild(script)

    return () => {
      // Keep script loaded to prevent re-registration issues
      console.log('Ivy component unmounting - keeping script loaded')
    }
  }, [])

  // Check user subscription status
  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) return
      
      try {
        const response = await fetch(`/api/user-profile?authUserId=${user.id}`)
        const data = await response.json()
        
        if (data.success && data.userProfile) {
          setUserSubscription(data.userProfile.subscription_status || 'free')
        }
      } catch (error) {
        console.error('Failed to check subscription:', error)
        setUserSubscription('free') // Default to free on error
      }
    }

    checkSubscription()
  }, [user])

  const handleTryIvy = () => {
    // Check if user is enterprise - if not, show contact modal
    if (userSubscription !== 'enterprise') {
      setContactModalOpen(true)
      return
    }
    
    // Enterprise users can proceed
    setIsLoading(true)
    setTimeout(() => {
      setShowWidget(true)
      setIsLoading(false)
    }, 1000)
  }

  const features = [
    {
      icon: <Bot className="h-6 w-6 text-blue-600" />,
      title: "Advanced AI Prospect",
      description: "Ivy uses cutting-edge voice AI to provide realistic sales conversations with natural responses and objection handling."
    },
    {
      icon: <Volume2 className="h-6 w-6 text-green-600" />,
      title: "Natural Voice Interactions",
      description: "Experience seamless voice-to-voice conversations without the delay of text-to-speech conversion."
    },
    {
      icon: <Zap className="h-6 w-6 text-yellow-600" />,
      title: "Instant Response Time",
      description: "Get immediate feedback and responses, just like a real sales call with a live prospect."
    },
    {
      icon: <MessageSquare className="h-6 w-6 text-purple-600" />,
      title: "Context Awareness",
      description: "Ivy remembers the conversation context and responds appropriately based on your scenario setup."
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="relative">
              <Bot className="h-12 w-12 text-blue-600" />
              <div className="absolute -top-1 -right-1">
                <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs px-2 py-0.5">
                  Beta
                </Badge>
              </div>
            </div>
          </div>
          
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
            Meet Ivy
          </h1>
          
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Your AI sales prospect powered by advanced voice technology. 
            Experience the future of sales training with natural, voice-to-voice conversations.
          </p>
          
          <div className="flex items-center justify-center space-x-2 mt-4">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            <span className="text-sm font-medium text-slate-600">
              Next-generation voice AI for sales training
            </span>
            <Sparkles className="h-5 w-5 text-yellow-500" />
          </div>
        </motion.div>

        {/* Beta Notice */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Beta Feature:</strong> Ivy is in active development. We're continuously improving the experience based on user feedback. 
              Your conversations help us make Ivy smarter and more realistic.
            </AlertDescription>
          </Alert>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid md:grid-cols-2 gap-6"
        >
          {features.map((feature, index) => (
            <Card key={index} className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-slate-600 text-sm">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Main Interaction Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Bot className="h-8 w-8" />
                  <div>
                    <CardTitle className="text-2xl">Ivy - AI Sales Prospect</CardTitle>
                    <p className="text-blue-100 mt-1">
                      Ready to practice your sales skills with advanced voice AI
                    </p>
                  </div>
                </div>
                <Badge className="bg-white/20 text-white border-white/30">
                  Beta
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="p-8">
              {!showWidget ? (
                /* Welcome State */
                <div className="text-center space-y-6">
                  <div className="relative inline-block">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Bot className="h-12 w-12 text-white" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <div className="w-3 h-3 bg-white rounded-full"></div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="text-2xl font-bold text-slate-900">
                      Ready to Meet Ivy?
                    </h3>
                    <p className="text-slate-600 max-w-md mx-auto">
                      Start a natural voice conversation with our AI sales prospect. 
                      No typing required - just speak naturally like you would in a real sales call.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-md mx-auto">
                    <Button 
                      onClick={handleTryIvy}
                      size="lg"
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 text-lg"
                      disabled={!isScriptLoaded || isLoading}
                    >
                      {isLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Loading Ivy...
                        </>
                      ) : (
                        <>
                          <Play className="h-5 w-5 mr-2" />
                          Try Ivy Now
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="text-sm text-slate-500 space-y-2">
                    <div className="flex items-center justify-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Mic className="h-4 w-4" />
                        <span>Voice enabled</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>Real-time responses</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Shield className="h-4 w-4" />
                        <span>Secure & private</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Widget State */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-slate-700">Ivy is listening...</span>
                    </div>
                    <Button 
                      onClick={() => setShowWidget(false)}
                      variant="outline"
                      size="sm"
                    >
                      Reset
                    </Button>
                  </div>
                  
                  <Separator />
                  
                  {/* ElevenLabs Widget */}
                  <div className="w-full h-96 bg-slate-50 rounded-lg overflow-hidden border-2 border-slate-200">
                    {isScriptLoaded ? (
                      <div 
                        className="w-full h-full"
                        dangerouslySetInnerHTML={{
                          __html: '<elevenlabs-convai agent-id="agent_1701k5yrs1ate7btr3ve24j8tvm9" style="width: 100%; height: 100%; border: none;"></elevenlabs-convai>'
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                          <p className="text-sm text-slate-600">Loading Ivy...</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <Alert className="border-blue-200 bg-blue-50">
                    <Mic className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      <strong>Tip:</strong> Click the microphone button in the widget above to start talking to Ivy. 
                      She's ready to roleplay as a sales prospect based on any scenario you describe.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Coming Soon Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl text-slate-900 flex items-center">
                <Sparkles className="h-5 w-5 mr-2 text-yellow-500" />
                Coming Soon
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-slate-50 rounded-lg">
                  <Users className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <h4 className="font-medium text-slate-700">Scenario Integration</h4>
                  <p className="text-sm text-slate-500 mt-1">
                    Connect with your saved scenarios
                  </p>
                </div>
                <div className="text-center p-4 bg-slate-50 rounded-lg">
                  <MessageSquare className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <h4 className="font-medium text-slate-700">Call Analytics</h4>
                  <p className="text-sm text-slate-500 mt-1">
                    Performance tracking & insights
                  </p>
                </div>
                <div className="text-center p-4 bg-slate-50 rounded-lg">
                  <Shield className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <h4 className="font-medium text-slate-700">Custom Personas</h4>
                  <p className="text-sm text-slate-500 mt-1">
                    Tailored prospect personalities
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      
      {/* Contact Modal */}
      <ContactModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        title="Interested in Ivy?"
        subtitle=""
      />
    </div>
  )
} 