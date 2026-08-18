import { Suspense } from 'react';
import LoginScreen from '@/components/auth/LoginScreen';

export default function HomePage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <LoginScreen />
    </Suspense>
  );
}