"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchConToken } from "@/lib/api/client";
import { getHistoryActivities } from "@/components/history/historyData";
import styles from "./PanelVoluntario.module.css";
import { ESTADO_LABEL } from "@/lib/utils/estado";

const STATUS_CONFIG = {
  aprobado: { label: ESTADO_LABEL.aprobado, className: "badgeSuccess" },
  pendiente: { label: ESTADO_LABEL.pendiente, className: "badgePending" },
  rechazado: { label: ESTADO_LABEL.rechazado, className: "badgeRejected" },
};

export default function VolunteerDashboard() {
  const [nombre, setNombre] = useState("");
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Carga las actividades reales del voluntario (vía historyData → /api/registros)
  // y su nombre (vía /api/auth/perfil).
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // El perfil siempre es el de la sesión: el endpoint ya no acepta ?id=.
        const perfilRes = await fetchConToken("/api/auth/perfil");
        const perfil = await perfilRes.json().catch(() => null);

        if (cancelled) return;
        setNombre(perfil?.profile?.nombre || "");

        const historial = await getHistoryActivities();
        if (!cancelled) setActivities(historial);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "No se pudieron cargar tus actividades.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const totalHours = activities.reduce((total, a) => total + a.hours, 0);
  const approvedHours = activities
    .filter((a) => a.status === "aprobado")
    .reduce((total, a) => total + a.hours, 0);
  const pendingHours = activities
    .filter((a) => a.status === "pendiente")
    .reduce((total, a) => total + a.hours, 0);
  const rejectedCount = activities.filter((a) => a.status === "rechazado").length;

  // La API ya devuelve los registros ordenados de más reciente a más antiguo.
  const recent = activities.slice(0, 3);

  return (
    <div className={styles.dashboard}>
      {/* Bienvenida */}
      <header className={styles.welcome}>
        <div>
          <h1>Bienvenido de nuevo{nombre ? `, ${nombre}` : ""}</h1>

          <p>
            Aquí tienes un resumen de tus contribuciones de voluntariado.
          </p>
        </div>
      </header>

      {/* Estadísticas */}
      <section className={styles.stats}>
        <article className={styles.statCard}>
          <div className={styles.statCardHead}>
            <span>Total de horas</span>
            <b>◷</b>
          </div>

          <h2>{totalHours.toFixed(1)}</h2>

          <p>Total registrado desde el ingreso</p>
        </article>

        <article className={styles.statCard}>
          <div className={styles.statCardHead}>
            <span>Aprobadas</span>
            <b>✿</b>
          </div>

          <h2>{approvedHours.toFixed(1)}</h2>

          <p>Horas de voluntariado verificadas</p>
        </article>

        <article className={styles.statCard}>
          <div className={styles.statCardHead}>
            <span>Pendientes</span>
            <b>⌛</b>
          </div>

          <h2>{pendingHours.toFixed(1)}</h2>

          <p>Esperando revisión del coordinador</p>
        </article>

        <article className={styles.statCard}>
          <div className={styles.statCardHead}>
            <span>Rechazadas</span>
            <b>✕</b>
          </div>

          <h2>{rejectedCount}</h2>

          <p>Actividades que debes corregir</p>
        </article>
      </section>

      {/* Actividades y guía */}
      <section className={styles.portalGrid}>
        <div>
          <div className={styles.sectionTitle}>
            <h2>Actividad Reciente</h2>

            <Link href="/historial">
              <span>Ver Todo ›</span>
            </Link>
          </div>

          <div className={styles.tableCard}>
            {/* Encabezado */}
            <div
              className={`${styles.activityRow} ${styles.activityRowHead}`}
            >
              <span>Fecha</span>
              <span>Actividad</span>
              <span>Horas</span>
              <span>Estado</span>
              <span>Acción</span>
            </div>

            {loading && <p className={styles.loadingText}>Cargando actividades...</p>}
            {error && <p className={styles.loadingText}>{error}</p>}
            {!loading && !error && recent.length === 0 && (
              <p className={styles.loadingText}>Aún no tienes actividades registradas.</p>
            )}

            {recent.map((activity) => {
              const status = STATUS_CONFIG[activity.status] || STATUS_CONFIG.pendiente;

              return (
                <div className={styles.activityRow} key={activity.id}>
                  <span>{activity.date}</span>

                  <span>
                    <strong>{activity.title}</strong>
                  </span>

                  <span>{activity.hours.toFixed(1)} hrs</span>

                  <span>
                    <i className={`${styles.badge} ${styles[status.className]}`}>
                      {status.label}
                    </i>
                  </span>

                  <span>
                    <Link href={`/historial/${activity.id}`}>Ver</Link>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Guía de registro */}
        <aside className={styles.evidenceColumn}>
          <h2>Guía de Registro</h2>

          <article className={styles.guideCard}>
            <div className={styles.guideCardBody}>
              <h3>Consejo de Registro</h3>

              <p>
                Usa el cronómetro al iniciar y terminar tu jornada de voluntariado.
                El sistema registrará automáticamente las horas trabajadas.
              </p>

              <Link href="/formulario-horas" className={styles.guideButton}>
                Registrar ahora
              </Link>
            </div>
          </article>
        </aside>
      </section>
    </div>
  );
}