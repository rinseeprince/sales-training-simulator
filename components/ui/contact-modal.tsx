'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { X, Mail, Phone, MessageSquare, Send, CheckCircle } from 'lucide-react'

interface ContactModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  subtitle?: string
}

export function ContactModal({ isOpen, onClose, title, subtitle }: ContactModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setIsSubmitting(false)
    setIsSubmitted(true)
    
    // Auto-close after success
    setTimeout(() => {
      onClose()
      setTimeout(() => {
        setIsSubmitted(false)
        setFormData({ name: '', email: '', company: '', message: '' })
      }, 300)
    }, 2000)
  }

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="w-full max-w-md"
            >
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/60 overflow-hidden">
              {!isSubmitted ? (
                <>
                  {/* Header */}
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 relative">
                    <button
                      onClick={onClose}
                      className="absolute right-4 top-4 p-2 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-all duration-200"
                    >
                      <X className="h-5 w-5" />
                    </button>
                    
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="p-2 bg-white/20 rounded-lg">
                        <MessageSquare className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">
                          {title || "Contact Our Sales Team"}
                        </h2>
                      </div>
                    </div>
                    
                    {subtitle && (
                      <p className="text-blue-100 text-sm">
                        {subtitle}
                      </p>
                    )}
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Name</label>
                        <Input
                          required
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          className="rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                          placeholder="Your name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Company</label>
                        <Input
                          value={formData.company}
                          onChange={(e) => handleInputChange('company', e.target.value)}
                          className="rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                          placeholder="Company name"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                      <Input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                        placeholder="your@company.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Message</label>
                      <Textarea
                        required
                        value={formData.message}
                        onChange={(e) => handleInputChange('message', e.target.value)}
                        className="rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 min-h-[100px] resize-none"
                        placeholder="Tell us about your sales training needs and how we can help..."
                      />
                    </div>

                    <div className="flex flex-col space-y-3 pt-4">
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg py-3 font-semibold transition-all duration-300 disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <div className="flex items-center justify-center space-x-2">
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Sending...</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center space-x-2">
                            <Send className="h-5 w-5" />
                            <span>Send Message</span>
                          </div>
                        )}
                      </Button>
                      
                      <div className="flex items-center justify-center pt-3 border-t border-slate-200">
                        <div className="flex items-center space-x-2 text-sm text-slate-600">
                          <Mail className="h-4 w-4" />
                          <span>sales@repscore.io</span>
                        </div>
                      </div>
                    </div>
                  </form>
                </>
              ) : (
                /* Success State */
                <div className="p-8 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", duration: 0.5 }}
                    className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4"
                  >
                    <CheckCircle className="h-8 w-8 text-emerald-600" />
                  </motion.div>
                  
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Message Sent!</h3>
                  <p className="text-slate-600 mb-6">
                    Thanks for your interest in Ivy. Our team will get back to you within 24 hours.
                  </p>
                  
                  <div className="bg-emerald-50 rounded-lg p-4">
                    <p className="text-sm text-emerald-700 font-medium">
                      💡 Pro tip: Check your email for a confirmation and our Enterprise features guide.
                    </p>
                  </div>
                </div>
              )}
            </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}