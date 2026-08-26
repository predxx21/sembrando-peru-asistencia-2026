"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fetchConToken } from "@/lib/api/client";
import { getHistoryActivities } from "@/components/history/historyData";
import { ESTADO_LABEL } from "@/lib/utils/estado";
import styles from "./PanelVoluntario.module.css";

const STATUS_CONFIG = {
  aprobado: { label: ESTADO_LABEL.aprobado, className: "badgeApproved" },
  pendiente: { label: ESTADO_LABEL.pendiente, className: "badgePending" },
  rechazado: { label: ESTADO_LABEL.rechazado, className: "badgeRejected" },
};

function getSaludo() {
  const hora = new Date().getHours();
  if (hora >= 5 && hora < 12) return "¡Buenos días";
  if (hora >= 12 && hora < 19) return "¡Buenas tardes";
  return "¡Buenas noches";
}

export default function VolunteerDashboard() {
  const [nombre, setNombre] = useState("");
  const [area, setArea] = useState("");
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const perfilRes = await fetchConToken("/api/auth/perfil");
        const perfil = await perfilRes.json().catch(() => null);

        if (cancelled) return;
        setNombre(perfil?.profile?.nombre || "");
        setArea(perfil?.profile?.area?.nombre || "");

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

  const totalHours = useMemo(
    () => activities.reduce((total, a) => total + a.hours, 0),
    [activities]
  );
  const approvedHours = useMemo(
    () =>
      activities
        .filter((a) => a.status === "aprobado")
        .reduce((total, a) => total + a.hours, 0),
    [activities]
  );
  const pendingHours = useMemo(
    () =>
      activities
        .filter((a) => a.status === "pendiente")
        .reduce((total, a) => total + a.hours, 0),
    [activities]
  );
  const rejectedCount = useMemo(
    () => activities.filter((a) => a.status === "rechazado").length,
    [activities]
  );

  const recent = useMemo(() => activities.slice(0, 4), [activities]);
  const saludo = useMemo(() => getSaludo(), []);

  return (
    <div className={styles.dashboard}>
      {/* Hero Banner */}
      <section className={styles.heroBanner}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            {nombre ? `${nombre}, bienvenido a tu panel` : "Bienvenido a tu panel"}
          </h1>
          <p className={styles.heroSubtitle}>
            Gestiona tus horas de voluntariado, revisa tus avances y mantén tu historial al día.
          </p>
        </div>
        <div className={styles.heroActions}>
          <Link href="/formulario-horas" className={styles.heroCtaBtn}>
            <span>＋</span> Registrar Horas
          </Link>
        </div>
      </section>

      {/* Tarjetas KPI */}
      <section className={styles.kpiGrid}>
        <article className={styles.kpiCard}>
          <div className={styles.kpiHead}>
            <span className={styles.kpiLabel}>Total Horas</span>
            <div className={`${styles.kpiIcon} ${styles.kpiIconTotal}`}>⏱️</div>
          </div>
          <div className={styles.kpiValue}>{totalHours.toFixed(1)} h</div>
          <span className={styles.kpiSubtext}>Registradas en la plataforma</span>
        </article>

        <article className={styles.kpiCard}>
          <div className={styles.kpiHead}>
            <span className={styles.kpiLabel}>Aprobadas</span>
            <div className={`${styles.kpiIcon} ${styles.kpiIconApproved}`}>✅</div>
          </div>
          <div className={styles.kpiValue}>{approvedHours.toFixed(1)} h</div>
          <span className={styles.kpiSubtext}>Verificadas por el área</span>
        </article>

        <article className={styles.kpiCard}>
          <div className={styles.kpiHead}>
            <span className={styles.kpiLabel}>Pendientes</span>
            <div className={`${styles.kpiIcon} ${styles.kpiIconPending}`}>⏳</div>
          </div>
          <div className={styles.kpiValue}>{pendingHours.toFixed(1)} h</div>
          <span className={styles.kpiSubtext}>En revisión por coordinación</span>
        </article>

        <article className={styles.kpiCard}>
          <div className={styles.kpiHead}>
            <span className={styles.kpiLabel}>Observadas</span>
            <div className={`${styles.kpiIcon} ${styles.kpiIconRejected}`}>⚠️</div>
          </div>
          <div className={styles.kpiValue}>{rejectedCount}</div>
          <span className={styles.kpiSubtext}>Requieren tu atención</span>
        </article>
      </section>

      {/* Grid Principal */}
      <div className={styles.mainLayout}>
        {/* Columna Izquierda: Actividad Reciente */}
        <section className={styles.contentCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              Actividad Reciente
            </h2>
            <Link href="/historial" className={styles.viewAllLink}>
              Ver historial completo ›
            </Link>
          </div>

          {loading ? (
            <div className={styles.loadingState}>Cargando tus actividades recientes...</div>
          ) : error ? (
            <div className={styles.loadingState} style={{ color: "#D64545" }}>{error}</div>
          ) : recent.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📂</div>
              <p className={styles.activityTitle}>Aún no has registrado actividades</p>
              <span className={styles.activityMeta}>
                Empieza registrando tu primera jornada de voluntariado.
              </span>
              <Link
                href="/formulario-horas"
                className={styles.heroCtaBtn}
                style={{ marginTop: "8px", background: "#0F766E", color: "#FFFFFF" }}
              >
                Registrar Horas Ahora
              </Link>
            </div>
          ) : (
            <div className={styles.activityList}>
              {recent.map((activity) => {
                const status = STATUS_CONFIG[activity.status] || STATUS_CONFIG.pendiente;

                return (
                  <div key={activity.id} className={styles.activityItem}>
                    <div className={styles.activityMain}>
                      <div className={styles.activityIconBox}>📅</div>
                      <div className={styles.activityInfo}>
                        <span className={styles.activityTitle}>{activity.title}</span>
                        <span className={styles.activityMeta}>{activity.date}</span>
                      </div>
                    </div>

                    <div className={styles.activityRight}>
                      <span className={styles.activityHours}>{activity.hours.toFixed(1)} hrs</span>
                      <span className={`${styles.statusBadge} ${styles[status.className]}`}>
                        <span className={styles.badgeDot} />
                        {status.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Columna Derecha: GUÍA RÁPIDA (reemplaza Meta Mensual + Acciones Rápidas) */}
        <aside className={styles.sideWidgets}>
          <div className={styles.guideCard}>
            <h3 className={styles.guideTitle}>Guía Rápida</h3>

            <div className={styles.guideItem}>
              <div className={styles.guideIcon}>⏱️</div>
              <div className={styles.guideContent}>
                <h4>Registrar horas</h4>
                <p>
                  Ve a <strong>Registrar Horas</strong> y usa el cronómetro para
                  registrar tu tiempo de voluntariado. Recuerda añadir una descripción clara.
                </p>
              </div>
            </div>

            <div className={styles.guideItem}>
              <div className={styles.guideIcon}>📜</div>
              <div className={styles.guideContent}>
                <h4>Ver historial</h4>
                <p>
                  Revisa todas tus actividades en el <strong>Historial</strong>.
                  Puedes ver el detalle de cada jornada y su estado de aprobación.
                </p>
              </div>
            </div>

            <div className={styles.guideItem}>
              <div className={styles.guideIcon}>⚙️</div>
              <div className={styles.guideContent}>
                <h4>Editar perfil</h4>
                <p>
                  Actualiza tus datos personales en <strong>Editar Perfil</strong>.
                  Mantén tu información al día para una mejor comunicación.
                </p>
              </div>
            </div>

            <div className={styles.guideFooter}>
              <Link href="/formulario-horas" className={styles.guideCta}>
                Comenzar ahora →
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}