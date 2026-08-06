"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import styles from "./EvidenceReview.module.css";

const STATUS_CONFIG = {
  pendiente: { label: "Pendiente", className: "statusPending" },
  aprobado: { label: "Aprobado", className: "statusApproved" },
  rechazado: { label: "Rechazado", className: "statusRejected" },
};

export default function EvidenceReview() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submission, setSubmission] = useState(null);
  const [signedUrl, setSignedUrl] = useState(null);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        // 1. Obtener token
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) {
          throw new Error('No hay sesión activa.');
        }

        // 2. Hacer fetch con token
        const res = await fetch(`/api/registros/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "No se pudo cargar el registro.");
        }

        const data = await res.json();
        const registro = data.data;

        setSubmission({
          id: registro.id,
          name: registro.profile?.nombre || "Voluntario",
          initials: registro.profile?.nombre ? registro.profile.nombre.charAt(0) + (registro.profile.apellido?.charAt(0) || "") : "V",
          avatarColor: "#197343",
          date: new Date(registro.fecha).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" }),
          duration: `${registro.horas} hrs`,
          status: registro.estado,
          description: registro.descripcion,
          evidenceFileName: registro.evidenciaUrl ? registro.evidenciaUrl.split("/").pop() : "Sin evidencia",
        });
        setSignedUrl(registro.evidenciaSignedUrl);
      } catch (err) {
        console.error("Error al cargar evidencia:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) return <p>Cargando evidencia...</p>;
  if (error) return <p>Error: {error}</p>;
  if (!submission) return <p>No se encontró el registro.</p>;

  const statusInfo = STATUS_CONFIG[submission.status] ?? STATUS_CONFIG.pendiente;

  function handleDownload() {
    if (signedUrl) {
      window.open(signedUrl, "_blank");
    }
  }

  return (
    <div className={styles.viewerPage}>
      <Link href="/administracion" className={styles.backLink}>
        ← Volver al listado
      </Link>

      <div className={styles.summaryCard}>
        <div className={styles.volunteerInfo}>
          <i className={styles.avatar} style={{ background: submission.avatarColor }}>
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
              <button type="button" className={styles.iconButton} onClick={() => setZoomed(false)} aria-label="Alejar">
                🔍−
              </button>
              <button type="button" className={styles.iconButton} onClick={() => setZoomed(true)} aria-label="Acercar">
                🔍+
              </button>
              <button type="button" className={styles.downloadButton} onClick={handleDownload}>
                ⬇ Descargar Imagen
              </button>
            </div>
          </div>
          <div className={styles.imageFrame}>
            {signedUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={signedUrl}
                alt={`Evidencia de ${submission.name}`}
                className={`${styles.evidenceImage} ${zoomed ? styles.evidenceImageZoomed : ""}`}
              />
            ) : (
              <p>No hay imagen disponible.</p>
            )}
          </div>
          <div className={styles.imageCaption}>
            <strong>{submission.evidenceFileName}</strong>
            <span>• URL válida por 5 minutos</span>
          </div>
        </article>

        <aside className={styles.sidePanel}>
          <article className={styles.detailsCard}>
            <h2>ⓘ Detalles de Actividad</h2>
            <div className={styles.detailsRow}>
              <div className={styles.durationBlock}>
                <span className={styles.detailLabel}>Duración</span>
                <strong>{submission.duration}</strong>
              </div>
            </div>
            <div className={styles.detailBlock}>
              <span className={styles.detailLabel}>Descripción</span>
              <p>{submission.description}</p>
            </div>
          </article>
        </aside>
      </div>
    </div>
  );
}