"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getEvidenciaSignedUrl } from "@/lib/supabase/evidencias";
import styles from "./VerEvidencia.module.css";

const STATUS_CONFIG = {
  pendiente: { label: "Pendiente", className: "statusPending" },
  aprobado: { label: "Aprobado", className: "statusApproved" },
  rechazado: { label: "Rechazado", className: "statusRejected" },
};

export default function EvidenceViewer({ activity }) {
  const [zoomed, setZoomed] = useState(false);
  const [signedUrl, setSignedUrl] = useState(null);
  const [signedUrlError, setSignedUrlError] = useState("");

  const statusInfo = STATUS_CONFIG[activity.status] ?? STATUS_CONFIG.pendiente;

  // El bucket de evidencias es privado, así que la URL se pide al servidor
  // (vía /api/evidencias) y caduca a los pocos minutos.
  useEffect(() => {
    let cancelled = false;

    getEvidenciaSignedUrl(activity.id).then(({ url, error }) => {
      if (cancelled) return;
      if (error) {
        console.error("No se pudo obtener la evidencia:", error);
        setSignedUrlError("No hay evidencia adjunta para este registro.");
      } else {
        setSignedUrl(url);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activity.id]);

  function handleDownload() {
    if (signedUrl) {
      window.open(signedUrl, "_blank");
    }
  }

  return (
    <div className={styles.viewerPage}>
      <Link href="/historial" className={styles.backLink}>
        ← Volver al historial
      </Link>

      <div className={styles.summaryCard}>
        <div>
          <div className={styles.titleRow}>
            <h1>{activity.title}</h1>
            <span className={`${styles.statusPill} ${styles[statusInfo.className]}`}>
              {statusInfo.label}
            </span>
          </div>

          <span className={styles.metaRow}>
            ID de Registro: #{activity.id} • {activity.date}
          </span>
        </div>
      </div>

      {activity.status === "rechazado" && (
        <div className={styles.commentCard}>
          <i className={styles.commentIcon}>⚑</i>

          <div>
            <span className={styles.commentLabel}>Comentario del Coordinador</span>
            <p>&quot;{activity.coordinatorComment}&quot;</p>
            {activity.reviewedBy && (
              <span className={styles.reviewedBy}>
                👤 Revisado por: {activity.reviewedBy}
              </span>
            )}
          </div>

          <Link
            href={`/registro-editar/${activity.id}`}
            className={styles.correctButton}
          >
            Corregir Registro
          </Link>
        </div>
      )}

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
            {signedUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={signedUrl}
                alt={`Evidencia de la actividad ${activity.title}`}
                className={`${styles.evidenceImage} ${
                  zoomed ? styles.evidenceImageZoomed : ""
                }`}
              />
            ) : (
              <p>{signedUrlError || "Cargando evidencia..."}</p>
            )}
          </div>

          <div className={styles.imageCaption}>
            <strong>{activity.evidenceFileName}</strong>
          </div>
        </article>

        <aside className={styles.detailsCard}>
          <h2>ⓘ Detalles de Actividad</h2>

          <div className={styles.detailsRow}>
            <div className={styles.durationBlock}>
              <span className={styles.detailLabel}>Duración</span>
              <strong>
                {activity.hours}
                <small> hrs</small>
              </strong>
            </div>
          </div>

          <div className={styles.detailBlock}>
            <span className={styles.detailLabel}>Descripción</span>
            <p>{activity.description}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
