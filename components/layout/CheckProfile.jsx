'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function CheckProfile({ children }) {
  const router = useRouter();
  const [verificado, setVerificado] = useState(false);

  useEffect(() => {
    let active = true;

    const verificarPerfil = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.status === 404) {
          // Perfil no encontrado
          router.push('/completar-perfil');
        } else if (!res.ok) {
          // Otro error, pero no redirigimos
          console.warn('Error al verificar perfil:', res.status);
        }
      } catch (error) {
        console.warn('Error de red al verificar perfil:', error);
      } finally {
        if (active) setVerificado(true);
      }
    };

    verificarPerfil();

    return () => { active = false; };
  }, [router]);

  if (!verificado) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Verificando sesión...</p>
      </div>
    );
  }

  return <>{children}</>;
}