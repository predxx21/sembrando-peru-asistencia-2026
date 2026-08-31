"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import styles from "./ListadoHistorial.module.css";
import { ESTADO_LABEL } from "@/lib/utils/estado";

const statusConfig = {
  aprobado: { label: ESTADO_LABEL.aprobado, className: "statusApproved" },
  pendiente: { label: ESTADO_LABEL.pendiente, className: "statusPending" },
  rechazado: { label: ESTADO_LABEL.rechazado, className: "statusRejected" },
};

// El límite se define en el padre (page.js) y se pasa como prop
export default function HistoryDashboard({
  activities = [],
  total = 0,
  page = 1,
  limit = 6,
  onPageChange,
}) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [currentPage, setCurrentPage] = useState(page);

  // Sincronizar currentPage con page prop (si el padre cambia la página)
  useEffect(() => {
    setCurrentPage(page);
  }, [page]);

  // Aplicar filtros SOLO a los registros de la página actual (client-side)
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      const matchSearch =
        act.title.toLowerCase().includes(search.toLowerCase()) ||
        act.description.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "todos" || act.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [activities, search, filterStatus]);

  // Reiniciar a página 1 cuando cambian filtros (aunque la paginación es servidor,
  // aquí solo filtramos los datos ya traídos, así que no tiene mucho sentido
  // reiniciar la página del servidor, pero podemos hacerlo)
  useEffect(() => {
    if (search || filterStatus !== "todos") {
      // Si el usuario filtra, mostramos solo los que coinciden de la página actual.
      // Para una búsqueda más precisa, deberías hacer una nueva petición al backend
      // con los filtros, pero por ahora queda así.
    }
  }, [search, filterStatus]);

  const totalPages = Math.ceil(total / limit);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    if (onPageChange) {
      onPageChange(newPage);
    }
  };

  // Generar elementos de paginación (igual que antes)
  function getPaginationItems(currentPage, totalPages) {
    const items = [];
    const maxVisible = 7;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) items.push(i);
    } else {
      items.push(1);
      if (currentPage > 3) items.push("...");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) items.push(i);
      if (currentPage < totalPages - 2) items.push("...");
      items.push(totalPages);
    }
    return items;
  }

  const paginationItems = getPaginationItems(currentPage, totalPages);

  return (
    <div className={styles.historyPage}>
      <header className={styles.pageHeader}>
        <div>
          <h1>Mi Historial de Actividades</h1>
          <p>Revisa todas tus contribuciones a la fundación.</p>
        </div>
      </header>

      <div className={styles.filtersBar}>
        <div className={styles.searchField}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por título o descripción..."
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

      <div className={styles.listContainer}>
        {filteredActivities.length === 0 ? (
          <p className={styles.emptyMessage}>
            {search || filterStatus !== "todos"
              ? "No se encontraron actividades con esos filtros."
              : "Aún no has registrado ninguna actividad. ¡Empieza hoy!"}
          </p>
        ) : (
          filteredActivities.map((act) => (
            <article key={act.id} className={styles.activityCard}>
              <div className={styles.cardHeader}>
                <span className={`${styles.statusPill} ${styles[statusConfig[act.status].className]}`}>
                  {statusConfig[act.status].label}
                </span>
                <span className={styles.activityDate}>{act.date}</span>
              </div>
              <h2 className={styles.activityTitle}>{act.title}</h2>
              <p className={styles.activityDescription}>{act.description}</p>
              <div className={styles.cardMeta}>
                <span className={styles.hoursBadge}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                  {act.hours} h
                </span>
                <span className={styles.activityArea}>{act.area || "—"}</span>
              </div>
              <div className={styles.cardActions}>
                <Link href={`/historial/${act.id}`} className={styles.detailButton}>
                  Ver Detalle
                </Link>
                {act.status === "rechazado" && (
                  <Link href={`/registro-editar/${act.id}`} className={styles.corregirButton}>
                    Corregir
                  </Link>
                )}
              </div>
            </article>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <span className={styles.paginationInfo}>
            Página {currentPage} de {totalPages} ({total} registros)
          </span>
          <div className={styles.pageControls}>
            <button
              className={styles.pageBtn}
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              ‹ Anterior
            </button>
            {paginationItems.map((item, index) => (
              <button
                key={index}
                className={`${styles.pageBtn} ${item === currentPage ? styles.pageBtnActive : ""}`}
                onClick={() => typeof item === "number" && handlePageChange(item)}
                disabled={item === "..." || item === currentPage}
              >
                {item}
              </button>
            ))}
            <button
              className={styles.pageBtn}
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Siguiente ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}