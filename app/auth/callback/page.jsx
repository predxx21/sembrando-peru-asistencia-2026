'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isOrganizationEmail } from '@/lib/auth/email';
import { supabase } from '@/lib/supabase/client';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    async function completeGoogleLogin() {
      const code = new URLSearchParams(window.location.search).get('code');

      if (!code) {
        setError('No se recibió una respuesta válida de Google.');
        return;
      }

      const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
      const email = data.user?.email ?? '';

      if (sessionError) {
        setError(sessionError.message);
        return;
      }

      if (!isOrganizationEmail(email)) {
        await supabase.auth.signOut();
        setError('Solo se permiten cuentas con correo @sembrandoperu.org.');
        return;
      }

      const mode = new URLSearchParams(window.location.search).get('mode');
      router.replace(mode === 'registro' ? '/registro?google=1' : '/principal');
    }

    completeGoogleLogin();
  }, [router]);

  return (
    <main className="auth-callback-page">
      <section className="auth-callback-card">
        <img src="/images/sembrando-peru-logo.jfif" alt="Sembrando Perú" />
        <h1>{error ? 'Acceso no autorizado' : 'Conectando con Sembrando Perú...'}</h1>
        <p>{error || 'Estamos verificando tu cuenta de Google.'}</p>
        {error && <Link href="/registro">Volver al registro</Link>}
      </section>
    </main>
  );
}
