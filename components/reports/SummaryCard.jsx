"use client";

// Tarjeta de resumen: métrica simple o barra de progreso (hito).
import styles from "./Reportes.module.css";

export default function SummaryCard({ stat }) {
  if (stat.type === "progress") {
    return (
      <article className={styles.statCard}>
        <span className={styles.statLabel}>{stat.label}</span>

        <div className={styles.progressTrack}>
          <div
            className={styles.progressFill}
            style={{ width: `${stat.percent}%` }}
          />
        </div>

        <div className={styles.progressFooter}>
          <span>{stat.detail}</span>
          <span>{stat.goal}</span>
        </div>
      </article>
    );
  }

  return (
    <article className={styles.statCard}>
      <span className={styles.statLabel}>{stat.label}</span>

      <div className={styles.statValueRow}>
        <h2>{stat.value}</h2>
        <small className={styles.trendNeutral}>{stat.detail}</small>
      </div>
    </article>
  );
}