"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { reviewSubmission } from "./adminData";
import styles from "./EvidenceReview.module.css";
import { ESTADO_LABEL } from "@/lib/utils/estado";
import { formatFechaEs } from "@/lib/utils/fecha";

const STATUS_CONFIG = {
  pendiente: { label: ESTADO_LABEL.pendiente, className: "statusPending" },
  aprobado: { label: ESTADO_LABEL.aprobado, className: "statusApproved" },
  rechazado: { label: ESTADO_LABEL.rechazado, className: "statusRejected" },
};

export default function EvidenceReview() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submission, setSubmission] = useState(null);
  const [signedUrl, setSignedUrl] = useState(null);
  const [zoomed, setZoomed] = useState(false);

  // Estado de la revisión desde este mismo visor (aprobado/rechazado).
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState("");
  const [aviso, setAviso] = useState("");

  // Aprobar o rechazar sin recargar nada: se actualiza el estado local y la
  // sección de revisión desaparece. Si la petición falla, se muestra el error.
  async function revisar(estado) {
    if (estado === "rechazado" && !motivo.trim()) {
      setAviso("Debes indicar el motivo del rechazo.");
      return;
    }

    setEnviando(estado);
    setAviso("");

    try {
      await reviewSubmission(
        submission.id,
        estado,
        estado === "aprobado"
          ? motivo.trim() || "Aprobado por el coordinador."
          : motivo.trim()
      );
      setSubmission((prev) => ({ ...prev, status: estado }));
      setMotivo("");
      setAviso(
        `✅ Registro ${estado === "aprobado" ? "aprobado" : "rechazado"} correctamente.`
      );
    } catch (err) {
      console.error("Error al revisar el registro:", err);
      setAviso("❌ " + (err.message || "No se pudo revisar el registro."));
    } finally {
      setEnviando("");
    }
  }

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
          date: formatFechaEs(registro.fecha),
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

      {submission.status === "pendiente" && (
        <section className={styles.actionCard}>
          <h2>Revisión de evidencia</h2>

          <label className={styles.detailLabel} htmlFor="motivoRevision">
            Motivo (obligatorio al rechazar)
          </label>
          <textarea
            id="motivoRevision"
            value={motivo}
            onChange={(event) => setMotivo(event.target.value)}
            placeholder="Escribe aquí el motivo de tu decisión..."
            rows={3}
          />

          <div className={styles.actionButtons}>
            <button
              type="button"
              className={styles.approveButton}
              disabled={Boolean(enviando)}
              onClick={() => revisar("aprobado")}
            >
              {enviando === "aprobado" ? "Aprobando..." : "✓ Aprobar"}
            </button>

            <button
              type="button"
              className={styles.rejectButton}
              disabled={Boolean(enviando)}
              onClick={() => revisar("rechazado")}
            >
              {enviando === "rechazado" ? "Rechazando..." : "✕ Rechazar"}
            </button>
          </div>

          {aviso && <p className={styles.reviewAviso}>{aviso}</p>}
        </section>
      )}

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