'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useSupabaseAuth } from '@/components/supabase-auth-provider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Heart, Rocket, Users, Building, ArrowRight, Mail } from 'lucide-react';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Get started with sales training',
    icon: Rocket,
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-100',
    features: [
      '3 simulations per month',
      'GPT4 model',
      'Custom scenarios',
      'Analytics',
      'AI coaching & analysis',
    ],
    buttonText: 'Get Started',
    popular: false,
    action: 'redirect',
    href: '/dashboard',
  },
  {
    name: 'Pro',
    price: '$30',
    period: 'per month',
    description: 'For serious sales professionals',
    icon: Users,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-100',
    features: [
      '50 simulations per month',
      'Everything in Free',
      'Priority support',
      'Custom scenarios',
      'Save simulations for review',
    ],
    buttonText: 'Upgrade to Pro',
    popular: true,
    action: 'waitlist', // Use waitlist action to trigger upgrade flow
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'contact us',
    description: 'For teams and organizations',
    icon: Building,
    iconColor: 'text-purple-600',
    iconBg: 'bg-purple-100',
    features: [
      'Everything in Pro',
      'RBAC',
      'Team collaboration',
      '100 simulations per user',
      '200 minutes IVY use',
      'Custom AI model',
      'Dedicated account manager',
      'Half day sales skills workshop with founder of RepScore',
    ],
    buttonText: 'Book Demo',
    popular: false,
    action: 'contact',
  },
];

export function PricingPage() {
  const { user } = useSupabaseAuth();

  interface PricingPlan {
    action: 'redirect' | 'waitlist' | 'contact';
    href?: string;
  }

  const handleAction = (plan: PricingPlan) => {
    switch (plan.action) {
      case 'redirect':
        window.location.href = plan.href;
        break;
      case 'waitlist':
        // Handle Pro plan upgrade
        window.location.href = '/dashboard?upgrade=pro';
        break;
      case 'contact':
        window.location.href = 'mailto:sales@yourcompany.com?subject=Enterprise%20Inquiry';
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] px-6 py-8"
      >
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 mb-2">
            Choose Your Training Plan
          </h1>
          <p className="text-sm text-slate-500 max-w-xl mx-auto">
            Start with our free plan or upgrade to Pro for unlimited access to advanced features.
          </p>
        </div>
      </motion.div>

      {/* Pricing Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid gap-6 md:grid-cols-3"
      >
        {plans.map((plan, index) => {
          const IconComponent = plan.icon;
          return (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 + (index * 0.1) }}
              className={`relative bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] hover:shadow-[0_1px_2px_rgba(0,0,0,.06),0_16px_32px_rgba(0,0,0,.08)] transition-all duration-200 hover:-translate-y-0.5 p-6 ${
                plan.popular
                  ? 'ring-2 ring-primary/20 scale-[1.02]'
                  : 'hover:border-slate-300'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="inline-flex items-center rounded-full bg-primary text-white px-4 py-2 text-sm font-medium shadow-lg">
                    <Heart className="w-4 h-4 mr-1" />
                    Most Popular
                  </div>
                </div>
              )}

              {/* Header with Icon */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{plan.name}</h3>
                  <p className="text-sm text-slate-500">{plan.description}</p>
                </div>
                <div className={`w-10 h-10 ${plan.iconBg} rounded-xl flex items-center justify-center flex-shrink-0 ml-4`}>
                  <IconComponent className={`h-5 w-5 ${plan.iconColor}`} />
                </div>
              </div>

              {/* Pricing */}
              <div className="mb-8">
                <div className="flex items-baseline">
                  <span className="text-3xl font-semibold text-slate-900">{plan.price}</span>
                  {plan.period !== 'forever' && (
                    <span className="text-sm text-slate-500 ml-1">/{plan.period}</span>
                  )}
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start">
                    <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mr-3 mt-0.5">
                      <Check className="h-3 w-3 text-emerald-600" />
                    </div>
                    <span className="text-sm text-slate-700">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <Button
                className={`w-full h-10 rounded-lg font-medium transition-all duration-200 ${
                  plan.popular
                    ? 'bg-primary hover:bg-primary/90 text-white shadow-sm'
                    : plan.action === 'contact'
                    ? 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
                onClick={() => handleAction(plan)}
                disabled={!plan.popular && plan.action !== 'contact'}
              >
                {plan.popular ? (
                  <>
                    {plan.buttonText}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                ) : plan.action === 'contact' ? (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    {plan.buttonText}
                  </>
                ) : (
                  plan.buttonText
                )}
              </Button>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Bottom CTA Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-6"
      >
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Start Free, Upgrade When Ready</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Get started with 3 free simulations to experience our platform. Upgrade to Pro when you're ready for unlimited access.
            </p>
          </div>
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 ml-6">
            <Heart className="h-5 w-5 text-primary" />
          </div>
        </div>
        
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center justify-center md:justify-start">
            <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mr-3">
              <Check className="h-3 w-3 text-emerald-600" />
            </div>
            <span className="text-slate-700">No credit card required</span>
          </div>
          <div className="flex items-center justify-center md:justify-start">
            <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mr-3">
              <Check className="h-3 w-3 text-emerald-600" />
            </div>
            <span className="text-slate-700">Instant access</span>
          </div>
          <div className="flex items-center justify-center md:justify-start">
            <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mr-3">
              <Check className="h-3 w-3 text-emerald-600" />
            </div>
            <span className="text-slate-700">Cancel anytime</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
