"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getAuditoriaCompleta } from "./adminData";
import { formatFechaEs } from "@/lib/utils/fecha";
import styles from "./AdminDashboard.module.css";

const ITEMS_PER_PAGE = 20;

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

  const isFirstRender = useRef(true);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / ITEMS_PER_PAGE)),
    [total]
  );

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

  // Early return loading full-screen (estilo Reportes)
  if (loading && auditoria.length === 0) {
    return <p style={{ padding: "20px", textAlign: "center", color: "#667281" }}>Cargando historial de auditoría...</p>;
  }

  // Mapear estado a badge
  function estadoBadge(estado) {
    return (
      <span
        className={`${styles.rolBadge} ${
          estado === "aprobado" ? styles.dotApproved : styles.dotRejected
        }`}
        style={{
          background:
            estado === "aprobado" ? "#cdeedd" : "#fdecec",
          color: estado === "aprobado" ? "#145c34" : "#d64545",
        }}
      >
        {estado === "aprobado" ? "Aprobado" : "Rechazado"}
      </span>
    );
  }

  // Truncar comentario con tooltip nativo
  function ComentarioCell({ comentario }) {
    const texto = comentario || "—";
    const maxLen = 60;
    const display = texto.length > maxLen ? texto.slice(0, maxLen) + "…" : texto;
    return (
      <span title={texto} style={{ cursor: "help" }}>
        {display}
      </span>
    );
  }

  function aplicarFiltros() {
    cargarAuditoria(1);
  }

  function limpiarFiltros() {
    setSearch("");
    setEstado("");
    setDesde("");
    setHasta("");
    cargarAuditoria(1);
  }

  return (
    <div className={styles.adminPage}>
      <header className={styles.pageHeader}>
        <div>
          <h1>Historial de Auditoría</h1>
          <p>Registro completo de aprobaciones y rechazos de horas.</p>
        </div>
      </header>

      {/* Filtros */}
      <div className={styles.tableCard} style={{ padding: "16px 20px", marginBottom: "16px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "flex-end" }}>
          <div className={styles.searchField} style={{ flex: "1 1 200px" }}>
            <span>⌕</span>
            <input
              type="text"
              placeholder="Buscar voluntario o revisor..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <label style={{ fontSize: "12px", color: "#667281" }}>Estado</label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              style={{
                padding: "8px 12px",
                border: "1px solid #dfe4ea",
                borderRadius: "8px",
                fontSize: "13px",
                background: "white",
              }}
            >
              <option value="">Todos</option>
              <option value="aprobado">Aprobado</option>
              <option value="rechazado">Rechazado</option>
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <label style={{ fontSize: "12px", color: "#667281" }}>Desde</label>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              style={{
                padding: "8px 12px",
                border: "1px solid #dfe4ea",
                borderRadius: "8px",
                fontSize: "13px",
              }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <label style={{ fontSize: "12px", color: "#667281" }}>Hasta</label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              style={{
                padding: "8px 12px",
                border: "1px solid #dfe4ea",
                borderRadius: "8px",
                fontSize: "13px",
              }}
            />
          </div>
          <button
            type="button"
            className={styles.filterButton}
            onClick={aplicarFiltros}
            style={{ height: "38px" }}
          >
            Filtrar
          </button>
          {search || estado || desde || hasta ? (
            <button
              type="button"
              onClick={limpiarFiltros}
              style={{
                height: "38px",
                padding: "0 16px",
                border: "1px solid #dfe4ea",
                borderRadius: "8px",
                background: "white",
                color: "#d64545",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Limpiar
            </button>
          ) : null}
        </div>
      </div>

      {/* Tabla */}
      <div className={styles.tableCard}>
        <div className={`${styles.tableRow} ${styles.tableRowHead}`}>
          <span>Fecha Revisión</span>
          <span>Estado</span>
          <span>Registro</span>
          <span>Voluntario</span>
          <span>Revisor</span>
          <span>Comentario</span>
        </div>

        {error && <p className={styles.errorMessage}>{error}</p>}
        {!loading && !error && auditoria.length === 0 && (
          <p style={{ padding: "20px", textAlign: "center", color: "#667281" }}>
            No hay registros de auditoría con los filtros actuales.
          </p>
        )}

        {auditoria.map((item) => (
          <div className={styles.tableRow} key={item.id}>
            <span>{formatFechaEs(item.fechaRevision)}</span>
            <span>{estadoBadge(item.estado)}</span>
            <span>#{item.id}</span>
            <span className={styles.volunteerCell}>
              <strong>
                {`${item.profile?.nombre || ""} ${item.profile?.apellido || ""}`.trim() ||
                  "—"}
              </strong>
            </span>
            <span className={styles.volunteerCell}>
              <strong>
                {`${item.revisor?.nombre || ""} ${item.revisor?.apellido || ""}`.trim() ||
                  "—"}
              </strong>
            </span>
            <span>
              <ComentarioCell comentario={item.comentarioRevision} />
            </span>
          </div>
        ))}

        {!loading && !error && total > 0 && (
          <div className={styles.pagination}>
            <span>
              Mostrando{" "}
              {((page - 1) * ITEMS_PER_PAGE) + 1} a{" "}
              {Math.min(page * ITEMS_PER_PAGE, total)} de {total} registros
            </span>
            <div className={styles.pageControls}>
              <button
                type="button"
                disabled={page === 1}
                onClick={() => cargarAuditoria(page - 1)}
              >
                Anterior
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pagina) => (
                <button
                  type="button"
                  key={pagina}
                  className={pagina === page ? styles.pageActive : ""}
                  onClick={() => cargarAuditoria(pagina)}
                >
                  {pagina}
                </button>
              ))}
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => cargarAuditoria(page + 1)}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}