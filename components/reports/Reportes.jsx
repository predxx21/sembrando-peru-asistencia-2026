"use client";

import { useEffect, useMemo, useState } from "react";
import ExportReportModal from "./ExportarReporte";
import { getReportes } from "./reportesData";
import styles from "./Reportes.module.css";

const ITEMS_PER_PAGE = 10;

// Formatea un número con separador de miles (es-PE), p.ej. "12,482".
function formatNumber(value) {
  return Number(value || 0).toLocaleString("es-PE");
}

// Gráfico de línea simple (SVG) alimentado por las horas aprobadas por mes.
function MonthlyHoursChart({ data }) {
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

// Tarjeta de resumen: métrica simple o barra de progreso (hito).
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
        <small className={styles.trendNeutral}>{stat.detail}</small>
      </div>
    </article>
  );
}

// Paginación real: siempre muestra la primera y la última página, más una
// ventana alrededor de la página actual.
function Pagination({ currentPage, totalPages, onPageChange }) {
  const ventana = 2;
  const pages = [];

  for (let p = 1; p <= totalPages; p++) {
    if (
      p === 1 ||
      p === totalPages ||
      Math.abs(p - currentPage) <= ventana
    ) {
      pages.push(p);
    }
  }

  const items = [];
  let anterior = 0;
  pages.forEach((p) => {
    if (p - anterior > 1) {
      items.push(
        <span key={`ellipsis-${anterior}-${p}`} className={styles.pageEllipsis}>
          ...
        </span>
      );
    }
    items.push(
      <button
        key={p}
        type="button"
        className={p === currentPage ? styles.pageActive : ""}
        onClick={() => onPageChange(p)}
      >
        {p}
      </button>
    );
    anterior = p;
  });

  return (
    <div className={styles.pagination}>
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        ‹
      </button>
      {items}
      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        ›
      </button>
    </div>
  );
}

export default function ReportsDashboard() {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [reportes, setReportes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    getReportes()
      .then((data) => {
        if (!cancelled) setReportes(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const voluntarios = reportes?.voluntarios ?? [];

  // Las tarjetas de resumen salen de los datos reales (stats del endpoint).
  const summaryStats = useMemo(() => {
    const stats = reportes?.stats;
    if (!stats) return [];

    return [
      {
        id: "totalHours",
        type: "metric",
        label: "Total de Horas Aprobadas",
        value: formatNumber(stats.totalHoras),
        detail: "Horas aprobadas",
      },
      {
        id: "activeVolunteers",
        type: "metric",
        label: "Voluntarios Activos",
        value: formatNumber(stats.voluntariosActivos),
        detail: "Últimos 30 días",
      },
      {
        id: "avgHours",
        type: "metric",
        label: "Promedio por Voluntario",
        value: String(stats.promedioHoras),
        detail: "Horas aprobadas",
      },
      {
        id: "milestone",
        type: "progress",
        label: "Hito del Proyecto",
        percent: stats.percent,
        detail: `${stats.percent}% de la Meta`,
        goal: `Meta de ${formatNumber(stats.meta)} horas`,
      },
    ];
  }, [reportes]);

  // Búsqueda por nombre sobre los datos reales.
  const filteredVolunteers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return voluntarios;
    return voluntarios.filter((v) =>
      v.nombre.toLowerCase().includes(query)
    );
  }, [search, voluntarios]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredVolunteers.length / ITEMS_PER_PAGE)
  );

  const paginatedVolunteers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredVolunteers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredVolunteers, currentPage]);

  // Si una búsqueda/actualización deja la página actual fuera de rango, volver a la 1.
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [currentPage, totalPages]);

  const yearBadge = reportes?.porMes?.length
    ? String(reportes.porMes[reportes.porMes.length - 1].year)
    : String(new Date().getFullYear());

  if (loading) {
    return <p className={styles.loading}>Cargando reportes...</p>;
  }

  if (error?.status === 403) {
    return (
      <div className={styles.reportsPage}>
        <div className={styles.emptyState}>
          <strong>Acceso restringido a coordinadores.</strong>
          <p>
            Inicia sesión con una cuenta de administrador para ver los reportes.
          </p>
        </div>
      </div>
    );
  }

  if (error || !reportes) {
    return (
      <div className={styles.reportsPage}>
        <div className={styles.emptyState}>
          <strong>No se pudieron cargar los reportes.</strong>
          <p>{error?.message || "Inténtalo de nuevo más tarde."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.reportsPage}>
      <header className={styles.pageHeader}>
        <div>
          <h1>Reportes Consolidados</h1>
          <p>
            Revisar el impacto organizacional y la distribución de voluntarios.
          </p>
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
        {summaryStats.map((stat) => (
          <SummaryCard stat={stat} key={stat.id} />
        ))}
      </section>

      <section className={styles.insightsGrid}>
        <article className={styles.chartCard}>
          <div className={styles.chartCardHeader}>
            <h2>Horas Aprobadas por Mes</h2>

            <span className={styles.yearBadge}>
              <i className={styles.yearDot} /> {yearBadge}
            </span>
          </div>

          <MonthlyHoursChart data={reportes.porMes} />
        </article>

        <article className={styles.contributorsCard}>
          <h2>Principales Contribuyentes</h2>

          <ul className={styles.contributorsList}>
            {reportes.contribuyentes.map((contributor) => (
              <li key={contributor.id}>
                <i
                  className={styles.avatar}
                  style={{ background: contributor.avatarColor }}
                >
                  {contributor.iniciales}
                </i>

                <div className={styles.contributorInfo}>
                  <strong>{contributor.name}</strong>
                  <small>{contributor.context}</small>
                </div>

                <div className={styles.contributorMeta}>
                  <span className={styles.contributorHours}>
                    {contributor.horas}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          {reportes.contribuyentes.length === 0 && (
            <p className={styles.emptyState}>
              Aún no hay contribuyentes con horas aprobadas.
            </p>
          )}
        </article>
      </section>

      <div className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <h2>Registro Detallado de Voluntarios</h2>

          <div className={styles.searchField}>
            <span>⌕</span>
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        <div className={`${styles.tableRow} ${styles.tableRowHead}`}>
          <span>Nombre del Voluntario</span>
          <span>Nº de Registros</span>
          <span>Total de Horas</span>
          <span>Última Actividad</span>
        </div>

        {paginatedVolunteers.map((volunteer) => (
          <div className={styles.tableRow} key={volunteer.id}>
            <span className={styles.volunteerCell}>
              <i
                className={styles.avatar}
                style={{ background: volunteer.avatarColor }}
              >
                {volunteer.iniciales}
              </i>
              <strong>{volunteer.nombre}</strong>
            </span>

            <span>{volunteer.registros}</span>

            <span>
              <i className={styles.hoursBadge}>{volunteer.horas} hrs</i>
            </span>

            <span>{volunteer.ultimaActividad}</span>
          </div>
        ))}

        {paginatedVolunteers.length === 0 && (
          <div className={styles.emptyState}>
            {search
              ? `No se encontraron voluntarios para "${search}".`
              : "Aún no hay horas aprobadas para mostrar."}
          </div>
        )}

        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      <ExportReportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        data={reportes.voluntarios}
      />
    </div>
  );
}
