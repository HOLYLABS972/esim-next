import { Suspense } from 'react';
import Login from '../../../src/components/Login';
import Loading from '../../../src/components/Loading';

export default function FrenchLoginPage() {
  return (
    <div dir="ltr" lang="fr">
      <Suspense fallback={<Loading />}>
        <Login />
      </Suspense>
    </div>
  );
}


