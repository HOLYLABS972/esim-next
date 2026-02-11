import { Suspense } from 'react'
import Dashboard from '../../../src/components/Dashboard'
import Loading from '../../../src/components/Loading'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Panel de control - Planes eSIM',
  description: 'Gestiona tus planes eSIM, ve el uso y accede a la configuración de tu cuenta.',
  keywords: ['panel de control eSIM', 'gestión de cuenta', 'seguimiento de uso'],
  openGraph: {
    title: 'Panel de control - Planes eSIM',
    description: 'Gestiona tus planes eSIM, ve el uso y accede a la configuración de tu cuenta.',
    url: '/es/dashboard',
  },
  alternates: {
    canonical: '/es/dashboard',
  },
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Dashboard />
    </Suspense>
  )
}
