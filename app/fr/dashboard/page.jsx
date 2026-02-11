import { Suspense } from 'react'
import Dashboard from '../../../src/components/Dashboard'
import Loading from '../../../src/components/Loading'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Tableau de bord - Plans eSIM',
  description: 'Gérez vos plans eSIM, consultez l\'utilisation et accédez aux paramètres de votre compte.',
  keywords: ['tableau de bord eSIM', 'gestion de compte', 'suivi d\'utilisation'],
  openGraph: {
    title: 'Tableau de bord - Plans eSIM',
    description: 'Gérez vos plans eSIM, consultez l\'utilisation et accédez aux paramètres de votre compte.',
    url: '/fr/dashboard',
  },
  alternates: {
    canonical: '/fr/dashboard',
  },
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Dashboard />
    </Suspense>
  )
}
