'use client';

import React from 'react';
import { useSupabaseAuth } from '@/components/supabase-auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Star, Zap, Crown, Heart } from 'lucide-react';
import Link from 'next/link';

const plans = [
  {
    name: 'Free Beta',
    price: '$0',
    period: 'forever',
    description: 'Full access during our beta period',
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

  const handleAction = (plan: any) => {
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
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="text-center mb-12">
        <div className="flex justify-center mb-4">
          <Badge className="bg-teal-500 text-white px-4 py-2">
            Free Beta Access
          </Badge>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-4">
          Start Training Today
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          We're in beta and offering full access for free. Help us improve by providing feedback!
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`relative ${
              plan.popular
                ? 'border-2 border-teal-500 shadow-xl scale-105'
                : 'border border-border opacity-75'
            }`}
          >
            {plan.popular && (
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-teal-500 text-white">
                <Heart className="w-4 h-4 mr-1" />
                Free Beta
              </Badge>
            )}

                          <CardHeader className="text-center">
                <CardTitle className="text-lg font-bold">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-2xl font-bold">{plan.price}</span>
                  {plan.period !== 'forever' && (
                    <span className="text-muted-foreground">/{plan.period}</span>
                  )}
                </div>
                <CardDescription className="mt-2">{plan.description}</CardDescription>
              </CardHeader>

            <CardContent>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center">
                    <Check className="h-5 w-5 text-teal-500 mr-3 flex-shrink-0" />
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className={`w-full ${
                  plan.popular
                    ? 'bg-teal-600 hover:bg-teal-700'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                }`}
                onClick={() => handleAction(plan)}
                disabled={!plan.popular}
              >
                {plan.buttonText}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center mt-12">
        <div className="bg-card rounded-lg p-6 shadow-sm max-w-2xl mx-auto">
          <h3 className="text-lg font-semibold mb-2">Why Free Beta?</h3>
          <p className="text-muted-foreground mb-4">
            We're building the best sales training platform and need your feedback to make it perfect. 
            Use all features for free and help us improve!
          </p>
          <div className="flex justify-center space-x-4 text-sm text-muted-foreground">
            <span>✓ No credit card required</span>
            <span>✓ Full feature access</span>
            <span>✓ Cancel anytime</span>
          </div>
        </div>
      </div>
    </div>
  );
}
