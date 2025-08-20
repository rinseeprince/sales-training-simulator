'use client'

import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { MainLayout } from '@/components/layout/main-layout'
import { PostCallReview } from '@/components/pages/post-call-review'

export default function ReviewPage() {
  const { user } = useSupabaseAuth()

  if (!user) {
    return null
  }

  return (
    <MainLayout>
      <PostCallReview />
    </MainLayout>
  )
}
