import { Suspense } from 'react'
import Providers from '../src/components/Providers'
import LanguageWrapper from '../src/components/LanguageWrapper'
import { BrandProvider } from '../src/contexts/BrandContext'
import SimpleFooter from '../src/components/SimpleFooter'
// Navbar removed
// import AppBanner from '../src/components/AppBanner'
import './globals.css'
import './rtl.css'

// Config service listeners removed to avoid MongoDB connection errors on client side
// Real-time API key updates are now handled via environment variables

export const metadata = {
  title: {
    default: 'Best eSIM Plans for Backpackers, Travelers & Digital Nomads | RoamJet',
    template: '%s | RoamJet'
  },
  description: 'Perfect eSIM plans for backpackers, travelers, and digital nomads. Compare Airalo vs RoamJet vs eSIMo. Global data connectivity in 200+ countries with instant activation.',
  keywords: [
    'eSIM plans backpackers',
    'eSIM travelers',
    'digital nomads eSIM',
    'Airalo vs RoamJet',
    'RoamJet vs eSIMo',
    'best eSIM for travelers',
    'backpacker mobile data',
    'nomad internet plans',
    'travel eSIM comparison',
    'global eSIM plans',
    'instant eSIM activation',
    'worldwide mobile data',
    'eSIM',
    'data plans',
    'international roaming',
    'travel internet',
    'global connectivity',
    'mobile data'
  ],
  authors: [{ name: 'RoamJet Team' }],
  creator: 'RoamJet',
  publisher: 'RoamJet',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://www.roamjet.net'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'Best eSIM Plans for Backpackers, Travelers & Digital Nomads | RoamJet',
    description: 'Perfect eSIM plans for backpackers, travelers, and digital nomads. Compare Airalo vs RoamJet vs eSIMo. Global data connectivity in 200+ countries.',
    siteName: 'RoamJet',
    images: [
      {
        url: '/images/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'RoamJet - Best eSIM Plans for Travelers',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Best eSIM Plans for Backpackers, Travelers & Digital Nomads | RoamJet',
    description: 'Perfect eSIM plans for backpackers, travelers, and digital nomads. Compare Airalo vs RoamJet vs eSIMo. Global data connectivity in 200+ countries.',
    images: ['/images/og-image.svg'],
  },
  icons: {
    icon: [
      { url: '/images/logo_icon/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/images/logo_icon/favicon.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/images/logo_icon/ioslogo.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      {
        rel: 'mask-icon',
        url: '/images/logo_icon/logo.png',
        color: '#468BE6',
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
    yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION,
    yahoo: process.env.NEXT_PUBLIC_YAHOO_VERIFICATION,
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="ru" className="dark" data-theme="dark" style={{backgroundColor: '#111827'}}>
      <head>
        <meta charSet="utf-8" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/images/logo_icon/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/images/logo_icon/ioslogo.png" />
        <meta name="theme-color" content="#468BE6" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        
        {/* hreflang tags for multilingual SEO */}
        <link rel="alternate" href="https://esim.romajet.net" hrefLang="x-default" />
        <link rel="alternate" href="https://esim.romajet.net" hrefLang="en" />
        <link rel="alternate" href="https://es.romajet.net" hrefLang="es" />
        <link rel="alternate" href="https://fr.romajet.net" hrefLang="fr" />
        <link rel="alternate" href="https://de.romajet.net" hrefLang="de" />
        <link rel="alternate" href="https://ar.romajet.net" hrefLang="ar" />
        <link rel="alternate" href="https://ru.romajet.net" hrefLang="ru" />
        <link rel="alternate" href="https://he.romajet.net" hrefLang="he" />
        
        {/* Yandex Passport SDK for autofill functionality */}
        <script src="https://yastatic.net/s3/passport-sdk/autofill/v1/sdk-suggest-with-polyfills-latest.js"></script>
        
        {/* Yandex Passport SDK for token handling */}
        <script src="https://yastatic.net/s3/passport-sdk/autofill/v1/sdk-suggest-token-with-polyfills-latest.js"></script>
        
        {/* Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "RoamJet",
              "url": (process.env.NEXT_PUBLIC_BASE_URL || "http://esim.globalbankaccounts.ru"),
              "logo": `${process.env.NEXT_PUBLIC_BASE_URL || "http://esim.globalbankaccounts.ru"}/images/logo_icon/logo.png`,
              "description": "Global eSIM plans for travelers, backpackers, and digital nomads. Instant activation in 200+ countries.",
              "sameAs": [
                "https://twitter.com/roamjet",
                "https://facebook.com/roamjet"
              ],
              "contactPoint": {
                "@type": "ContactPoint",
                "contactType": "customer service",
                "availableLanguage": ["English", "Spanish", "French", "German", "Arabic", "Hebrew", "Russian"]
              }
            })
          }}
        />
      </head>
      <body className="flex flex-col min-h-screen bg-gray-900 text-white">
        <Providers>
          <Suspense fallback={<div className="bg-gray-900 flex flex-col min-h-screen"><main className="flex-grow" /></div>}>
            <BrandProvider>
              <LanguageWrapper>
                <div className="bg-white dark:bg-gray-900 flex flex-col min-h-screen transition-colors">
                  {/* <AppBanner /> */}
                  <main className="flex-grow">
                    {children}
                  </main>
                  <SimpleFooter />
                </div>
              </LanguageWrapper>
            </BrandProvider>
          </Suspense>
        </Providers>
      </body>
    </html>
  )
}
