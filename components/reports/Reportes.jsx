"use client";

import { useEffect, useMemo, useState } from "react";
import ExportReportModal from "./ExportarReporte";
import { getReportes } from "./reportesData";
import WeeklyHoursChart from "./WeeklyHoursChart";
import SummaryCard from "./SummaryCard";
import Pagination from "./Pagination";
import { formatFechaCorta } from "@/lib/utils/fecha";
import styles from "./Reportes.module.css";

const ITEMS_PER_PAGE = 10;

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
  // Son los 4 cards de métricas del Panel de Administración (misma semántica
  // que lib/db/estadisticas.js): pendientes, horas aprobadas, total y
  // voluntarios activos.
  const summaryStats = useMemo(() => {
    const stats = reportes?.stats;
    if (!stats) return [];

    return [
      {
        id: "pending",
        type: "metric",
        label: "Esperando Aprobación",
        value: String(stats.pendientes),
        detail:
          stats.pendientes > 0 ? `${stats.pendientes} pendientes` : "Sin registros",
      },
      {
        id: "approvedHours",
        type: "metric",
        label: "Horas Aprobadas",
        value: String(stats.horasAprobadas),
        detail: `de ${stats.totalHoras} hrs totales`,
      },
      {
        id: "totalHours",
        type: "metric",
        label: "Total de Horas",
        value: String(stats.totalHoras),
        detail: stats.totalHoras > 0 ? "Activo" : "Sin registros",
      },
      {
        id: "activeVolunteers",
        type: "metric",
        label: "Voluntarios Activos",
        value: String(stats.voluntariosActivos),
        detail: "este mes",
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

  // Rango de la semana actual para el badge del gráfico (p.ej. "4 Ago – 10 Ago").
  const rangoSemana = useMemo(() => {
    const semana = reportes?.porSemana;
    if (!semana || semana.length < 2) return "";
    return `${formatFechaCorta(semana[0].fecha)} – ${formatFechaCorta(
      semana[semana.length - 1].fecha
    )}`;
  }, [reportes]);

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
            <h2>Horas Aprobadas por Semana</h2>

            <span className={styles.yearBadge}>
              <i className={styles.yearDot} /> {rangoSemana}
            </span>
          </div>

          <WeeklyHoursChart data={reportes.porSemana} />
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
