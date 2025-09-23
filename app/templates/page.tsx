'use client'

import { TemplateBrowser } from '@/components/ui/template-browser'
import { MainLayout } from '@/components/layout/main-layout'

export default function TemplatesPage() {
  return (
    <MainLayout>
      <TemplateBrowser showQuickStart={true} />
    </MainLayout>
  )
}