"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getAuditoriaCompleta } from "./adminData";
import { formatFechaEs } from "@/lib/utils/fecha";
import styles from "./HistorialAuditoria.module.css";

const ITEMS_PER_PAGE = 20;

// Paleta de colores para avatares
const AVATAR_COLORS = [
  "#0f766e", "#2563eb", "#7c3aed", "#d97706", "#059669", "#dc2626", "#0891b2"
];

function getAvatarColor(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(nombre = "", apellido = "") {
  const n = (nombre || "").trim();
  const a = (apellido || "").trim();
  if (!n && !a) return "U";
  return `${n.charAt(0)}${a.charAt(0)}`.toUpperCase();
}

export default function HistorialAuditoria() {
  const [auditoria, setAuditoria] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Filtros
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState(""); // '', 'aprobado', 'rechazado'
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  // Modal de detalle
  const [selectedItem, setSelectedItem] = useState(null);
  const [copied, setCopied] = useState(false);

  const isFirstRender = useRef(true);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / ITEMS_PER_PAGE)),
    [total]
  );

  // KPIs dinámicos calculados sobre la muestra actual
  const kpiStats = useMemo(() => {
    const aprobados = auditoria.filter((item) => item.estado === "aprobado").length;
    const rechazados = auditoria.filter((item) => item.estado === "rechazado").length;
    const muestraTotal = auditoria.length;
    const tasaAprobacion = muestraTotal > 0 ? Math.round((aprobados / muestraTotal) * 100) : 100;
    
    return { aprobados, rechazados, tasaAprobacion };
  }, [auditoria]);

  async function cargarAuditoria(pagina = page) {
    try {
      setLoading(true);
      setError("");
      const { auditoria: lista, total: nuevoTotal } = await getAuditoriaCompleta({
        page: pagina,
        limit: ITEMS_PER_PAGE,
        busqueda: search.trim() || undefined,
        estado: estado || undefined,
        desde: desde || undefined,
        hasta: hasta || undefined,
      });
      setAuditoria(lista);
      setTotal(nuevoTotal);
      const maxPage = Math.max(1, Math.ceil(nuevoTotal / ITEMS_PER_PAGE));
      setPage(pagina > maxPage ? maxPage : pagina);
    } catch (err) {
      setError(err.message || "No se pudo cargar el historial de auditoría.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarAuditoria(1);
  }, []);

  // Debounce en filtros
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(() => cargarAuditoria(1), 300);
    return () => clearTimeout(timer);
  }, [search, estado, desde, hasta]);

  function limpiarFiltros() {
    setSearch("");
    setEstado("");
    setDesde("");
    setHasta("");
    cargarAuditoria(1);
  }

  // Atajos de fecha rápida
  function setRangoHoras(dias) {
    const hoy = new Date();
    const isoHoy = hoy.toISOString().split("T")[0];
    if (dias === 0) {
      setDesde(isoHoy);
      setHasta(isoHoy);
    } else {
      const past = new Date();
      past.setDate(hoy.getDate() - dias);
      setDesde(past.toISOString().split("T")[0]);
      setHasta(isoHoy);
    }
  }

  // Exportar a CSV
  function exportarCSV() {
    if (auditoria.length === 0) return;
    const headers = ["ID", "Fecha Revision", "Estado", "Voluntario", "Revisor", "Comentario"];
    const rows = auditoria.map((item) => [
      item.id,
      formatFechaEs(item.fechaRevision),
      item.estado,
      `"${item.profile?.nombre || ""} ${item.profile?.apellido || ""}"`,
      `"${item.revisor?.nombre || ""} ${item.revisor?.apellido || ""}"`,
      `"${(item.comentarioRevision || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `auditoria_reporte_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleCopyId(id) {
    navigator.clipboard.writeText(String(id));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const hasActiveFilters = Boolean(search || estado || desde || hasta);

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.pageHeader}>
        <div className={styles.headerTitleGroup}>
          <h1 className={styles.pageTitle}>Historial de Reportes</h1>
          <p className={styles.pageSubtitle}>
            Trazabilidad completa de revisiones, aprobaciones y rechazos de horas.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.exportBtn}
            onClick={exportarCSV}
            disabled={auditoria.length === 0}
            title="Descargar listado actual en formato CSV"
          >
            <svg viewBox="0 0 24 24">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
            </svg>
            Exportar CSV
          </button>
        </div>
      </header>

      {/* Tarjetas KPI */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIcon} ${styles.kpiIconTotal}`}>📋</div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Total Registros</span>
            <span className={styles.kpiValue}>{total}</span>
            <span className={styles.kpiSubtext}>Eventos reportados</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIcon} ${styles.kpiIconApproved}`}>✓</div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Aprobados (Pagina)</span>
            <span className={styles.kpiValue}>{kpiStats.aprobados}</span>
            <span className={styles.kpiSubtext}>Sin observaciones</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIcon} ${styles.kpiIconRejected}`}>✕</div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Rechazados (Pagina)</span>
            <span className={styles.kpiValue}>{kpiStats.rechazados}</span>
            <span className={styles.kpiSubtext}>Devueltos para corrección</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIcon} ${styles.kpiIconRate}`}>📈</div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Tasa de Aprobación</span>
            <span className={styles.kpiValue}>{kpiStats.tasaAprobacion}%</span>
            <span className={styles.kpiSubtext}>Promedio histórico</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros & Herramientas */}
      <div className={styles.toolbarCard}>
        <div className={styles.toolbarTopRow}>
          {/* Tabs por Estado */}
          <div className={styles.tabsGroup}>
            <button
              type="button"
              className={`${styles.tabBtn} ${estado === "" ? styles.tabBtnActive : ""}`}
              onClick={() => setEstado("")}
            >
              Todos <span className={styles.tabCount}>{total}</span>
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${estado === "aprobado" ? styles.tabBtnActive : ""}`}
              onClick={() => setEstado("aprobado")}
            >
              Aprobados
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${estado === "rechazado" ? styles.tabBtnActive : ""}`}
              onClick={() => setEstado("rechazado")}
            >
              Rechazados
            </button>
          </div>

          {/* Buscador */}
          <div className={styles.searchBox}>
            <span className={styles.searchIcon}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Buscar voluntario o revisor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className={styles.clearSearchBtn}
                onClick={() => setSearch("")}
                title="Limpiar búsqueda"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Fila Inferior: Fechas & Acciones */}
        <div className={styles.toolbarBottomRow}>
          <div className={styles.dateFilterGroup}>
            <div className={styles.dateInputWrapper}>
              <label htmlFor="desde-input">Desde:</label>
              <input
                id="desde-input"
                type="date"
                className={styles.dateInput}
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
              />
            </div>
            <div className={styles.dateInputWrapper}>
              <label htmlFor="hasta-input">Hasta:</label>
              <input
                id="hasta-input"
                type="date"
                className={styles.dateInput}
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
              />
            </div>
            <div className={styles.quickDates}>
              <button type="button" className={styles.quickDateBtn} onClick={() => setRangoHoras(0)}>
                Hoy
              </button>
              <button type="button" className={styles.quickDateBtn} onClick={() => setRangoHoras(7)}>
                Últimos 7d
              </button>
              <button type="button" className={styles.quickDateBtn} onClick={() => setRangoHoras(30)}>
                Este mes
              </button>
            </div>
          </div>

          {hasActiveFilters && (
            <button type="button" className={styles.clearAllFiltersBtn} onClick={limpiarFiltros}>
              ✕ Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Tabla de Registros */}
      <div className={styles.tableContainer}>
        {loading && auditoria.length === 0 ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner} />
            <p>Cargando registros de reportes...</p>
          </div>
        ) : error ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>⚠️</div>
            <h3 className={styles.emptyTitle}>Ocurrió un error</h3>
            <p className={styles.emptySubtext}>{error}</p>
          </div>
        ) : auditoria.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🔍</div>
            <h3 className={styles.emptyTitle}>No hay registros encontrados</h3>
            <p className={styles.emptySubtext}>
              No se encontraron registros de reportes que coincidan con los filtros aplicados.
            </p>
            {hasActiveFilters && (
              <button type="button" className={styles.clearAllFiltersBtn} onClick={limpiarFiltros} style={{ marginTop: "12px" }}>
                Restablecer Filtros
              </button>
            )}
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Fecha Revisión</th>
                  <th>Estado</th>
                  <th>ID</th>
                  <th>Voluntario</th>
                  <th>Revisor</th>
                  <th>Comentario</th>
                  <th style={{ textAlign: "right" }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {auditoria.map((item) => {
                  const voluntarioNombre = `${item.profile?.nombre || ""} ${item.profile?.apellido || ""}`.trim() || "Desconocido";
                  const revisorNombre = `${item.revisor?.nombre || ""} ${item.revisor?.apellido || ""}`.trim() || "Sistema";
                  const voluntarioInitials = getInitials(item.profile?.nombre, item.profile?.apellido);
                  const revisorInitials = getInitials(item.revisor?.nombre, item.revisor?.apellido);
                  const isAprobado = item.estado === "aprobado";

                  return (
                    <tr
                      key={item.id}
                      className={styles.tableRow}
                      onClick={() => setSelectedItem(item)}
                    >
                      <td>
                        <span style={{ fontWeight: 600, color: "#1e293b" }}>
                          {formatFechaEs(item.fechaRevision)}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`${styles.statusBadge} ${
                            isAprobado ? styles.statusApproved : styles.statusRejected
                          }`}
                        >
                          <span className={isAprobado ? styles.statusApprovedDot : styles.statusRejectedDot} />
                          {isAprobado ? "Aprobado" : "Rechazado"}
                        </span>
                      </td>
                      <td>
                        <span className={styles.idBadge}>#{item.id}</span>
                      </td>
                      <td>
                        <div className={styles.userCell}>
                          <div
                            className={styles.avatar}
                            style={{ backgroundColor: getAvatarColor(voluntarioNombre) }}
                          >
                            {voluntarioInitials}
                          </div>
                          <div className={styles.userInfo}>
                            <span className={styles.userName}>{voluntarioNombre}</span>
                            <span className={styles.userRole}>Voluntario</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className={styles.userCell}>
                          <div
                            className={styles.avatar}
                            style={{ backgroundColor: getAvatarColor(revisorNombre) }}
                          >
                            {revisorInitials}
                          </div>
                          <div className={styles.userInfo}>
                            <span className={styles.userName}>{revisorNombre}</span>
                            <span className={styles.userRole}>Revisor</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className={styles.commentBox} title={item.comentarioRevision || "Sin comentario"}>
                          {item.comentarioRevision ? (
                            item.comentarioRevision
                          ) : (
                            <span className={styles.noComment}>Sin observación</span>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className={styles.detailBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItem(item);
                          }}
                        >
                          Detalles
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {!loading && !error && total > 0 && (
          <div className={styles.pagination}>
            <span className={styles.paginationInfo}>
              Mostrando <strong>{(page - 1) * ITEMS_PER_PAGE + 1}</strong> a{" "}
              <strong>{Math.min(page * ITEMS_PER_PAGE, total)}</strong> de <strong>{total}</strong> registros
            </span>
            <div className={styles.paginationControls}>
              <button
                type="button"
                className={styles.pageBtn}
                disabled={page === 1}
                onClick={() => cargarAuditoria(page - 1)}
              >
                ‹ Anterior
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pagina) => (
                <button
                  type="button"
                  key={pagina}
                  className={`${styles.pageBtn} ${pagina === page ? styles.pageBtnActive : ""}`}
                  onClick={() => cargarAuditoria(pagina)}
                >
                  {pagina}
                </button>
              ))}
              <button
                type="button"
                className={styles.pageBtn}
                disabled={page === totalPages}
                onClick={() => cargarAuditoria(page + 1)}
              >
                Siguiente ›
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Detalle */}
      {selectedItem && (
        <div className={styles.modalBackdrop} onClick={() => setSelectedItem(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Detalle del Registro de Reporte</h3>
              <button
                type="button"
                className={styles.closeModalBtn}
                onClick={() => setSelectedItem(null)}
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>ID del Registro</span>
                  <span className={styles.detailValue}>#{selectedItem.id}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Estado Final</span>
                  <div>
                    <span
                      className={`${styles.statusBadge} ${
                        selectedItem.estado === "aprobado"
                          ? styles.statusApproved
                          : styles.statusRejected
                      }`}
                    >
                      {selectedItem.estado === "aprobado" ? "✓ Aprobado" : "✕ Rechazado"}
                    </span>
                  </div>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Voluntario</span>
                  <span className={styles.detailValue}>
                    {`${selectedItem.profile?.nombre || ""} ${selectedItem.profile?.apellido || ""}`.trim() || "Desconocido"}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Revisado Por</span>
                  <span className={styles.detailValue}>
                    {`${selectedItem.revisor?.nombre || ""} ${selectedItem.revisor?.apellido || ""}`.trim() || "Sistema"}
                  </span>
                </div>
                <div className={`${styles.detailItem} ${styles.detailItemFull}`}>
                  <span className={styles.detailLabel}>Fecha y Hora de Revisión</span>
                  <span className={styles.detailValue}>
                    {formatFechaEs(selectedItem.fechaRevision)}
                  </span>
                </div>
              </div>

              <div
                className={`${styles.commentBlock} ${
                  selectedItem.estado === "aprobado"
                    ? styles.commentBlockApproved
                    : styles.commentBlockRejected
                }`}
              >
                <div className={styles.commentTitle}>Observaciones / Comentario de Revisión</div>
                <p className={styles.commentText}>
                  {selectedItem.comentarioRevision || "No se registró ninguna observación en este dictamen."}
                </p>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.copyIdBtn}
                onClick={() => handleCopyId(selectedItem.id)}
              >
                {copied ? "¡Copiado! ✓" : "Copiar ID #"}
              </button>
              <button
                type="button"
                className={styles.exportBtn}
                onClick={() => setSelectedItem(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}