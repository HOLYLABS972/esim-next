import { Suspense } from 'react';
import Login from '../../../src/components/Login';
import Loading from '../../../src/components/Loading';

export default function HebrewLoginPage() {
  return (
    <div dir="rtl" lang="he">
      <Suspense fallback={<Loading />}>
        <Login />
      </Suspense>
    </div>
  );
}


