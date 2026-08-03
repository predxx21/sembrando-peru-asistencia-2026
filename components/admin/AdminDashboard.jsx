"use client";

import { useState } from "react";
import Link from "next/link";
import { submissions } from "./adminData";
import styles from "./AdminDashboard.module.css";

const summaryStats = [
  {
    id: "pending",
    label: "Esperando Aprobación",
    value: "24",
    detail: "+5 hoy",
  },
  {
    id: "avgTime",
    label: "Tiempo Prom. de Revisión",
    value: "4.2h",
    detail: "por entrada",
  },
  {
    id: "totalHours",
    label: "Total de Horas de Voluntariado",
    value: "1,280",
    detail: "↑ 12%",
  },
  {
    id: "activeVolunteers",
    label: "Voluntarios Activos",
    value: "82",
    detail: "este mes",
  },
];

const weeklyVolume = [
  { day: "L", value: 55 },
  { day: "M", value: 78 },
  { day: "M", value: 60 },
  { day: "J", value: 92 },
  { day: "V", value: 70 },
  { day: "S", value: 38 },
  { day: "D", value: 30 },
];

const auditLog = [
  {
    id: 1,
    type: "approved",
    label: "Aprobado: VL-9011",
    detail: "por Coordinadora Sarah • hace 5m",
  },
  {
    id: 2,
    type: "rejected",
    label: "Rechazado: VL-8892",
    detail: "por Coordinador Mike • hace 12m",
  },
  {
    id: 3,
    type: "started",
    label: "Revisión Iniciada: VL-9032",
    detail: "por Coordinadora Sarah • hace 1h",
  },
];

export default function AdminDashboard() {
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  function handleApprove(id) {
    // TODO: conectar con el backend para aprobar el registro de horas.
    console.log("Aprobar", id);
  }

  function handleReject(id) {
    // TODO: conectar con el backend para rechazar el registro de horas.
    console.log("Rechazar", id);
  }

  const maxVolume = Math.max(...weeklyVolume.map((d) => d.value));

  return (
    <div className={styles.adminPage}>
      <header className={styles.pageHeader}>
        <div>
          <h1>Revisión de Evidencias Pendientes</h1>
          <p>
            Revisar y auditar las horas enviadas por la red de
            voluntarios.
          </p>
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

          <button type="button" className={styles.filterButton}>
            ≡ Filtros
          </button>
        </div>
      </header>

      <section className={styles.stats}>
        {summaryStats.map((stat) => (
          <article className={styles.statCard} key={stat.id}>
            <span className={styles.statLabel}>{stat.label}</span>

            <div className={styles.statValueRow}>
              <h2>{stat.value}</h2>
              <small>{stat.detail}</small>
            </div>
          </article>
        ))}
      </section>

      <div className={styles.tableCard}>
        <div
          className={`${styles.tableRow} ${styles.tableRowHead}`}
        >
          <span>Voluntario</span>
          <span>Fecha de Actividad</span>
          <span>Tipo de Actividad</span>
          <span>Duración</span>
          <span>Evidencia</span>
          <span className={styles.actionsHead}>Acciones</span>
        </div>

        {submissions.map((item) => (
          <div className={styles.tableRow} key={item.id}>
            <span className={styles.volunteerCell}>
              <i
                className={styles.avatar}
                style={{ background: item.avatarColor }}
              >
                {item.initials}
              </i>

              <span>
                <strong>{item.name}</strong>
                <small>ID: #{item.id}</small>
              </span>
            </span>

            <span>{item.date}</span>

            <span>
              <i className={styles.typeBadge}>{item.type}</i>
            </span>

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

        <div className={styles.pagination}>
          <span>Mostrando 1 a 4 de 24 entradas</span>

          <div className={styles.pageControls}>
            <button type="button" disabled={currentPage === 1}>
              Anterior
            </button>

            {[1, 2, 3].map((page) => (
              <button
                type="button"
                key={page}
                className={page === currentPage ? styles.pageActive : ""}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}

            <button type="button" onClick={() => setCurrentPage((p) => p + 1)}>
              Siguiente
            </button>
          </div>
        </div>
      </div>

      <section className={styles.bottomGrid}>
        <article className={styles.chartCard}>
          <h2>Tendencias de Volumen de Envíos</h2>

          <div className={styles.chart}>
            {weeklyVolume.map((item, index) => (
              <div className={styles.chartBarColumn} key={`${item.day}-${index}`}>
                <div
                  className={styles.chartBar}
                  style={{ height: `${(item.value / maxVolume) * 100}%` }}
                />
                <span>{item.day}</span>
              </div>
            ))}
          </div>
        </article>

        <article className={styles.auditCard}>
          <h2>Registros de Auditoría</h2>

          <ul className={styles.auditList}>
            {auditLog.map((entry) => (
              <li key={entry.id}>
                <i
                  className={`${styles.auditDot} ${
                    entry.type === "approved"
                      ? styles.dotApproved
                      : entry.type === "rejected"
                      ? styles.dotRejected
                      : styles.dotStarted
                  }`}
                />

                <div>
                  <strong>{entry.label}</strong>
                  <small>{entry.detail}</small>
                </div>
              </li>
            ))}
          </ul>

          <a href="#" className={styles.auditLink}>
            Ver Historial Completo
          </a>
        </article>
      </section>
    </div>
  );
}
