"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { getPendingSubmissions, reviewSubmission } from "./adminData";
import AuditLog from "./AuditLog";
import LoadingSpinner from "./LoadingSpinner";
import WeeklyVolumeChart from "./WeeklyVolumeChart";
import styles from "./AdminDashboard.module.css";

const ITEMS_PER_PAGE = 8;

export default function AdminDashboard() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Estado para estadísticas, tendencia y auditoría
  const [stats, setStats] = useState({
    pendientes: 0,
    totalHoras: 0,
    horasAprobadas: 0,
    voluntariosActivos: 0,
  });
  const [weeklyVolume, setWeeklyVolume] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);

  // Evita que el useEffect de filtros dispare también en el primer render
  // (la carga inicial la hace el primer useEffect, con deps vacías).
  const isFirstRender = useRef(true);

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  // Cargar estadísticas, tendencia y auditoría en UNA sola petición.
  async function cargarEstadisticas() {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;

    try {
      const res = await fetch('/api/admin/estadisticas', {
        // no-store: que el navegador no guarde una copia propia; la frescura
        // la decide la caché del servidor (lib/cache.js).
        cache: 'no-store',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Error al cargar las estadísticas.');

      const { data } = await res.json();

      if (data?.stats) {
        setStats({
          pendientes: data.stats.pendientes || 0,
          totalHoras: data.stats.totalHoras || 0,
          horasAprobadas: data.stats.horasAprobadas || 0,
          voluntariosActivos: data.stats.voluntariosActivos || 0,
        });
      }

      if (Array.isArray(data?.tendencia)) {
        setWeeklyVolume(data.tendencia);
      }

      if (Array.isArray(data?.auditoria)) {
        setAuditLog(data.auditoria.map((item) => ({
          id: item.id,
          type: item.estado === 'aprobado' ? 'approved' : 'rejected',
          label: `${item.estado === 'aprobado' ? 'Aprobado' : 'Rechazado'}: Registro #${item.id}`,
          detail: `por ${item.revisor?.nombre || 'Coordinador'} • ${new Date(item.fechaRevision).toLocaleString('es-PE')}`,
        })));
      }
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    } finally {
      setLoadingStats(false);
    }
  }

  // Cargar la página actual de pendientes con los filtros aplicados en el
  // servidor (búsqueda + rango de fechas + paginación).
  async function cargarRegistros(pagina = page) {
    try {
      setLoading(true);
      const { items, total: nuevoTotal } = await getPendingSubmissions({
        page: pagina,
        limit: ITEMS_PER_PAGE,
        busqueda: search.trim() || undefined,
        desde: dateFrom || undefined,
        hasta: dateTo || undefined,
      });
      setSubmissions(items);
      setTotal(nuevoTotal);
      // Si la página quedó fuera de rango tras aplicar filtros, volver a la 1.
      const maxPage = Math.max(1, Math.ceil(nuevoTotal / ITEMS_PER_PAGE));
      setPage(pagina > maxPage ? maxPage : pagina);
    } catch (error) {
      setDataError(error.message || "No se pudieron cargar los registros.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarEstadisticas();
    cargarRegistros(1);
  }, []);

  // Recargar al cambiar filtros (búsqueda/rango), con debounce. No en el inicio.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(() => cargarRegistros(1), 300);
    return () => clearTimeout(timer);
  }, [search, dateFrom, dateTo]);

  // Aprobar con actualización optimista: se quita la fila de inmediato (sin
  // recargar la tabla); si el PATCH falla, se vuelve a la página para resync.
  async function handleApprove(id) {
    const fila = submissions.find((s) => s.id === id);
    setSubmissions((cur) => cur.filter((s) => s.id !== id));
    setTotal((t) => Math.max(0, t - 1));
    setStats((prev) => ({
      ...prev,
      pendientes: Math.max(0, prev.pendientes - 1),
      horasAprobadas: prev.horasAprobadas + (fila?.horas || 0),
    }));
    try {
      await reviewSubmission(id, "aprobado", "Aprobado por el coordinador.");
    } catch (error) {
      setDataError(error.message || "No se pudo aprobar el registro.");
      cargarRegistros(page);
      cargarEstadisticas();
    }
  }

  // Rechazo: pide el motivo, actualiza optimista y, si falla, resync.
  async function handleReject(id) {
    const comentario = prompt('Motivo del rechazo:');
    if (comentario === null) return;
    const fila = submissions.find((s) => s.id === id);
    setSubmissions((cur) => cur.filter((s) => s.id !== id));
    setTotal((t) => Math.max(0, t - 1));
    setStats((prev) => ({
      ...prev,
      pendientes: Math.max(0, prev.pendientes - 1),
    }));
    try {
      await reviewSubmission(id, "rechazado", comentario);
    } catch (error) {
      setDataError(error.message || "No se pudo rechazar el registro.");
      cargarRegistros(page);
      cargarEstadisticas();
    }
  }

  // Botón "≡ Filtros": re-aplica filtros desde la primera página.
  function aplicarFiltros() {
    cargarRegistros(1);
  }

  const maxVolume = Math.max(...weeklyVolume.map((d) => d.value), 1);

  return (
    <div className={styles.adminPage}>
      <header className={styles.pageHeader}>
        <div>
          <h1>Revisión de Evidencias Pendientes</h1>
          <p>Revisar y auditar las horas enviadas por la red de voluntarios.</p>
        </div>
        <div className={styles.headerControls}>
          <div className={styles.searchField}>
            <span>⌕</span>
            <input
              type="text"
              placeholder="Buscar voluntario..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className={styles.dateRange}>
            <span>📅</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
            <span>al</span>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
            />
          </div>
          <button type="button" className={styles.filterButton} onClick={aplicarFiltros}>
            ≡ Filtros
          </button>
        </div>
      </header>

      <section className={styles.stats}>
        {loadingStats ? (
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Cargando estadísticas...</span>
            <LoadingSpinner />
          </div>
        ) : (
          <>
            <article className={styles.statCard}>
              <span className={styles.statLabel}>Esperando Aprobación</span>
              <div className={styles.statValueRow}>
                <h2>{stats.pendientes}</h2>
                <small>{stats.pendientes > 0 ? `${stats.pendientes} pendientes` : 'Sin registros'}</small>
              </div>
            </article>
            <article className={styles.statCard}>
              <span className={styles.statLabel}>Horas Aprobadas</span>
              <div className={styles.statValueRow}>
                <h2>{stats.horasAprobadas}</h2>
                <small>de {stats.totalHoras} hrs totales</small>
              </div>
            </article>
            <article className={styles.statCard}>
              <span className={styles.statLabel}>Total de Horas</span>
              <div className={styles.statValueRow}>
                <h2>{stats.totalHoras}</h2>
                <small>↑ {stats.totalHoras > 0 ? 'Activo' : 'Sin registros'}</small>
              </div>
            </article>
            <article className={styles.statCard}>
              <span className={styles.statLabel}>Voluntarios Activos</span>
              <div className={styles.statValueRow}>
                <h2>{stats.voluntariosActivos}</h2>
                <small>este mes</small>
              </div>
            </article>
          </>
        )}
      </section>

      <div className={styles.tableCard}>
        <div className={`${styles.tableRow} ${styles.tableRowHead}`}>
          <span>Voluntario</span>
          <span>Fecha de Actividad</span>
          <span>Duración</span>
          <span>Evidencia</span>
          <span className={styles.actionsHead}>Acciones</span>
        </div>

        {loading && <p>Cargando registros...</p>}
        {dataError && <p className={styles.errorMessage}>{dataError}</p>}
        {!loading && !dataError && submissions.length === 0 && (
          <p>No hay registros pendientes.</p>
        )}
        {submissions.map((item) => (
          <div className={styles.tableRow} key={item.id}>
            <span className={styles.volunteerCell}>
              <i className={styles.avatar} style={{ background: item.avatarColor }}>
                {item.initials}
              </i>
              <span>
                <strong>{item.name}</strong>
                <small>ID: #{item.id}</small>
              </span>
            </span>
            <span>{item.date}</span>
            <span>{item.duration}</span>
            <span className={styles.evidenceCell}>
              📷 {item.evidenceFileName}
            </span>
            <span className={styles.actionsCell}>
              <button
                type="button"
                className={styles.approveButton}
                onClick={() => handleApprove(item.id)}
                aria-label={`Aprobar ${item.name}`}
              >
                ✓
              </button>
              <button
                type="button"
                className={styles.rejectButton}
                onClick={() => handleReject(item.id)}
                aria-label={`Rechazar ${item.name}`}
              >
                ✕
              </button>
              <Link
                href={`/administracion/${item.id}`}
                className={styles.evidenceButton}
              >
                Ver Evidencia
              </Link>
            </span>
          </div>
        ))}

        {!loading && !dataError && total > 0 && (
          <div className={styles.pagination}>
            <span>
              Mostrando {((page - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(page * ITEMS_PER_PAGE, total)} de {total} entradas
            </span>
            <div className={styles.pageControls}>
              <button
                type="button"
                disabled={page === 1}
                onClick={() => cargarRegistros(page - 1)}
              >
                Anterior
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pagina) => (
                <button
                  type="button"
                  key={pagina}
                  className={pagina === page ? styles.pageActive : ""}
                  onClick={() => cargarRegistros(pagina)}
                >
                  {pagina}
                </button>
              ))}
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => cargarRegistros(page + 1)}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      <section className={styles.bottomGrid}>
        <WeeklyVolumeChart data={weeklyVolume} maxVolume={maxVolume} />

        <AuditLog entries={auditLog} />
      </section>
    </div>
  );
}