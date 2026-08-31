"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { getPendingSubmissions, reviewSubmission } from "./adminData";
import AuditLog from "./AuditLog";
import WeeklyVolumeChart from "./WeeklyVolumeChart";
import { UMBRALES } from '@/lib/constantes';
import { fetchConToken } from "@/lib/api/client";
import { useRol } from "@/components/layout/PortalAuthProvider"; // ← TUYA
import styles from "./AdminDashboard.module.css";

const ITEMS_PER_PAGE = 6;

export default function AdminDashboard() {
  const rol = useRol(); // ← TUYA
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
  const [selectedAvatar, setSelectedAvatar] = useState(null); // ← DE TU AMIGO

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
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error('Error al cargar tendencias:', errorData.error || res.status);
      return;
    }
    const body = await res.json();
    // Quita este log antes de producción:
    // console.log('[Dashboard] stats endpoint response:', JSON.stringify(body.data, null, 2));
    setWeeklyVolume(body.data?.tendencia ?? []);
    setAuditLog(body.data?.auditoria ?? []);
  } catch (err) {
    console.error('Error en cargarTendencias:', err);
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
        estado: 'pendiente',
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
      estado: 'pendiente',
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

  // 👇 EFECTO PARA MODAL (DE TU AMIGO)
  useEffect(() => {
    if (!selectedAvatar) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSelectedAvatar(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [selectedAvatar]);

  // ===== ICONOS ===== (todos los que ya tenías, los dejo igual)
  function CheckIcon({ size = 14, className }) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }

  function XIcon({ size = 14, className }) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    );
  }

  function ClockIcon({ size = 14, className }) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    );
  }

  function AlertIcon({ size = 13, className }) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    );
  }

  function SpinnerIcon({ size = 14, className }) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`${styles.spinner} ${className || ''}`}>
        <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
        <path d="M12 2a10 10 0 0 1 10 10" strokeOpacity="1" strokeLinecap="round" />
      </svg>
    );
  }

  function UserIcon({ size = 13, className }) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    );
  }

  function TagIcon({ size = 13, className }) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </svg>
    );
  }

  function CalendarIcon({ size = 13, className }) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    );
  }

  function TimerIcon({ size = 13, className }) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    );
  }

  function StatusIcon({ size = 13, className }) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    );
  }

  function ZapIcon({ size = 13, className }) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    );
  }

  function TableListIcon({ size = 18, className }) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    );
  }

  // ===== FUNCIONES AUXILIARES =====
  const getAnomaliaBadge = (horas) => {
    if (horas > UMBRALES.JORNADA_MAXIMA_HORAS) {
      return (
        <span className={styles.alertBadge}>
          <AlertIcon size={12} /> +8h
        </span>
      );
    }
    if (horas < UMBRALES.JORNADA_MINIMA_MINUTOS / 60) {
      return (
        <span className={styles.alertBadge}>
          <AlertIcon size={12} /> {'<15min'}
        </span>
      );
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
              disabled={rol === 'admin'} // ← TU FUNCIONALIDAD
            >
              <option value="">Todas las áreas</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>{area.nombre}</option>
              ))}
            </select>
          </div>

          {hasActiveFilters && (
            <div className={styles.filterGroup} style={{ flex: '0 0 auto', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className={styles.clearAllFiltersBtn}
                onClick={limpiarFiltros}
              >
                <XIcon size={13} />
                <span>Limpiar filtros</span>
              </button>
            </div>
          )}
        </div>

        {dataError && <p className={styles.dataError}>{dataError}</p>}
      </section>

      {/* TABLA */}
      <section className={styles.tableSection}>
        <div className={styles.tableCardHeader}>
          <div className={styles.tableTitleGroup}>
            <div className={styles.tableIconBadge}>
              <TableListIcon size={18} />
            </div>
            <div>
              <h2 className={styles.tableTitle}>Registros Pendientes de Auditoría</h2>
              <p className={styles.tableSubtitle}>Revisa y audita las horas registradas por el equipo de voluntariado.</p>
            </div>
          </div>
          <span className={styles.countBadge}>
            {total} {total === 1 ? 'registro' : 'registros'}
          </span>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>
                  <div className={styles.thContent}>
                    <UserIcon size={13} />
                    <span>Voluntario</span>
                  </div>
                </th>
                <th>
                  <div className={styles.thContent}>
                    <TagIcon size={13} />
                    <span>Área</span>
                  </div>
                </th>
                <th>
                  <div className={styles.thContent}>
                    <CalendarIcon size={13} />
                    <span>Fecha</span>
                  </div>
                </th>
                <th>
                  <div className={styles.thContent}>
                    <TimerIcon size={13} />
                    <span>Duración</span>
                  </div>
                </th>
                <th>
                  <div className={styles.thContent}>
                    <StatusIcon size={13} />
                    <span>Estado</span>
                  </div>
                </th>
                <th style={{ textAlign: "right" }}>
                  <div className={styles.thContent} style={{ justifyContent: "flex-end" }}>
                    <ZapIcon size={13} />
                    <span>Acciones</span>
                  </div>
                </th>
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
                          {/* 👇 AVATAR CON FOTO O INICIALES (DE TU AMIGO) */}
                          {s.avatarUrl ? (
                            <button
                              type="button"
                              className={styles.avatarButton}
                              onClick={() =>
                                setSelectedAvatar({
                                  url: s.avatarUrl,
                                  name: s.name,
                                })
                              }
                              title={`Ver foto de ${s.name}`}
                              aria-label={`Ver foto de ${s.name}`}
                            >
                              <img
                                src={s.avatarUrl}
                                alt={`Foto de ${s.name}`}
                                className={styles.avatarImage}
                              />
                            </button>
                          ) : (
                            <span
                              className={styles.avatar}
                              style={{
                                backgroundColor: s.avatarColor || '#0f766e',
                              }}
                              aria-label={`Iniciales de ${s.name}`}
                            >
                              {s.initials}
                            </span>
                          )}

                          <div className={styles.userMeta}>
                            <span className={styles.userName}>{s.name}</span>
                            <span className={styles.userRoleTag}>Voluntario</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        {s.area ? (
                          <span className={styles.areaBadge}>
                            <span className={styles.areaDot} />
                            {s.area}
                          </span>
                        ) : (
                          <span className={styles.noArea}>—</span>
                        )}
                      </td>
                      <td>
                        <span className={styles.dateCell}>{s.date}</span>
                      </td>
                      <td>
                        <div className={styles.durationWrapper}>
                          <span className={styles.durationCell}>{s.duration}</span>
                          {getAnomaliaBadge(s.horas)}
                        </div>
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${styles[s.status]}`}>
                          {s.status === 'aprobado' && (
                            <>
                              <CheckIcon size={13} />
                              <span>Aprobado</span>
                            </>
                          )}
                          {s.status === 'rechazado' && (
                            <>
                              <XIcon size={13} />
                              <span>Rechazado</span>
                            </>
                          )}
                          {s.status === 'pendiente' && (
                            <>
                              <ClockIcon size={13} />
                              <span>Pendiente</span>
                            </>
                          )}
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
                                  {reviewingId === s.id ? (
                                    <SpinnerIcon size={13} />
                                  ) : (
                                    <>
                                      <XIcon size={13} />
                                      <span>Rechazar</span>
                                    </>
                                  )}
                                </button>
                              )}
                              {s.status === 'rechazado' && (
                                <button
                                  className={styles.auditButton}
                                  onClick={() => revisar(s.id, 'aprobado')}
                                  disabled={reviewingId === s.id}
                                  title={reviewingId === s.id ? 'Procesando...' : 'Aprobar'}
                                >
                                  {reviewingId === s.id ? (
                                    <SpinnerIcon size={13} />
                                  ) : (
                                    <>
                                      <CheckIcon size={13} />
                                      <span>Aprobar</span>
                                    </>
                                  )}
                                </button>
                              )}
                              {s.status === 'pendiente' && (
                                <>
                                  <button
                                    className={styles.approveButton}
                                    onClick={() => revisar(s.id, 'aprobado')}
                                    disabled={reviewingId === s.id}
                                  >
                                    {reviewingId === s.id ? (
                                      <SpinnerIcon size={13} />
                                    ) : (
                                      <>
                                        <CheckIcon size={13} />
                                        <span>Aprobar</span>
                                      </>
                                    )}
                                  </button>
                                  <button
                                    className={styles.rejectButton}
                                    onClick={() => revisar(s.id, 'rechazado')}
                                    disabled={reviewingId === s.id}
                                  >
                                    {reviewingId === s.id ? (
                                      <SpinnerIcon size={13} />
                                    ) : (
                                      <>
                                        <XIcon size={13} />
                                        <span>Rechazar</span>
                                      </>
                                    )}
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

      {/* 👇 MODAL DE FOTO (DE TU AMIGO) */}
      {selectedAvatar && (
        <div
          className={styles.avatarModalOverlay}
          onClick={() => setSelectedAvatar(null)}
        >
          <div
            className={styles.avatarModal}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className={styles.avatarModalClose}
              onClick={() => setSelectedAvatar(null)}
              aria-label="Cerrar foto"
              title="Cerrar"
            >
              ×
            </button>

            <img
              src={selectedAvatar.url}
              alt={`Foto de ${selectedAvatar.name}`}
              className={styles.avatarModalImage}
            />

            <p className={styles.avatarModalName}>
              {selectedAvatar.name}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}