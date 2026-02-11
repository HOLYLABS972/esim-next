import { Suspense } from 'react';
import Login from '../../../src/components/Login';
import Loading from '../../../src/components/Loading';

export default function GermanLoginPage() {
  return (
    <div dir="ltr" lang="de">
      <Suspense fallback={<Loading />}>
        <Login />
      </Suspense>
    </div>
  );
}


