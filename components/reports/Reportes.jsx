"use client";

import { useMemo, useState } from "react";
import ExportReportModal from "./ExportarReporte";
import styles from "./Reportes.module.css";

const SUMMARY_STATS = [
  {
    id: "totalHours",
    type: "metric",
    label: "Total de Horas Acumuladas",
    value: "12,482",
    trend: "up",
    detail: "+12%",
  },
  {
    id: "activeVolunteers",
    type: "metric",
    label: "Voluntarios Activos",
    value: "342",
    trend: "up",
    detail: "+4%",
  },
  {
    id: "avgHours",
    type: "metric",
    label: "Promedio de Horas por Voluntario",
    value: "36.5",
    trend: "neutral",
    detail: "Fijo",
  },
  {
    id: "milestone",
    type: "progress",
    label: "Hito del Proyecto",
    percent: 82,
    detail: "82% de la Meta",
    goal: "Meta de 15k",
  },
];

const MONTHLY_HOURS = [
  { month: "Ene", value: 1200 },
  { month: "Feb", value: 1550 },
  { month: "Mar", value: 1400 },
  { month: "Abr", value: 1980 },
  { month: "May", value: 2260 },
  { month: "Jun", value: 2650 },
];

const TOP_CONTRIBUTORS = [
  {
    id: "sarah-jenkins",
    name: "Sarah Jenkins",
    initials: "SJ",
    avatarColor: "#2f6fed",
    context: "Proyecto Alpha",
    hours: "248h",
    tag: "TOP 1%",
    tagColor: "#2f9e6f",
  },
  {
    id: "robert-chen",
    name: "Robert Chen",
    initials: "RC",
    avatarColor: "#2f9e6f",
    context: "Logística",
    hours: "212h",
    tag: "CONFIABLE",
    tagColor: "#2f6fed",
  },
  {
    id: "amara-okoro",
    name: "Amara Okoro",
    initials: "AO",
    avatarColor: "#e08a2c",
    context: "Educación",
    hours: "195h",
    tag: "LÍDER",
    tagColor: "#e08a2c",
  },
  {
    id: "marcus-vane",
    name: "Marcus Vane",
    initials: "MV",
    avatarColor: "#8b7ce0",
    context: "Soporte Técnico",
    hours: "188h",
    tag: "REGULAR",
    tagColor: "#667281",
  },
];

const VOLUNTEERS = [
  {
    id: "sarah-jenkins",
    name: "Sarah Jenkins",
    initials: "SJ",
    avatarColor: "#2f6fed",
    department: "Proyecto Alpha",
    totalHours: "248.5 hrs",
    lastActivity: "12 Oct, 2023",
  },
  {
    id: "robert-chen",
    name: "Robert Chen",
    initials: "RC",
    avatarColor: "#2f9e6f",
    department: "Logística",
    totalHours: "212.0 hrs",
    lastActivity: "11 Oct, 2023",
  },
  {
    id: "amara-okoro",
    name: "Amara Okoro",
    initials: "AO",
    avatarColor: "#e08a2c",
    department: "Educación",
    totalHours: "195.2 hrs",
    lastActivity: "14 Oct, 2023",
  },
  {
    id: "marcus-vane",
    name: "Marcus Vane",
    initials: "MV",
    avatarColor: "#8b7ce0",
    department: "Soporte Técnico",
    totalHours: "188.0 hrs",
    lastActivity: "09 Oct, 2023",
  },
];

const TOTAL_PAGES = 12;

function MonthlyHoursChart({ data }) {
  const width = 640;
  const height = 220;
  const padding = 24;

  const maxValue = Math.max(...data.map((point) => point.value));

  const points = data.map((point, index) => {
    const x =
      padding +
      (index / (data.length - 1)) * (width - padding * 2);
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
          key={point.month}
          className={styles.chartDot}
          cx={point.x}
          cy={point.y}
          r={4}
        />
      ))}

      {points.map((point) => (
        <text
          key={`${point.month}-label`}
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

function SummaryCard({ stat }) {
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

        <small
          className={
            stat.trend === "up"
              ? styles.trendUp
              : stat.trend === "down"
              ? styles.trendDown
              : styles.trendNeutral
          }
        >
          {stat.trend === "up" ? "↗ " : stat.trend === "down" ? "↘ " : ""}
          {stat.detail}
        </small>
      </div>
    </article>
  );
}

export default function ReportsDashboard() {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const filteredVolunteers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return VOLUNTEERS;

    return VOLUNTEERS.filter(
      (volunteer) =>
        volunteer.name.toLowerCase().includes(query) ||
        volunteer.department.toLowerCase().includes(query)
    );
  }, [search]);

  function goToPage(page) {
    setCurrentPage(Math.min(Math.max(page, 1), TOTAL_PAGES));
  }

  return (
    <div className={styles.reportsPage}>
      <header className={styles.pageHeader}>
        <div>
          <h1>Reportes Consolidados</h1>
          <p>Revisar el impacto organizacional y la distribución de voluntarios.</p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => setIsExportOpen(true)}
          >
            ⬇ Exportar
          </button>
        </div>
      </header>

      <section className={styles.stats}>
        {SUMMARY_STATS.map((stat) => (
          <SummaryCard stat={stat} key={stat.id} />
        ))}
      </section>

      <section className={styles.insightsGrid}>
        <article className={styles.chartCard}>
          <div className={styles.chartCardHeader}>
            <h2>Horas Acumuladas por Mes</h2>

            <span className={styles.yearBadge}>
              <i className={styles.yearDot} /> 2023
            </span>
          </div>

          <MonthlyHoursChart data={MONTHLY_HOURS} />
        </article>

        <article className={styles.contributorsCard}>
          <h2>Principales Contribuyentes</h2>

          <ul className={styles.contributorsList}>
            {TOP_CONTRIBUTORS.map((contributor) => (
              <li key={contributor.id}>
                <i
                  className={styles.avatar}
                  style={{ background: contributor.avatarColor }}
                >
                  {contributor.initials}
                </i>

                <div className={styles.contributorInfo}>
                  <strong>{contributor.name}</strong>
                  <small>{contributor.context}</small>
                </div>

                <div className={styles.contributorMeta}>
                  <span className={styles.contributorHours}>
                    {contributor.hours}
                  </span>
                  <small style={{ color: contributor.tagColor }}>
                    {contributor.tag}
                  </small>
                </div>
              </li>
            ))}
          </ul>

          <button type="button" className={styles.fullListButton}>
            Ver Lista Completa
          </button>
        </article>
      </section>

      <div className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <h2>Registro Detallado de Voluntarios</h2>

          <div className={styles.searchField}>
            <span>⌕</span>
            <input
              type="text"
              placeholder="Buscar por nombre o departamento..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        <div className={`${styles.tableRow} ${styles.tableRowHead}`}>
          <span>Nombre del Voluntario</span>
          <span>Departamento</span>
          <span>Total de Horas</span>
          <span>Última Actividad</span>
          <span className={styles.actionsHead}>Acciones</span>
        </div>

        {filteredVolunteers.map((volunteer) => (
          <div className={styles.tableRow} key={volunteer.id}>
            <span className={styles.volunteerCell}>
              <i
                className={styles.avatar}
                style={{ background: volunteer.avatarColor }}
              >
                {volunteer.initials}
              </i>
              <strong>{volunteer.name}</strong>
            </span>

            <span>{volunteer.department}</span>

            <span>
              <i className={styles.hoursBadge}>{volunteer.totalHours}</i>
            </span>

            <span>{volunteer.lastActivity}</span>

            <span className={styles.actionsCell}>
              <button type="button" className={styles.detailsButton}>
                Detalles
              </button>
            </span>
          </div>
        ))}

        {filteredVolunteers.length === 0 && (
          <div className={styles.emptyState}>
            No se encontraron voluntarios para &quot;{search}&quot;.
          </div>
        )}

        <div className={styles.pagination}>
          <button
            type="button"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            ‹
          </button>

          <button
            type="button"
            className={currentPage === 1 ? styles.pageActive : ""}
            onClick={() => goToPage(1)}
          >
            1
          </button>

          <button
            type="button"
            className={currentPage === 2 ? styles.pageActive : ""}
            onClick={() => goToPage(2)}
          >
            2
          </button>

          <button
            type="button"
            className={currentPage === 3 ? styles.pageActive : ""}
            onClick={() => goToPage(3)}
          >
            3
          </button>

          <span className={styles.pageEllipsis}>...</span>

          <button
            type="button"
            className={currentPage === TOTAL_PAGES ? styles.pageActive : ""}
            onClick={() => goToPage(TOTAL_PAGES)}
          >
            {TOTAL_PAGES}
          </button>

          <button
            type="button"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === TOTAL_PAGES}
          >
            ›
          </button>
        </div>
      </div>

      <ExportReportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
    </div>
  );
}
