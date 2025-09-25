'use client';

import React from 'react';
import { useSupabaseAuth } from '@/components/supabase-auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Star, Zap, Crown, Heart, Rocket, Users, Building, Sparkles, ArrowRight, Mail } from 'lucide-react';
import Link from 'next/link';

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
      'Basic AI responses',
      'Standard scenarios',
      'Voice streaming',
      'Basic analytics',
      'Community support',
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
      'Advanced AI responses',
      'Custom scenarios',
      'Voice streaming',
      'Detailed analytics',
      'Priority support',
      'Advanced reporting',
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
      'Unlimited simulations',
      'Custom AI training',
      'Team collaboration',
      'SLA guarantee',
      'On-premise deployment',
      'White-label options',
      'Dedicated support',
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
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Hero Section */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 mb-2">
          Choose Your Training Plan
        </h1>
        <p className="text-sm text-slate-500 max-w-xl mx-auto">
          Start with our free plan or upgrade to Pro for unlimited access to advanced features.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {plans.map((plan) => {
          const IconComponent = plan.icon;
          return (
            <div
              key={plan.name}
              className={`relative bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] hover:shadow-[0_1px_2px_rgba(0,0,0,.06),0_16px_32px_rgba(0,0,0,.08)] transition-all duration-200 hover:-translate-y-0.5 p-8 ${
                plan.popular
                  ? 'ring-2 ring-primary/20 scale-105 hover:scale-[1.02]'
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
                <div className={`w-12 h-12 ${plan.iconBg} rounded-xl flex items-center justify-center flex-shrink-0 ml-4`}>
                  <IconComponent className={`h-6 w-6 ${plan.iconColor}`} />
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
                className={`w-full h-12 rounded-xl font-medium transition-all duration-200 ${
                  plan.popular
                    ? 'bg-white hover:bg-slate-50 text-primary border border-primary/20 shadow-sm'
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
            </div>
          );
        })}
      </div>

      <div className="text-center mt-12">
        <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)] p-8 max-w-4xl mx-auto">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Start Free, Upgrade When Ready</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Get started with 3 free simulations to experience our platform. Upgrade to Pro when you're ready for unlimited access.
              </p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 ml-6">
              <Heart className="h-6 w-6 text-primary" />
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 text-sm">
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
        </div>
      </div>
    </div>
  );
}
