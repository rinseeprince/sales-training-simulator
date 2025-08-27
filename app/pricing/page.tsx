'use client'

import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { PricingPage } from '@/components/pricing-page'
import { MainLayout } from '@/components/layout/main-layout'

export default function Pricing() {
  const { user } = useSupabaseAuth()

  // If user is logged in, show with layout
  if (user) {
    return (
      <MainLayout>
        <PricingPage />
      </MainLayout>
    )
  }

  // If user is not logged in, show standalone pricing page
  return <PricingPage />
}
