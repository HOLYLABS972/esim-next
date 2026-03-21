import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Authentication - Globalbanka',
  description: 'Sign in to your Globalbanka account to manage your global eSIM plans and travel connectivity.',
  keywords: ['authentication', 'sign in', 'Globalbanka account', 'eSIM authentication', 'email login', 'Google login'],
  openGraph: {
    title: 'Authentication - Globalbanka | Global eSIM Plans',
    description: 'Sign in to your Globalbanka account to manage your global eSIM plans and travel connectivity.',
    url: '/auth',
    images: [
      {
        url: '/images/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'Globalbanka Authentication - Global eSIM Plans',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Authentication - Globalbanka | Global eSIM Plans',
    description: 'Sign in to your Globalbanka account to manage your global eSIM plans and travel connectivity.',
    images: ['/images/og-image.svg'],
  },
  alternates: {
    canonical: '/auth',
  },
};

export default function AuthPage() {
  // Redirect to login page since Auth component has been integrated into Login
  redirect('/login');
}
