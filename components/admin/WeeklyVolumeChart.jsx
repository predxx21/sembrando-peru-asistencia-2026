"use client";

import styles from "./AdminDashboard.module.css";

// Gráfico de barras con el volumen de envíos por día de la última semana.
export default function WeeklyVolumeChart({ data, maxVolume }) {
  // Calcular maxVolume internamente si no se pasa (fallback defensivo)
  const calculatedMaxVolume = Math.max(...data.map((d) => d.value), 1);
  const effectiveMaxVolume = maxVolume ?? calculatedMaxVolume;

  return (
    <article className={styles.chartCard}>
      {data.length > 0 ? (
        <div className={styles.chart}>
          {data.map((item, index) => (
            <div className={styles.chartBarColumn} key={`${item.day}-${index}`}>
              <div
                className={styles.chartBar}
                style={{ height: `${(item.value / effectiveMaxVolume) * 100}%` }}
                title={`${item.value} ${item.value === 1 ? "envío" : "envíos"}`}
                role="img"
                aria-label={`${item.value} ${item.value === 1 ? "envío" : "envíos"} el ${item.day}`}
              />
              <span>{item.day}</span>
            </div>
          ))}
        </div>
      ) : (
        <p>No hay datos de tendencia.</p>
      )}
    </article>
  );
}