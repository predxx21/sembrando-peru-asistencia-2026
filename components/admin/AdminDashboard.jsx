"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { getPendingSubmissions, reviewSubmission } from "./adminData";
import AuditLog from "./AuditLog";
import WeeklyVolumeChart from "./WeeklyVolumeChart";
import { UMBRALES } from '@/lib/constantes';
import { fetchConToken } from "@/lib/api/client";
import styles from "./AdminDashboard.module.css";

const ITEMS_PER_PAGE = 6;

export default function AdminDashboard() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [areas, setAreas] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [currentUserProfileId, setCurrentUserProfileId] = useState(null);

  const [weeklyVolume, setWeeklyVolume] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [reviewingId, setReviewingId] = useState(null);

  const isFirstRender = useRef(true);
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  // Obtener perfil y áreas
  useEffect(() => {
    async function getProfileId() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      try {
        const [perfilRes, areasRes] = await Promise.all([
          fetch('/api/auth/perfil', {
            cache: 'no-store',
            headers: { 'Authorization': `Bearer ${session.access_token}` },
          }),
          fetchConToken('/api/areas'),
        ]);

        if (perfilRes.ok) {
          const body = await perfilRes.json();
          if (body.profile?.id) {
            setCurrentUserProfileId(body.profile.id);
          }
        }

        if (areasRes.ok) {
          const areasBody = await areasRes.json();
          setAreas(areasBody.areas || []);
        }
      } catch (err) {
        console.error('Error obteniendo perfil/áreas:', err);
      }
    }
    getProfileId();
  }, []);

  // Cargar tendencias
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
      console.log('[Dashboard] stats endpoint response:', JSON.stringify(body.data, null, 2));
      setWeeklyVolume(body.data?.tendencia ?? []);
      setAuditLog(body.data?.auditoria ?? []);
    } catch (err) {
      console.error('Error cargando tendencias:', err);
    }
  }

  // Cargar inicial (siempre pendientes)
  async function cargarInicial() {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      setDataError('No hay sesión activa.');
      setLoading(false);
      return;
    }

    try {
      const res = await getPendingSubmissions({
        limit: ITEMS_PER_PAGE,
        estado: 'pendiente', // ← fijo
      });
      if (res) {
        setSubmissions(res.items);
        setTotal(res.total);
      }
    } catch (err) {
      setDataError(err.message || 'No se pudieron cargar los registros.');
    } finally {
      setLoading(false);
    }
  }

  // Cargar con filtros (siempre pendientes)
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
      area: areaFilter || undefined,
      estado: 'pendiente', // ← fijo
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

  // Efectos
  useEffect(() => {
    cargarTendencias();
    cargarInicial();
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setPage(1);
    cargarConFiltros();
  }, [search, dateFrom, dateTo, areaFilter]);

  useEffect(() => {
    if (!isFirstRender.current) {
      cargarConFiltros();
    }
  }, [page]);

  // Badge de anomalía
  const getAnomaliaBadge = (horas) => {
    if (horas > UMBRALES.JORNADA_MAXIMA_HORAS) {
      return <span className={styles.alertBadge}>⚠️ +8h</span>;
    }
    if (horas < UMBRALES.JORNADA_MINIMA_MINUTOS / 60) {
      return <span className={styles.alertBadge}>⚠️ {'<15min'}</span>;
    }
    return null;
  };

  const esRegistroPropio = (profileId) => {
    return currentUserProfileId && profileId === currentUserProfileId;
  };

  // Aprobar / Rechazar
  async function revisar(id, estado) {
    const motivo = estado === 'rechazado'
      ? prompt('Indica el motivo del rechazo (obligatorio):')
      : 'Aprobado por el coordinador (auditoría).';

    if (estado === 'rechazado' && !motivo?.trim()) {
      return;
    }

    setReviewingId(id);
    try {
      await reviewSubmission(id, estado, motivo);
      // Refrescar tabla y auditoría en paralelo sin recargar la página completa
      await Promise.all([cargarInicial(), cargarTendencias()]);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setReviewingId(null);
    }
  }

  // Limpiar filtros
  function limpiarFiltros() {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setAreaFilter("");
    setPage(1);
    // Forzar recarga con filtros limpios
    cargarConFiltros();
  }

  const hasActiveFilters = Boolean(search || dateFrom || dateTo || areaFilter);

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
      {/* HEADER */}
      <header className={styles.pageHeader}>
        <div>
          <h1>Panel de Coordinación</h1>
          <p>Revisa y audita las jornadas de voluntariado registradas.</p>
        </div>
      </header>

      {/* FILTROS */}
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

          <div className={styles.filterGroup}>
            <label htmlFor="areaFilter" className={styles.filterLabel}>Área</label>
            <select
              id="areaFilter"
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className={styles.filterInput}
            >
              <option value="">Todas las áreas</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>{area.nombre}</option>
              ))}
            </select>
          </div>

          {/* Botón "Limpiar filtros" (aparece solo si hay filtros activos) */}
          {hasActiveFilters && (
            <div className={styles.filterGroup} style={{ flex: '0 0 auto', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className={styles.clearAllFiltersBtn}
                onClick={limpiarFiltros}
                style={{
                  background: '#fff1f2',
                  color: '#e11d48',
                  border: '1px solid #fecdd3',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  height: '40px',
                  alignSelf: 'flex-end',
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#ffe4e6';
                  e.target.style.borderColor = '#fda4af';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#fff1f2';
                  e.target.style.borderColor = '#fecdd3';
                }}
              >
                ✕ Limpiar filtros
              </button>
            </div>
          )}
        </div>

        {dataError && <p className={styles.dataError}>{dataError}</p>}
      </section>

      {/* TABLA */}
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
                <th style={{ textAlign: "right" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyRow}>
                    No hay registros pendientes para mostrar.
                  </td>
                </tr>
              ) : (
                submissions.map((s) => {
                  const esPropio = esRegistroPropio(s.profileId);
                  return (
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
                          {esPropio ? (
                            <span className={styles.disabledAction} title="No puedes auditar tu propio registro">
                              —
                            </span>
                          ) : (
                            <>
                              {s.status === 'aprobado' && (
                                <button
                                  className={styles.auditButton}
                                  onClick={() => revisar(s.id, 'rechazado')}
                                  disabled={reviewingId === s.id}
                                  title={reviewingId === s.id ? 'Procesando...' : 'Rechazar'}
                                >
                                  {reviewingId === s.id ? '⏳' : '❌ Rechazar'}
                                </button>
                              )}
                              {s.status === 'rechazado' && (
                                <button
                                  className={styles.auditButton}
                                  onClick={() => revisar(s.id, 'aprobado')}
                                  disabled={reviewingId === s.id}
                                  title={reviewingId === s.id ? 'Procesando...' : 'Aprobar'}
                                >
                                  {reviewingId === s.id ? '⏳' : '✅ Aprobar'}
                                </button>
                              )}
                              {s.status === 'pendiente' && (
                                <>
                                  <button
                                    className={styles.approveButton}
                                    onClick={() => revisar(s.id, 'aprobado')}
                                    disabled={reviewingId === s.id}
                                  >
                                    {reviewingId === s.id ? '⏳' : '✅ Aprobar'}
                                  </button>
                                  <button
                                    className={styles.rejectButton}
                                    onClick={() => revisar(s.id, 'rechazado')}
                                    disabled={reviewingId === s.id}
                                  >
                                    {reviewingId === s.id ? '⏳' : '❌ Rechazar'}
                                  </button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
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

      {/* GRÁFICOS Y AUDITORÍA */}
      <section className={styles.chartsSection}>
        <div className={styles.chartCard}>
          <h3>Tendencias de Volumen de Envíos</h3>
          {weeklyVolume.length > 0 ? (
            <WeeklyVolumeChart data={weeklyVolume} />
          ) : (
            <p>No hay datos suficientes para mostrar la tendencia.</p>
          )}
        </div>

        <div className={styles.chartCard}>
          <h3>Registros de Auditoría</h3>
          {auditLog.length > 0 ? (
            <AuditLog entries={auditLog} />
          ) : (
            <p>No hay registros de auditoría recientes.</p>
          )}
          <div style={{ marginTop: "12px" }}>
            <a href="/administracion/auditoria" className={styles.auditLink}>
              Ver Historial Completo →
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}