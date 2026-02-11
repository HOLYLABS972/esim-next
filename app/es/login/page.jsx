import { Suspense } from 'react';
import Login from '../../../src/components/Login';
import Loading from '../../../src/components/Loading';

export default function SpanishLoginPage() {
  return (
    <div dir="ltr" lang="es">
      <Suspense fallback={<Loading />}>
        <Login />
      </Suspense>
    </div>
  );
}


