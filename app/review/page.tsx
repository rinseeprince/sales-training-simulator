'use client'

import { useAuth } from '@/components/auth-provider'
import { MainLayout } from '@/components/layout/main-layout'
import { PostCallReview } from '@/components/pages/post-call-review'

export default function ReviewPage() {
  const { user } = useAuth()

  if (!user) {
    return null
  }

  return (
    <MainLayout>
      <PostCallReview />
    </MainLayout>
  )
}
