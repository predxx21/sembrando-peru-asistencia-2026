'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirigir al login porque ya no usamos Google
    router.replace('/');
  }, [router]);

  return (
    <main className="auth-callback-page">
      <section className="auth-callback-card">
        <img src="/images/sembrando-peru-logo.jfif" alt="Sembrando Perú" />
        <h1>Redirigiendo...</h1>
        <p>Volviendo al inicio de sesión.</p>
      </section>
    </main>
  );
}
