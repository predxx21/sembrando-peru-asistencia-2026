"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { formatFechaEs } from "@/lib/utils/fecha";
import styles from "./CorregirActividad.module.css";

export default function CorrectionForm({ activity }) {
  const router = useRouter();
  const [fecha, setFecha] = useState(activity.isoDate?.slice(0, 10) || "");
  const [descripcion, setDescripcion] = useState(activity.description || "");
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const horasOriginales = activity.hours || 0;

  async function handleSubmit(event) {
    event.preventDefault();

    if (!fecha || !descripcion.trim()) {
      setMensaje("Completa todos los campos obligatorios.");
      return;
    }

    setSaving(true);
    setMensaje("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        throw new Error("No hay sesión activa. Inicia sesión nuevamente.");
      }

      const res = await fetch(`/api/registros/${activity.id}/corregir`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fecha,
          descripcion: descripcion.trim(),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "No se pudo reenviar el registro.");
      }

      router.push("/historial");
    } catch (err) {
      console.error("Error al corregir el registro:", err);
      setMensaje(err.message || "No se pudo guardar la corrección.");
    } finally {
      setSaving(false);
    }
  }

  if (activity.sesionActiva) {
    return (
      <div className={styles.correctionPage}>
        <Link href="/historial" className={styles.backLink}>
          ← Volver al historial
        </Link>
        <div className={styles.blockedNotice}>
          <span className={styles.blockedIcon}>⛔</span>
          <div>
            <h3>No puedes corregir este registro</h3>
            <p>
              El cronómetro está activo para esta jornada. 
              Finaliza la sesión primero y luego podrás corregir la descripción.
            </p>
          </div>
        </div>
        <Link href="/historial" className={styles.cancelLink}>
          Volver al historial
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.correctionPage}>
      <Link href="/historial" className={styles.backLink}>
        ← Volver al historial
      </Link>

      <h1>Corregir Registro de Actividad</h1>
      <p className={styles.subtitle}>
        Fecha de envío: {activity.date}
      </p>

      <div className={styles.commentCard}>
        <i className={styles.commentIcon}>⚑</i>
        <div>
          <span className={styles.commentLabel}>Comentario del Coordinador</span>
          <p>"{activity.coordinatorComment || "Sin comentario"}"</p>
          {activity.reviewedBy && (
            <span className={styles.reviewedBy}>
              Revisado por: {activity.reviewedBy}
            </span>
          )}
        </div>
      </div>

      <form className={styles.contentGrid} onSubmit={handleSubmit}>
        {/* Columna izquierda: Formulario */}
        <div className={styles.leftColumn}>
          <div className={styles.formCard}>
            {/* Información de la jornada (solo lectura) */}
            <div className={styles.infoSection}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Duración registrada</span>
                <span className={styles.infoValue}>
                  {horasOriginales.toFixed(2)} horas
                </span>
                <span className={styles.infoNote}>
                  (Registrada automáticamente por el cronómetro)
                </span>
              </div>
            </div>

            <div className={styles.fieldsRow}>
              <div className={styles.field}>
                <label htmlFor="fecha">Fecha de la Actividad</label>
                <input
                  id="fecha"
                  type="date"
                  value={fecha}
                  onChange={(event) => setFecha(event.target.value)}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="descripcion">Descripción de la Actividad</label>
              <textarea
                id="descripcion"
                rows={4}
                value={descripcion}
                onChange={(event) => setDescripcion(event.target.value)}
                placeholder="Describe brevemente lo que hiciste durante la jornada..."
              />
            </div>
          </div>
        </div>

        {/* Columna derecha: Sidebar */}
        <div className={styles.rightColumn}>
          <article className={styles.summaryCard}>
            <h2>Resumen de la Jornada</h2>

            <div className={styles.summaryRow}>
              <span>Duración (cronómetro)</span>
              <strong>{horasOriginales.toFixed(2)} Horas</strong>
            </div>

            <div className={styles.summaryRow}>
              <span>Estado actual</span>
              <strong className={styles.statusRejected}>Rechazado</strong>
            </div>

            <div className={styles.summaryRow}>
              <span>Próximo estado</span>
              <strong className={styles.statusPending}>Pendiente</strong>
            </div>
          </article>

          <button type="submit" className={styles.submitButton} disabled={saving}>
            {saving ? "Enviando..." : "Reenviar a Revisión"}
          </button>

          {mensaje && <p className={styles.mensaje}>{mensaje}</p>}

          <Link href="/historial" className={styles.cancelLink}>
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}