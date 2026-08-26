"use client";

import { formatFechaEs } from "@/lib/utils/fecha";
import styles from "./AdminDashboard.module.css";

// Lista de auditoría: últimos registros aprobados o rechazados.
// Recibe: { id, estado, fechaRevision, revisor: { nombre } }
export default function AuditLog({ entries }) {
  const estadoLabel = (estado) =>
    estado === "aprobado" ? "Aprobado" : "Rechazado";

  return (
    <article className={styles.auditCard}>
      {(entries?.length ?? 0) > 0 ? (
        <ul className={styles.auditList}>
          {entries.map((entry) => (
            <li key={entry.id}>
              <i
                className={`${styles.auditDot} ${
                  entry.estado === "aprobado"
                    ? styles.dotApproved
                    : styles.dotRejected
                }`}
              />
              <div>
                <strong>
                  {estadoLabel(entry.estado)}: por{" "}
                  {entry.revisor?.nombre || "Coordinador"}
                </strong>
                <small>
                  {entry.fechaRevision ? formatFechaEs(entry.fechaRevision) : "—"}
                </small>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p>No hay registros de auditoría.</p>
      )}
    </article>
  );
}