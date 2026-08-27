"use client";

import Link from "next/link";
import { formatFechaEs } from "@/lib/utils/fecha";
import { ESTADO_LABEL } from "@/lib/utils/estado";
import { UMBRALES } from "@/lib/constantes";
import styles from "./VerDetalle.module.css";

const STATUS_CONFIG = {
  aprobado: { label: ESTADO_LABEL.aprobado, className: "statusApproved" },
  pendiente: { label: ESTADO_LABEL.pendiente, className: "statusPending" },
  rechazado: { label: ESTADO_LABEL.rechazado, className: "statusRejected" },
  en_curso: { label: "En curso", className: "statusInProgress" },
};

function getAnomaliaBadge(horas) {
  if (horas > UMBRALES.JORNADA_MAXIMA_HORAS) {
    return <span className={styles.alertBadge}>⚠ Jornada mayor a 8h</span>;
  }
  if (horas < UMBRALES.JORNADA_MINIMA_MINUTOS / 60) {
    return <span className={styles.alertBadge}>⚠ Jornada menor a 15min</span>;
  }
  return null;
}

function getEstadoBadge(activity) {
  if (activity.sesionActiva) {
    return (
      <span className={`${styles.statusPill} ${styles.statusInProgress}`}>
        🟢 En curso
      </span>
    );
  }
  const status = STATUS_CONFIG[activity.status] || STATUS_CONFIG.pendiente;
  return (
    <span className={`${styles.statusPill} ${styles[status.className]}`}>
      {status.label}
    </span>
  );
}

function formatearHoraLocal(fechaISO) {
  if (!fechaISO) return "—";
  try {
    return new Date(fechaISO).toLocaleTimeString("es-PE", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return "—";
  }
}

export default function VerDetalle({ activity }) {
  return (
    <div className={styles.detailPage}>
      <Link href="/historial" className={styles.backLink}>
        ← Volver al historial
      </Link>

      {/* Header con estado y fecha */}
      <header className={styles.detailHeader}>
        <div className={styles.statusRow}>
          {getEstadoBadge(activity)}
          <span className={styles.activityDate}>{activity.date}</span>
        </div>
        <h1 className={styles.activityTitle}>{activity.title}</h1>
        <div className={styles.activityMeta}>
          <span className={styles.hoursBadge}>{activity.hours} hrs</span>
          {getAnomaliaBadge(activity.hours)}
        </div>
      </header>

      {/* Grid de dos columnas */}
      <div className={styles.detailGrid}>
        {/* Columna izquierda: Información de la Jornada + Comentario (opcional) */}
        <div className={styles.leftColumn}>
          <article className={styles.detailCard}>
            <h2>Información de la Jornada</h2>
            <dl className={styles.infoList}>
              <div className={styles.infoRow}>
                <dt>Fecha</dt>
                <dd>{activity.date}</dd>
              </div>
              <div className={styles.infoRow}>
                <dt>Hora de Inicio</dt>
                <dd>{activity.startTime || "—"}</dd>
              </div>
              <div className={styles.infoRow}>
                <dt>Hora de Fin</dt>
                <dd>{activity.endTime || "—"}</dd>
              </div>
              {activity.horaInicioReal && (
                <div className={styles.infoRow}>
                  <dt>Iniciado exactamente a las</dt>
                  <dd className={styles.exactTime}>
                    {formatearHoraLocal(activity.horaInicioReal)}
                  </dd>
                </div>
              )}
              <div className={styles.infoRow}>
                <dt>Duración Total</dt>
                <dd className={styles.durationValue}>{activity.hours} horas</dd>
              </div>
            </dl>
          </article>

          {/* Comentario del Coordinador (si existe) */}
          {activity.coordinatorComment && (
            <article className={styles.detailCard}>
              <h2>Comentario del Coordinador</h2>
              <blockquote className={styles.comment}>
                {activity.coordinatorComment}
              </blockquote>
              {activity.reviewedBy && (
                <p className={styles.reviewedBy}>
                  Revisado por: {activity.reviewedBy}
                  {activity.reviewedAt && (
                    <>
                      {" • "}
                      <time dateTime={activity.reviewedAt}>
                        {formatFechaEs(activity.reviewedAt)}
                      </time>
                    </>
                  )}
                </p>
              )}
            </article>
          )}
        </div>

        {/* Columna derecha: Descripción + Estado (cards independientes) */}
        <div className={styles.rightColumn}>
          {/* Card de Descripción */}
          <article className={styles.detailCard}>
            <h2>Descripción</h2>
            <p className={styles.description}>{activity.description}</p>
          </article>

          {/* Card de Estado del Registro */}
          <article className={styles.detailCard}>
            <h2>Estado del Registro</h2>
            <dl className={styles.infoList}>
              <div className={styles.infoRow}>
                <dt>Estado Actual</dt>
                <dd>{getEstadoBadge(activity)}</dd>
              </div>
              {activity.reviewedAt && (
                <div className={styles.infoRow}>
                  <dt>Última Revisión</dt>
                  <dd>{formatFechaEs(activity.reviewedAt)}</dd>
                </div>
              )}
            </dl>

            {/* Si el registro está rechazado, mostramos el bloque dentro de esta misma card */}
            {activity.status === "rechazado" && (
              <div className={styles.rejectedBlock}>
                <p className={styles.rejectedInfo}>
                  Este registro fue rechazado por el coordinador. Puedes corregirlo y
                  reenviarlo para nueva revisión.
                </p>
                <Link
                  href={`/registro-editar/${activity.id}`}
                  className={styles.corregirButton}
                >
                  Corregir y Reenviar
                </Link>
              </div>
            )}
          </article>
        </div>
      </div>
    </div>
  );
}