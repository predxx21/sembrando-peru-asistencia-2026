"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { calcularHoras } from "@/lib/utils/horas";
import styles from "./CorregirActividad.module.css";

export default function CorrectionForm({ activity }) {
  const router = useRouter();

  // activity.isoDate llega como ISO con hora ("2026-08-06T..."); el input
  // type="date" necesita solo "YYYY-MM-DD", así que se recorta.
  const [fecha, setFecha] = useState(activity.isoDate?.slice(0, 10) || "");
  const [horaInicio, setHoraInicio] = useState(activity.startTime);
  const [horaFin, setHoraFin] = useState(activity.endTime);
  const [descripcion, setDescripcion] = useState(activity.description);
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const calculatedHours = useMemo(
    () => calcularHoras(horaInicio, horaFin),
    [horaInicio, horaFin]
  );

  async function handleSubmit(event) {
    event.preventDefault();

    if (!fecha || !horaInicio || !horaFin || !descripcion) {
      setMensaje("Completa todos los campos obligatorios.");
      return;
    }

    if (calculatedHours <= 0) {
      setMensaje("La hora de fin debe ser mayor que la hora de inicio.");
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
          horaInicio,
          horaFin,
          descripcion,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "No se pudo reenviar el registro.");
      }

      router.push("/historial");
    } catch (err) {
      console.error("Error al corregir el registro:", err);
      setMensaje("" + (err.message || "No se pudo guardar la corrección."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.correctionPage}>
      <Link href="/historial" className={styles.backLink}>
        ← Volver al historial
      </Link>

      <span className={styles.rejectedFlag}>
        ⚠ RECHAZADO - Requiere corrección
      </span>

      <h1>Corregir Registro de Actividad</h1>
      <p className={styles.subtitle}>
        ID de Registro: #{activity.id} • Fecha de envío: {activity.date}
      </p>

      <div className={styles.commentCard}>
        <i className={styles.commentIcon}>⚑</i>

        <div>
          <span className={styles.commentLabel}>Comentario del Coordinador</span>
          <p>"{activity.coordinatorComment}"</p>
          {activity.reviewedBy && (
            <span className={styles.reviewedBy}>
              Revisado por: {activity.reviewedBy}
            </span>
          )}
        </div>
      </div>

      <form className={styles.contentGrid} onSubmit={handleSubmit}>
        <div className={styles.formCard}>
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

            <div className={styles.field}>
              <label htmlFor="horaInicio">Hora Inicio</label>
              <input
                id="horaInicio"
                type="time"
                value={horaInicio}
                onChange={(event) => setHoraInicio(event.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="horaFin">Hora Fin</label>
              <input
                id="horaFin"
                type="time"
                value={horaFin}
                onChange={(event) => setHoraFin(event.target.value)}
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
            />
          </div>
        </div>

        <aside className={styles.sidePanel}>
          <article className={styles.summaryCard}>
            <h2>Resumen de Horas</h2>

            <div className={styles.summaryRow}>
              <span>Duración calculada</span>
              <strong>{calculatedHours} Horas</strong>
            </div>
          </article>

          <article className={styles.infoCard}>
            <i className={styles.infoIcon}>ⓘ</i>

            <div>
              <strong>Importante</strong>
              <p>
                Al reenviar este registro, pasará a una nueva revisión por
                parte de la coordinación.
              </p>
            </div>
          </article>

          <div className={styles.sideImage}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/bosque-sembrando-peru.jpg"
              alt="Trabajo de campo en Sembrando Perú"
            />
          </div>

          <button type="submit" className={styles.submitButton} disabled={saving}>
            {saving ? "Enviando..." : "▷ Guardar y Reenviar"}
          </button>

          {mensaje && <p className={styles.mensaje}>{mensaje}</p>}

          <Link href="/historial" className={styles.cancelLink}>
            Cancelar
          </Link>
        </aside>
      </form>
    </div>
  );
}