import { Suspense } from 'react';
import Login from '../../../src/components/Login';
import Loading from '../../../src/components/Loading';

export default function ArabicLoginPage() {
  return (
    <div dir="rtl" lang="ar">
      <Suspense fallback={<Loading />}>
        <Login />
      </Suspense>
    </div>
  );
}


