import { Suspense } from 'react'
import Dashboard from '../../../src/components/Dashboard'
import Loading from '../../../src/components/Loading'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'لوحة التحكم - خطط eSIM',
  description: 'إدارة خطط eSIM الخاصة بك، عرض الاستخدام والوصول إلى إعدادات الحساب.',
  keywords: ['لوحة تحكم eSIM', 'إدارة الحساب', 'تتبع الاستخدام'],
  openGraph: {
    title: 'لوحة التحكم - خطط eSIM',
    description: 'إدارة خطط eSIM الخاصة بك، عرض الاستخدام والوصول إلى إعدادات الحساب.',
    url: '/ar/dashboard',
  },
  alternates: {
    canonical: '/ar/dashboard',
  },
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Dashboard />
    </Suspense>
  )
}
