'use client';

import { Suspense } from 'react';
import Signup from '../../src/components/Signup';

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <Signup />
    </Suspense>
  );
}
