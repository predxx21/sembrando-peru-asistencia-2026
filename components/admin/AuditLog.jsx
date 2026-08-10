"use client";

import Link from "next/link";
import styles from "./AdminDashboard.module.css";

// Lista de auditoría: últimos registros aprobados o rechazados con su revisor.
export default function AuditLog({ entries }) {
  return (
    <article className={styles.auditCard}>
      <h2>Registros de Auditoría</h2>
      {entries.length > 0 ? (
        <ul className={styles.auditList}>
          {entries.map((entry) => (
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
      ) : (
        <p>No hay registros de auditoría.</p>
      )}
      <Link href="/reportes" className={styles.auditLink}>
        Ver Historial Completo
      </Link>
    </article>
  );
}