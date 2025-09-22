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
    name: 'Free Beta',
    price: '$0',
    period: 'forever',
    description: 'Full access during our beta period',
    icon: Rocket,
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-100',
    features: [
      'Unlimited simulations',
      'Advanced AI responses',
      'Custom scenarios',
      'Voice streaming',
      'Detailed analytics',
      'Priority support',
      'Early access to new features',
    ],
    buttonText: 'Get Started',
    popular: true,
    action: 'redirect',
    href: '/dashboard',
  },
  {
    name: 'Pro (Coming Soon)',
    price: '$29',
    period: 'per month',
    description: 'Premium features for power users',
    icon: Users,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-100',
    features: [
      'Everything in Free Beta',
      'Team collaboration',
      'Advanced reporting',
      'Custom integrations',
      'Dedicated support',
      'API access',
    ],
    buttonText: 'Join Waitlist',
    popular: false,
    action: 'waitlist',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'per month',
    description: 'For teams and organizations',
    icon: Building,
    iconColor: 'text-purple-600',
    iconBg: 'bg-purple-100',
    features: [
      'Everything in Pro',
      'Custom training',
      'SLA guarantee',
      'On-premise deployment',
      'White-label options',
    ],
    buttonText: 'Contact Us',
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
        // You can add a waitlist signup form here
        alert('Thanks for your interest! We\'ll notify you when Pro plans are available.');
        break;
      case 'contact':
        window.location.href = 'mailto:sales@yourcompany.com?subject=Enterprise%20Inquiry';
        break;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Streamlined Hero Section */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-700 px-3 py-1 text-xs font-medium">
            <Sparkles className="w-3 h-3 mr-1" />
            Free Beta Access
          </div>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 mb-2">
          Start Training Today
        </h1>
        <p className="text-sm text-slate-500 max-w-xl mx-auto">
          We're in beta and offering full access for free. Help us improve by providing feedback!
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
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Why Free Beta?</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                We're building the best sales training platform and need your feedback to make it perfect. 
                Use all features for free and help us improve!
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
              <span className="text-slate-700">Full feature access</span>
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
