"use client";

import { useState, useEffect, useRef } from 'react';
import { UMBRALES } from '@/lib/constantes';
import styles from './Cronometro.module.css';

export default function Cronometro({ sesionInicial, onIniciar, onTerminar }) {
  const [sesion, setSesion] = useState(sesionInicial);
  const [segundos, setSegundos] = useState(0);
  const [descripcion, setDescripcion] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const tiempoBaseRef = useRef(0);
  const inicioPerformanceRef = useRef(0);

  const actualizarTiempoBase = (sesionActual) => {
    if (!sesionActual) {
      tiempoBaseRef.current = 0;
      inicioPerformanceRef.current = performance.now();
      setSegundos(0);
      return;
    }

    // Si el backend envía duracionActual, lo usamos directamente
    if (sesionActual.duracionActual !== undefined && sesionActual.duracionActual !== null) {
      tiempoBaseRef.current = sesionActual.duracionActual;
    } else {
      // Fallback: calcular con Date.now() una sola vez al inicio
      const inicio = new Date(sesionActual.horaInicioReal).getTime();
      const ahora = Date.now();
      const diff = Math.max(0, (ahora - inicio) / 1000);
      tiempoBaseRef.current = diff;
    }

    inicioPerformanceRef.current = performance.now();
    setSegundos(Math.round(tiempoBaseRef.current));
  };

  useEffect(() => {
    actualizarTiempoBase(sesion);
  }, [sesion]);

  useEffect(() => {
    if (!sesion) {
      setSegundos(0);
      return;
    }

    const interval = setInterval(() => {
      const ahora = performance.now();
      const diff = (ahora - inicioPerformanceRef.current) / 1000;
      const total = tiempoBaseRef.current + diff;
      setSegundos(Math.round(total));
    }, 1000);

    return () => clearInterval(interval);
  }, [sesion]);

  const formatearTiempo = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const seg = s % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${seg.toString().padStart(2, '0')}`;
  };

  const handleIniciar = async () => {
    if (!descripcion.trim()) {
      setError('La descripción es obligatoria');
      return;
    }

    setCargando(true);
    setError('');

    try {
      const nueva = await onIniciar(descripcion.trim());
      setSesion(nueva);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const handleTerminar = async () => {
    // M-8: Validación UX en cliente - evitar terminar jornadas muy cortas (< 1 min)
    if (segundos < 5) {
      setError('La jornada debe durar al menos 1 minuto.');
      return;
    }

    setCargando(true);
    try {
      await onTerminar();
      setSesion(null);
      setSegundos(0);
      setDescripcion('');
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  if (sesion) {
    return (
      <div className={styles.container}>
        <div className={styles.timerCard}>
          <div className={styles.timerLabel}>Tiempo transcurrido</div>
          <div className={styles.timer}>{formatearTiempo(segundos)}</div>
          <p className={styles.descripcionActiva}>Sesión en curso: {sesion.descripcion}</p>
          <button
            className={styles.terminarButton}
            onClick={handleTerminar}
            disabled={cargando}
          >
            {cargando ? 'Terminando...' : '⏹ Terminar Jornada'}
          </button>
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.inicioCard}>
        <div className={styles.timerLabel}>Descripción de la actividad</div>
        <textarea
          className={styles.descripcionInput}
          placeholder="Describe brevemente la actividad que vas a realizar..."
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={4}
        />
        <button
          className={styles.iniciarButton}
          onClick={handleIniciar}
          disabled={cargando}
        >
          {cargando ? 'Iniciando...' : '▶ Iniciar Jornada'}
        </button>
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}