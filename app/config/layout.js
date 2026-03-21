import { Suspense } from 'react';
import ConfigLayoutClient from './ConfigLayoutClient';

// Config routes require auth and useSearchParams — do not statically generate at build
export const dynamic = 'force-dynamic';

function ConfigFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

export default function ConfigLayout({ children }) {
  return (
    <Suspense fallback={<ConfigFallback />}>
      <ConfigLayoutClient>{children}</ConfigLayoutClient>
    </Suspense>
  );
}
