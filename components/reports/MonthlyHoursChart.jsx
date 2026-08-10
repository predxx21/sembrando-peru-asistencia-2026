"use client";

// Gráfico de línea simple (SVG) alimentado por las horas aprobadas por mes.
import styles from "./Reportes.module.css";

export default function MonthlyHoursChart({ data }) {
  const width = 640;
  const height = 220;
  const padding = 24;

  if (!data.length) {
    return (
      <p className={styles.chartEmpty}>
        Aún no hay horas aprobadas para mostrar.
      </p>
    );
  }

  const maxValue = Math.max(...data.map((point) => point.value)) || 1;
  const span = data.length - 1 || 1;

  const points = data.map((point, index) => {
    const x = padding + (index / span) * (width - padding * 2);
    const y =
      height -
      padding -
      (point.value / maxValue) * (height - padding * 2);
    return { ...point, x, y };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${
    height - padding
  } L ${points[0].x} ${height - padding} Z`;

  return (
    <svg
      className={styles.chartSvg}
      viewBox={`0 0 ${width} ${height + 24}`}
      preserveAspectRatio="none"
    >
      <path className={styles.chartArea} d={areaPath} />
      <path className={styles.chartLine} d={linePath} />

      {points.map((point) => (
        <circle
          key={`${point.month}-${point.year}`}
          className={styles.chartDot}
          cx={point.x}
          cy={point.y}
          r={4}
        />
      ))}

      {points.map((point) => (
        <text
          key={`label-${point.month}-${point.year}`}
          className={styles.chartAxisLabel}
          x={point.x}
          y={height + 18}
          textAnchor="middle"
        >
          {point.month}
        </text>
      ))}
    </svg>
  );
}