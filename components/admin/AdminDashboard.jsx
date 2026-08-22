"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { getPendingSubmissions, reviewSubmission } from "./adminData";
import AuditLog from "./AuditLog";
import WeeklyVolumeChart from "./WeeklyVolumeChart";
import { AREAS, UMBRALES } from '@/lib/constantes';
import styles from "./AdminDashboard.module.css";

const ITEMS_PER_PAGE = 6;

export default function AdminDashboard() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [areaFilter, setAreaFilter] = useState(""); // NUEVO: filtro por área
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Estado para tendencia y auditoría (los 4 cards de métricas se movieron
  // a la página de Reportes).
  const [weeklyVolume, setWeeklyVolume] = useState([]);
  const [auditLog, setAuditLog] = useState([]);

  // Evita que el useEffect de filtros dispare también en el primer render
  // (la carga inicial la hace el primer useEffect, con deps vacías).
  const isFirstRender = useRef(true);

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  // Cargar tendencia y auditoría en UNA sola petición. El endpoint sigue
  // devolviendo también las stats, pero ya no se muestran aquí.
  async function cargarTendencias() {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;

    try {
      const res = await fetch('/api/admin/estadisticas', {
        cache: 'no-store',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Error al cargar la tendencia.');

      const body = await res.json();
      if (body.weeklyVolume) setWeeklyVolume(body.weeklyVolume);
      if (body.auditLog) setAuditLog(body.auditLog);
    } catch (err) {
      console.error('Error cargando tendencias:', err);
    }
  }

  // Cargar la primera página de registros (filtro pendiente por defecto)
  async function cargarInicial() {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      setDataError('No hay sesión activa.');
      setLoading(false);
      return;
    }

    try {
      const res = await getPendingSubmissions({ limit: ITEMS_PER_PAGE, estado: 'pendiente' });
      if (res) {
        setSubmissions(res.items);
        setTotal(res.total);
      }
    } catch (err) {
      setDataError(err.message || 'No se pudieron cargar los registros.');
    } finally {
      setLoading(false);
      cargarTendencias();
    }
  }

  // Cargar con filtros (búsqueda, fechas, área) - se dispara cuando cambian los filtros
  async function cargarConFiltros() {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;

    const filtros = {
      page,
      limit: ITEMS_PER_PAGE,
      busqueda: search || undefined,
      desde: dateFrom || undefined,
      hasta: dateTo || undefined,
      area: areaFilter || undefined, // NUEVO
    };

    try {
      const res = await getPendingSubmissions(filtros);
      if (res) {
        setSubmissions(res.items);
        setTotal(res.total);
      }
    } catch (err) {
      setDataError(err.message || 'No se pudieron cargar los registros.');
    }
  }

  // Carga inicial
  useEffect(() => {
    cargarInicial();
  }, []);

  // Carga con filtros (pero NO en el primer render, para evitar doble llamada)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    // Resetear página al cambiar filtros
    setPage(1);
    cargarConFiltros();
  }, [search, dateFrom, dateTo, areaFilter]);

  // Al cambiar de página
  useEffect(() => {
    if (!isFirstRender.current) {
      cargarConFiltros();
    }
  }, [page]);

  // Obtener badge de anomalía
  const getAnomaliaBadge = (horas) => {
    if (horas > UMBRALES.JORNADA_MAXIMA_HORAS) {
      return (
        <span className={styles.alertBadge}>⚠️ +8h</span>
      );
    }
    if (horas < UMBRALES.JORNADA_MINIMA_MINUTOS / 60) {
      return (
        <span className={styles.alertBadge}>⚠️ {'<15min'}</span>
      );
    }
    return null;
  };

  // Aprobar / Rechazar desde la tabla (auditoría)
  async function revisar(id, estado) {
    const motivo = estado === 'rechazado'
      ? prompt('Indica el motivo del rechazo (obligatorio):')
      : 'Aprobado por el coordinador (auditoría).';

    if (estado === 'rechazado' && !motivo?.trim()) {
      return;
    }

    try {
      await reviewSubmission(id, estado, motivo);
      // Actualizar estado local sin recargar
      setSubmissions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: estado } : s))
      );
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner} aria-hidden="true"></div>
        <p>Cargando panel...</p>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <header className={styles.pageHeader}>
        <div>
          <h1>Panel de Coordinación</h1>
          <p>Revisa y audita las jornadas de voluntariado registradas.</p>
        </div>
      </header>

      {/* Filtros */}
      <section className={styles.filtersSection}>
        <div className={styles.filtersRow}>
          <div className={styles.filterGroup}>
            <label htmlFor="search" className={styles.filterLabel}>Buscar</label>
            <input
              id="search"
              type="text"
              placeholder="Nombre, apellido o descripción..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.filterInput}
            />
          </div>

          <div className={styles.filterGroup}>
            <label htmlFor="dateFrom" className={styles.filterLabel}>Desde</label>
            <input
              id="dateFrom"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className={styles.filterInput}
            />
          </div>

          <div className={styles.filterGroup}>
            <label htmlFor="dateTo" className={styles.filterLabel}>Hasta</label>
            <input
              id="dateTo"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className={styles.filterInput}
            />
          </div>

          {/* NUEVO: Filtro por área */}
          <div className={styles.filterGroup}>
            <label htmlFor="areaFilter" className={styles.filterLabel}>Área</label>
            <select
              id="areaFilter"
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className={styles.filterInput}
            >
              <option value="">Todas las áreas</option>
              {AREAS.map((area) => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
          </div>
        </div>

        {dataError && <p className={styles.dataError}>{dataError}</p>}
      </section>

      {/* Tabla de registros */}
      <section className={styles.tableSection}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Voluntario</th>
                <th>Área</th>
                <th>Fecha</th>
                <th>Duración</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyRow}>
                    No hay registros para mostrar.
                  </td>
                </tr>
              ) : (
                submissions.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className={styles.userCell}>
                        <span className={styles.avatar} style={{ backgroundColor: s.avatarColor }}>
                          {s.initials}
                        </span>
                        <span>{s.name}</span>
                      </div>
                    </td>
                    <td>
                      {s.area ? (
                        <span className={styles.areaBadge}>{s.area}</span>
                      ) : (
                        <span className={styles.noArea}>—</span>
                      )}
                    </td>
                    <td>{s.date}</td>
                    <td className={styles.durationCell}>
                      {s.duration}
                      {getAnomaliaBadge(s.horas)}
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${styles[s.status]}`}>
                        {s.status === 'aprobado' && '✅ Aprobado'}
                        {s.status === 'rechazado' && '❌ Rechazado'}
                        {s.status === 'pendiente' && '⏳ Pendiente'}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actionsCell}>
                        {/* Botón de auditoría - permite cambiar estado de cualquier registro */}
                        {s.status === 'aprobado' && (
                          <button
                            className={styles.auditButton}
                            onClick={() => revisar(s.id, 'rechazado', s.description)}
                            title="Rechazar (auditoría)"
                          >
                            ❌ Rechazar
                          </button>
                        )}
                        {s.status === 'rechazado' && (
                          <button
                            className={styles.auditButton}
                            onClick={() => revisar(s.id, 'aprobado', s.description)}
                            title="Aprobar (auditoría)"
                          >
                            ✅ Aprobar
                          </button>
                        )}
                        {s.status === 'pendiente' && (
                          <>
                            <button
                              className={styles.approveButton}
                              onClick={() => revisar(s.id, 'aprobado', s.description)}
                            >
                              ✅ Aprobar
                            </button>
                            <button
                              className={styles.rejectButton}
                              onClick={() => revisar(s.id, 'rechazado', s.description)}
                            >
                              ❌ Rechazar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <nav className={styles.pagination}>
            <button
              className={styles.pageButton}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              « Anterior
            </button>
            <span className={styles.pageInfo}>
              Página {page} de {totalPages} ({total} registros)
            </span>
            <button
              className={styles.pageButton}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Siguiente »
            </button>
          </nav>
        )}
      </section>

      {/* Tendencia semanal y auditoría */}
      <section className={styles.chartsSection}>
        <WeeklyVolumeChart data={weeklyVolume} />
        <AuditLog items={auditLog} />
      </section>
    </div>
  );
}