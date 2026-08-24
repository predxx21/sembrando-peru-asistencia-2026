'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { fetchConToken } from '@/lib/api/client';
import Cronometro from './Cronometro';
import styles from './RegistrarHoras.module.css';

export default function FormularioHoras() {
  const router = useRouter();
  const [sesion, setSesion] = useState(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);
  const [horasMes, setHorasMes] = useState(0);
  const [mensaje, setMensaje] = useState('');
  const [redirectEnabled, setRedirectEnabled] = useState(false);

  // Función para cargar la sesión activa (reutilizable)
  const cargarSesionActiva = useCallback(async () => {
    try {
      const res = await fetchConToken('/api/registros/sesion-activa');
      if (!res.ok) return;
      const body = await res.json().catch(() => ({}));
      if (body.data) {
        setSesion(body.data);
      }
    } catch {
      // Silencioso: fetchConToken ya maneja 401 → redirect a login
    } finally {
      setCargandoSesion(false);
    }
  }, []);

  // Cargar sesión activa al montar
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (active) await cargarSesionActiva();
    };
    load();
    return () => { active = false; };
  }, [cargarSesionActiva]);

  // Recargar al recuperar el foco de la pestaña (para sincronizar entre pestañas)
  useEffect(() => {
    const onFocus = () => {
      cargarSesionActiva();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [cargarSesionActiva]);

  // Carga las horas aprobadas del mes (desde el historial del usuario)
  useEffect(() => {
    let active = true;

    async function cargarHorasMes() {
      try {
        const res = await fetchConToken('/api/registros?scope=mine&estado=aprobado');
        if (!res.ok) return;
        const body = await res.json();
        const ahora = new Date();
        const año = ahora.getUTCFullYear();
        const mes = ahora.getUTCMonth();

        const total = (body.data || []).reduce((sum, r) => {
          const fecha = new Date(r.fecha);
          const enEsteMes = fecha.getUTCMonth() === mes && fecha.getUTCFullYear() === año;
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
    try {
      const res = await fetchConToken('/api/registros/sesion-activa', {
        method: 'POST',
        body: { descripcion },
      });
      const body = await res.json();
      setSesion(body.data);
      setMensaje('✅ Jornada iniciada. El cronómetro está en marcha.');
      return body.data;
    } catch (err) {
      throw new Error(err.message || 'Error al iniciar la sesión.');
    }
  };

  const handleTerminar = async () => {
    try {
      const res = await fetchConToken('/api/registros/sesion-activa', {
        method: 'PATCH',
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Error al terminar la jornada.');
      }

      // Éxito: mostrar confirmación con botón para ver historial
      // (en lugar de redirect automático que podría perderse si se cierra la pestaña)
      setRedirectEnabled(true);
      setSesion(null);
      setMensaje('✅ Jornada finalizada. Horas registradas automáticamente.');
    } catch (err) {
      setMensaje(`❌ ${err.message}. Intenta de nuevo.`);
      // No reseteamos sesion, el cronómetro sigue activo
    }
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

        {redirectEnabled && (
          <div className={styles.redirectBox}>
            <button
              className={styles.redirectButton}
              onClick={() => router.push('/historial')}
            >
              Ver mi historial →
            </button>
          </div>
        )}
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
