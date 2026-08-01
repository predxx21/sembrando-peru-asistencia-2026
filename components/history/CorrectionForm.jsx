"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import styles from "./CorrectionForm.module.css";

function calculateHours(startTime, endTime) {
  if (!startTime || !endTime) return 0;

  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  const diff = endMinutes - startMinutes;
  if (diff <= 0) return 0;

  return Math.round((diff / 60) * 10) / 10;
}

export default function CorrectionForm({ activity }) {
  const [fecha, setFecha] = useState(activity.isoDate);
  const [horaInicio, setHoraInicio] = useState(activity.startTime);
  const [horaFin, setHoraFin] = useState(activity.endTime);
  const [descripcion, setDescripcion] = useState(activity.description);
  const [oldFileDismissed, setOldFileDismissed] = useState(false);
  const [newFiles, setNewFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  const calculatedHours = useMemo(
    () => calculateHours(horaInicio, horaFin),
    [horaInicio, horaFin]
  );

  function addFiles(fileList) {
    const accepted = Array.from(fileList).filter((file) =>
      ["image/jpeg", "image/png", "application/pdf"].includes(file.type)
    );

    setNewFiles((prev) => [...prev, ...accepted]);
  }

  function handleFileChange(event) {
    addFiles(event.target.files);
    event.target.value = "";
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    addFiles(event.dataTransfer.files);
  }

  function handleDragOver(event) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function removeNewFile(index) {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(event) {
    event.preventDefault();
    // TODO: conectar con el backend para reenviar el registro corregido a revisión.
    console.log("Guardar y reenviar", activity.id, {
      fecha,
      horaInicio,
      horaFin,
      descripcion,
      newFiles,
    });
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
          <p>&quot;{activity.coordinatorComment}&quot;</p>
          {activity.reviewedBy && (
            <span className={styles.reviewedBy}>
              👤 Revisado por: {activity.reviewedBy}
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

          <div className={styles.field}>
            <label>Evidencia Fotográfica / Documento</label>

            {!oldFileDismissed && (
              <div className={styles.oldFileRow}>
                <i className={styles.oldFileIcon}>🚫🖼</i>

                <div className={styles.oldFileInfo}>
                  <strong>{activity.evidenceFileName}</strong>
                  <span>Archivo anterior rechazado por el coordinador.</span>
                </div>

                <button
                  type="button"
                  className={styles.oldFileRemove}
                  onClick={() => setOldFileDismissed(true)}
                  aria-label="Quitar archivo anterior"
                >
                  ✕
                </button>
              </div>
            )}

            <div
              className={`${styles.dropzone} ${
                isDragging ? styles.dropzoneActive : ""
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById("newEvidenceInput").click()}
            >
              <div className={styles.dropzoneIcon}>⬆</div>
              <strong>Subir nueva evidencia</strong>
              <span>Arrastra un archivo o haz clic para buscar (JPG, PNG, PDF)</span>

              <input
                id="newEvidenceInput"
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.pdf"
                className={styles.hiddenInput}
                onChange={handleFileChange}
              />
            </div>

            {newFiles.length > 0 && (
              <ul className={styles.fileList}>
                {newFiles.map((file, index) => (
                  <li key={`${file.name}-${index}`}>
                    <span>{file.name}</span>

                    <button
                      type="button"
                      onClick={() => removeNewFile(index)}
                      aria-label={`Quitar ${file.name}`}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <aside className={styles.sidePanel}>
          <article className={styles.summaryCard}>
            <h2>Resumen de Horas</h2>

            <div className={styles.summaryRow}>
              <span>Duración calculada</span>
              <strong>{calculatedHours} Horas</strong>
            </div>

            <div className={styles.summaryRow}>
              <span>Categoría</span>
              <i className={styles.typeBadge}>{activity.type}</i>
            </div>
          </article>

          <article className={styles.infoCard}>
            <i className={styles.infoIcon}>ⓘ</i>

            <div>
              <strong>Importante</strong>
              <p>
                Al reenviar este registro, pasará a una nueva revisión por
                parte de la coordinación. Recibirás una notificación una vez
                sea aprobado.
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

          <button type="submit" className={styles.submitButton}>
            ▷ Guardar y Reenviar
          </button>

          <Link href="/historial" className={styles.cancelLink}>
            Cancelar
          </Link>
        </aside>
      </form>
    </div>
  );
}
