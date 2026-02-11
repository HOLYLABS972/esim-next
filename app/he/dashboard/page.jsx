import { Suspense } from 'react'
import Dashboard from '../../../src/components/Dashboard'
import Loading from '../../../src/components/Loading'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'לוח בקרה - תוכניות eSIM',
  description: 'נהל את תוכניות eSIM שלך, צפה בשימוש וגש להגדרות החשבון שלך.',
  keywords: ['לוח בקרה eSIM', 'ניהול חשבון', 'מעקב שימוש'],
  openGraph: {
    title: 'לוח בקרה - תוכניות eSIM',
    description: 'נהל את תוכניות eSIM שלך, צפה בשימוש וגש להגדרות החשבון שלך.',
    url: '/he/dashboard',
  },
  alternates: {
    canonical: '/he/dashboard',
  },
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Dashboard />
    </Suspense>
  )
}
