'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import styles from './Topbar.module.css';

export default function Topbar() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');

  useEffect(() => {
    async function cargarUsuario() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      try {
        const res = await fetch('/api/auth/perfil', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.json().catch(() => null);
        if (body?.profile?.nombre) {
          setNombre(body.profile.nombre);
        }
      } catch {
        // Silencioso: el nombre es opcional en la UI.
      }
    }

    cargarUsuario();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/');
  }

  const iniciales = nombre
    ? nombre.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  return (
    <header className={styles.topbar}>
      <strong className={styles.brand}>
        Sistema Web de Control de Asistencia y Evidencias
      </strong>

      <div className={styles.userArea}>
        <div className={styles.avatar} aria-hidden="true">
          {iniciales}
        </div>
        <span className={styles.userName}>{nombre || 'Cargando...'}</span>
        {/* <button
          type="button"
          className={styles.logoutButton}
          onClick={handleLogout}
          aria-label="Cerrar sesión"
        >
          Salir
        </button> */}
      </div>
    </header>
  );
}
