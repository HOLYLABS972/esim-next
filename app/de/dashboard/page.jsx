import { Suspense } from 'react'
import Dashboard from '../../../src/components/Dashboard'
import Loading from '../../../src/components/Loading'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Dashboard - eSIM-Pläne',
  description: 'Verwalten Sie Ihre eSIM-Pläne, sehen Sie die Nutzung ein und greifen Sie auf Ihre Kontoeinstellungen zu.',
  keywords: ['eSIM Dashboard', 'Kontoverwaltung', 'Nutzungsverfolgung'],
  openGraph: {
    title: 'Dashboard - eSIM-Pläne',
    description: 'Verwalten Sie Ihre eSIM-Pläne, sehen Sie die Nutzung ein und greifen Sie auf Ihre Kontoeinstellungen zu.',
    url: '/de/dashboard',
  },
  alternates: {
    canonical: '/de/dashboard',
  },
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Dashboard />
    </Suspense>
  )
}
