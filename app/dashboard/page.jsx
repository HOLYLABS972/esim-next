import { Suspense } from 'react'
import Dashboard from '../../src/components/Dashboard'
import Loading from '../../src/components/Loading'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Dashboard - eSIM Plans',
  description: 'Manage your eSIM plans, view usage, and access your account settings.',
  keywords: ['eSIM dashboard', 'account management', 'usage tracking'],
  openGraph: {
    title: 'Dashboard - eSIM Plans',
    description: 'Manage your eSIM plans, view usage, and access your account settings.',
    url: '/dashboard',
  },
  alternates: {
    canonical: '/dashboard',
  },
}

export default function DashboardPage() {
  return (
    <>
      <Suspense fallback={<Loading />}>
        <Dashboard />
      </Suspense>
      
    </>
  )
}
