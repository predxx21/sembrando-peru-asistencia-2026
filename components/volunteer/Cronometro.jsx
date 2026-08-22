"use client";

import { useState, useEffect } from 'react';
import styles from './Cronometro.module.css';

export default function Cronometro({ sesionInicial, onIniciar, onTerminar }) {
  const [sesion, setSesion] = useState(sesionInicial);
  const [segundos, setSegundos] = useState(0);
  const [descripcion, setDescripcion] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  // Calcular segundos transcurridos desde horaInicioReal
  useEffect(() => {
    if (!sesion?.horaInicioReal) return;

    const inicio = new Date(sesion.horaInicioReal).getTime();

    const intervalo = setInterval(() => {
      const ahora = Date.now();
      const diff = Math.floor((ahora - inicio) / 1000);
      setSegundos(Math.max(0, diff));
    }, 1000);

    return () => clearInterval(intervalo);
  }, [sesion?.horaInicioReal]);

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