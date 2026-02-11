import { Suspense } from 'react'
import ForgotPassword from '../../src/components/ForgotPassword'
import Loading from '../../src/components/Loading'
import AuthRedirect from '../../src/components/AuthRedirect'

export const metadata = {
  title: 'Forgot Password - eSIM Plans',
  description: 'Reset your password for your eSIM Plans account.',
  keywords: ['forgot password', 'reset password', 'eSIM account', 'password recovery'],
  openGraph: {
    title: 'Forgot Password - eSIM Plans',
    description: 'Reset your password for your eSIM Plans account.',
    url: '/forgot-password',
  },
  alternates: {
    canonical: '/forgot-password',
  },
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<Loading />}>
      <AuthRedirect redirectTo="/dashboard">
        <ForgotPassword />
      </AuthRedirect>
    </Suspense>
  )
}
