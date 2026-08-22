"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./ListadoHistorial.module.css";
import { ESTADO_LABEL } from "@/lib/utils/estado";

const statusConfig = {
  aprobado: { label: ESTADO_LABEL.aprobado, className: "statusApproved" },
  pendiente: { label: ESTADO_LABEL.pendiente, className: "statusPending" },
  rechazado: { label: ESTADO_LABEL.rechazado, className: "statusRejected" },
};

export default function HistoryDashboard({ activities }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Filtros
  const filtered = activities.filter((act) => {
    const matchSearch =
      act.title.toLowerCase().includes(search.toLowerCase()) ||
      act.description.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "todos" || act.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Paginación
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filtered.slice(startIndex, startIndex + itemsPerPage);

  // Al cambiar de filtros (búsqueda o estado), volver a la primera página: si
  // no, se puede quedar en una página que quedó fuera de rango y la lista
  // aparece vacía aunque haya resultados.
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus]);

  return (
    <div className={styles.historyPage}>
      {/* Header */}
      <header className={styles.pageHeader}>
        <div>
          <h1>Mi Historial de Actividades</h1>
          <p>Revisa todas tus contribuciones a la fundación.</p>
        </div>
      </header>

      {/* Filtros */}
      <div className={styles.filtersBar}>
        <div className={styles.searchField}>
          <span>🔍</span>
          <input
            type="text"
            placeholder="Buscar actividad..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className={styles.filterSelect}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="todos">Todos los estados</option>
          <option value="aprobado">Aprobado</option>
          <option value="pendiente">Pendiente</option>
          <option value="rechazado">Rechazado</option>
        </select>
      </div>

      {/* Lista de actividades */}
      <div className={styles.listContainer}>
        {currentItems.length === 0 ? (
          <p className={styles.emptyMessage}>No se encontraron actividades.</p>
        ) : (
          currentItems.map((activity) => {
            const status = statusConfig[activity.status] || statusConfig.pendiente;
            return (
              <article key={activity.id} className={styles.activityCard}>
                <div className={styles.cardHeader}>
                  <span className={`${styles.statusPill} ${styles[status.className]}`}>
                    {status.label}
                  </span>
                  <span className={styles.activityDate}>{activity.date}</span>
                </div>

                {/* El título ya es la descripción: no repetirla dos veces. */}
                <h3 className={styles.activityTitle}>{activity.title}</h3>

                <div className={styles.activityMeta}>
                  <span className={styles.hoursBadge}>{activity.hours} hrs</span>
                </div>

                <div className={styles.cardActions}>
                  <Link
                    href={`/historial/${activity.id}`}
                    className={styles.detalleButton}
                  >
                    Ver Detalle
                  </Link>
                  {activity.status === "rechazado" && (
                    <Link
                      href={`/registro-editar/${activity.id}`}
                      className={styles.corregirButton}
                    >
                      Corregir
                    </Link>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <span>
            Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, filtered.length)} de {filtered.length} registros
          </span>
          <div className={styles.pageControls}>
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              Anterior
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                className={p === currentPage ? styles.pageActive : ""}
                onClick={() => setCurrentPage(p)}
              >
                {p}
              </button>
            ))}
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}