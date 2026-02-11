import { Suspense } from 'react'
import Dashboard from '../../../src/components/Dashboard'
import Loading from '../../../src/components/Loading'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Панель управления - планы eSIM',
  description: 'Управляйте своими планами eSIM, просматривайте использование и получайте доступ к настройкам аккаунта.',
  keywords: ['панель управления eSIM', 'управление аккаунтом', 'отслеживание использования'],
  openGraph: {
    title: 'Панель управления - планы eSIM',
    description: 'Управляйте своими планами eSIM, просматривайте использование и получайте доступ к настройкам аккаунта.',
    url: '/ru/dashboard',
  },
  alternates: {
    canonical: '/ru/dashboard',
  },
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Dashboard />
    </Suspense>
  )
}
