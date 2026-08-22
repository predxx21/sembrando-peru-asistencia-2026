'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { fetchConToken } from '@/lib/api/client';
import Cronometro from './Cronometro';
import styles from './RegistrarHoras.module.css';

const META_MENSUAL = 30;

export default function FormularioHoras() {
  const router = useRouter();
  const [sesion, setSesion] = useState(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);
  const [horasMes, setHorasMes] = useState(0);
  const [mensaje, setMensaje] = useState('');

  // Cargar sesión activa al montar
  useEffect(() => {
    let active = true;

    async function cargarSesionActiva() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      try {
        const res = await fetch('/api/registros/sesion-activa', {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) return;

        if (active && body.data) {
          setSesion(body.data);
        }
      } catch {
        // Silencioso: no bloquea si falla
      } finally {
        if (active) setCargandoSesion(false);
      }
    }

    cargarSesionActiva();
    return () => {
      active = false;
    };
  }, []);

  // Carga las horas aprobadas del mes
  useEffect(() => {
    let active = true;

    async function cargarHorasMes() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      try {
        const res = await fetch('/api/registros?scope=mine', {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) return;

        const ahora = new Date();
        const total = (body.data || []).reduce((sum, r) => {
          const fecha = new Date(r.fecha);
          const enEsteMes =
            fecha.getMonth() === ahora.getMonth() &&
            fecha.getFullYear() === ahora.getFullYear();
          if (r.estado === 'aprobado' && enEsteMes) {
            return sum + (Number(r.horas) || 0);
          }
          return sum;
        }, 0);

        if (active) setHorasMes(Math.round(total * 10) / 10);
      } catch {
        // Silencioso
      }
    }

    cargarHorasMes();
    return () => {
      active = false;
    };
  }, []);

  const handleIniciar = async (descripcion) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error('No hay sesión activa. Inicia sesión nuevamente.');

    const res = await fetch('/api/registros/sesion-activa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ descripcion }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Error al iniciar la sesión.');
    }

    const body = await res.json();
    setSesion(body.data);
    setMensaje('✅ Jornada iniciada. El cronómetro está en marcha.');
    return body.data;
  };

  const handleTerminar = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error('No hay sesión activa. Inicia sesión nuevamente.');

    const res = await fetch('/api/registros/sesion-activa', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Error al terminar la sesión.');
    }

    setSesion(null);
    setMensaje('✅ Jornada finalizada. Horas registradas automáticamente.');
    setTimeout(() => {
      router.push('/historial');
    }, 3000);
  };

  if (cargandoSesion) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner} aria-hidden="true"></div>
        <p className={styles.loadingText}>Cargando...</p>
      </div>
    );
  }

  return (
    <div className={styles.formPage}>
      <header className={styles.pageHeader}>
        <h1>Registrar Jornada de Voluntariado</h1>
        <p>
          Usa el cronómetro para registrar tu tiempo de trabajo. Presiona "Iniciar"
          al comenzar y "Terminar" al finalizar.
        </p>
      </header>

      <div className={styles.formCard}>
        <Cronometro
          sesionInicial={sesion}
          onIniciar={handleIniciar}
          onTerminar={handleTerminar}
        />

        {mensaje && <p className={styles.mensaje}>{mensaje}</p>}
      </div>

      <section className={styles.infoGrid}>
        <article className={styles.infoCard}>
          <div className={styles.infoIcon}>ⓘ</div>
          <div>
            <h3>Información Importante</h3>
            <p>
              El cronómetro registra el tiempo exacto. Asegúrate de presionar
              "Terminar" al concluir tu jornada.
            </p>
          </div>
        </article>

        <article className={styles.infoCard}>
          <div className={styles.infoIcon}>⇲</div>
          <div>
            <h3>Tu Historial</h3>
            <p>
              {horasMes > 0
                ? `Llevas ${horasMes} horas aprobadas este mes.`
                : 'Aún no tienes horas aprobadas este mes. Registra tus actividades para acumular horas.'}
            </p>
          </div>
        </article>
      </section>
    </div>
  );
}