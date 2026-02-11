'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../contexts/AuthContext'
import { Toaster } from 'react-hot-toast'
import { useState, useEffect } from 'react'
export default function Providers({ children }) {
  // Create a new QueryClient instance for each render to avoid SSR issues
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  }))

  // Handle chunk loading errors (404 on chunk, wrong MIME type, or app rebuilt – auto-reload once)
  useEffect(() => {
    const RELOAD_KEY = 'chunk_reload_attempt';
    const MAX_RELOADS = 1;

    const tryReload = () => {
      const attempts = parseInt(sessionStorage.getItem(RELOAD_KEY) || '0', 10);
      if (attempts < MAX_RELOADS) {
        sessionStorage.setItem(RELOAD_KEY, String(attempts + 1));
        window.location.reload();
      }
    };

    const handleChunkError = (event) => {
      const error = event.error;
      if (error && error.name === 'ChunkLoadError') {
        event.preventDefault();
        console.warn('ChunkLoadError – app may have been updated. Reloading…');
        tryReload();
      }
    };

    window.addEventListener('error', handleChunkError);

    window.addEventListener('unhandledrejection', (event) => {
      const err = event.reason;
      const msg = err?.message || '';
      if (err && (err.name === 'ChunkLoadError' || msg.includes('Loading chunk') || msg.includes('ChunkLoadError'))) {
        event.preventDefault();
        console.warn('Chunk load failed – reloading…');
        tryReload();
      }
    });

    return () => window.removeEventListener('error', handleChunkError);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  )
}
