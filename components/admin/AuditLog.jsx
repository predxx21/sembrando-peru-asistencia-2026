"use client";

import Link from "next/link";
import { formatFechaEs } from "@/lib/utils/fecha";
import styles from "./AdminDashboard.module.css";

// Lista de auditoría: últimos registros aprobados o rechazados con su revisor.
// Recibe datos reales de Prisma: { id, estado, fechaRevision, revisor: { nombre } }
export default function AuditLog({ entries }) {
  return (
    <article className={styles.auditCard}>
      <h2>Registros de Reportes</h2>
      {(entries?.length ?? 0) > 0 ? (
        <ul className={styles.auditList}>
          {entries.map((entry) => (
            <li key={entry.id}>
              <i
                className={`${styles.auditDot} ${
                  entry.estado === "aprobado"
                    ? styles.dotApproved
                    : entry.estado === "rechazado"
                    ? styles.dotRejected
                    : styles.dotStarted
                }`}
              />
              <div>
                <strong>{entry.revisor?.nombre || "Coordinador"}</strong>
                <small>{entry.fechaRevision ? formatFechaEs(entry.fechaRevision) : "—"}</small>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p>No hay registros de reportes.</p>
      )}
      <Link href="/administracion/auditoria" className={styles.auditLink}>
        Ver Historial Completo
      </Link>
    </article>
  );
}