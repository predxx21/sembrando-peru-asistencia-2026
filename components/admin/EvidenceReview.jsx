"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { reviewSubmission } from "./adminData";
import styles from "./EvidenceReview.module.css";

const STATUS_CONFIG = {
  pendiente: { label: "Pendiente", className: "statusPending" },
  aprobado: { label: "Aprobado", className: "statusApproved" },
  rechazado: { label: "Rechazado", className: "statusRejected" },
};

export default function EvidenceReview({ submission }) {
  const [status, setStatus] = useState(submission.status);
  const [note, setNote] = useState("");
  const [zoomed, setZoomed] = useState(false);

  const statusInfo = STATUS_CONFIG[status] ?? STATUS_CONFIG.pendiente;

  async function handleApprove() {
    await reviewSubmission(submission.id, "aprobado", note);
    setStatus("aprobado");
  }

  async function handleReject() {
    await reviewSubmission(submission.id, "rechazado", note);
    setStatus("rechazado");
  }

  function handleDownload() {
    // TODO: descargar la imagen real desde el backend.
    console.log("Descargar evidencia", submission.evidenceFileName);
  }

  return (
    <div className={styles.reviewPage}>
      <div className={styles.summaryCard}>
        <div className={styles.volunteerInfo}>
          <i
            className={styles.avatar}
            style={{ background: submission.avatarColor }}
          >
            {submission.initials}
          </i>

          <div>
            <div className={styles.nameRow}>
              <strong>{submission.name}</strong>
              <span className={styles.idBadge}>#{submission.id}</span>
            </div>

            <span className={styles.dateRow}>📅 {submission.date}</span>
          </div>
        </div>

        <div className={styles.statusColumn}>
          <span className={styles.statusLabel}>Estado de Revisión</span>
          <span className={`${styles.statusPill} ${styles[statusInfo.className]}`}>
            {statusInfo.label}
          </span>
        </div>
      </div>

      <div className={styles.contentGrid}>
        <article className={styles.viewerCard}>
          <div className={styles.viewerHeader}>
            <h2>👁 Visor de Evidencia</h2>

            <div className={styles.viewerActions}>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => setZoomed(false)}
                aria-label="Alejar imagen"
              >
                🔍−
              </button>

              <button
                type="button"
                className={styles.iconButton}
                onClick={() => setZoomed(true)}
                aria-label="Acercar imagen"
              >
                🔍+
              </button>

              <button
                type="button"
                className={styles.downloadButton}
                onClick={handleDownload}
              >
                ⬇ Descargar Imagen
              </button>
            </div>
          </div>

          <div className={styles.imageFrame}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <Image
              src={submission.evidencePhoto}
              alt={`Evidencia de actividad de ${submission.name}`}
              width={900}
              height={650}
              className={`${styles.evidenceImage} ${
                zoomed ? styles.evidenceImageZoomed : ""
              }`}
            />
          </div>

          <div className={styles.imageCaption}>
            <strong>{submission.evidenceFileName}</strong>
            <span>{submission.evidenceFileSize} • Subida desde App Móvil</span>
          </div>
        </article>

        <aside className={styles.sidePanel}>
          <article className={styles.detailsCard}>
            <h2>ⓘ Detalles de Actividad</h2>

            <div className={styles.detailsRow}>
              <div>
                <span className={styles.detailLabel}>Tipo</span>
                <i className={styles.typeBadge}>{submission.type}</i>
              </div>

              <div className={styles.durationBlock}>
                <span className={styles.detailLabel}>Duración</span>
                <strong>
                  {submission.duration.replace(" hrs", "")}
                  <small> hrs</small>
                </strong>
              </div>
            </div>

            <div className={styles.detailBlock}>
              <span className={styles.detailLabel}>Descripción</span>
              <p>{submission.description}</p>
            </div>

            <div className={styles.detailBlock}>
              <span className={styles.detailLabel}>Ubicación Registrada</span>
              <span className={styles.locationRow}>
                📍 {submission.location}
              </span>
            </div>
          </article>

          <article className={styles.actionCard}>
            <h2>🛡 Panel de Acción</h2>

            <label className={styles.detailLabel} htmlFor="coordinatorNote">
              Notas del Coordinador
            </label>

            <textarea
              id="coordinatorNote"
              rows={4}
              placeholder="Añadir observaciones sobre la evidencia presentada..."
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />

            <div className={styles.actionButtons}>
              <button
                type="button"
                className={styles.rejectButton}
                onClick={handleReject}
              >
                Rechazar
              </button>

              <button
                type="button"
                className={styles.approveButton}
                onClick={handleApprove}
              >
                Aprobar
              </button>
            </div>
          </article>

          <Link href="/administracion" className={styles.backLink}>
            ← Regresar al Listado
          </Link>
        </aside>
      </div>
    </div>
  );
}
