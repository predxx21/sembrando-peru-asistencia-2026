"use client";

import { useState } from "react";
import styles from "./RegistrarHoras.module.css";

export default function FormularioHoras() {
  const [formData, setFormData] = useState({
    fecha: "",
    horaInicio: "",
    horaFin: "",
    descripcion: "",
  });

  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function addFiles(newFiles) {
    const accepted = Array.from(newFiles).filter((file) =>
      ["image/jpeg", "image/png", "application/pdf"].includes(file.type)
    );

    setFiles((prev) => [...prev, ...accepted]);
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

  function removeFile(index) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleCancel() {
    setFormData({ fecha: "", horaInicio: "", horaFin: "", descripcion: "" });
    setFiles([]);
  }

  function handleSubmit(event) {
    event.preventDefault();
    // TODO: conectar con el backend para enviar el registro a revisión.
    console.log("Registro de horas:", formData, files);
  }

  return (
    <div className={styles.formPage}>
      <header className={styles.pageHeader}>
        <h1>Registrar Horas de Voluntariado</h1>
        <p>
          Documenta tu impacto. Completa el formulario a continuación para
          validar tus horas de servicio.
        </p>
      </header>

      <form className={styles.formCard} onSubmit={handleSubmit}>
        <div className={styles.fieldsRow}>
          <div className={styles.field}>
            <label htmlFor="fecha">Fecha de la Actividad</label>
            <input
              type="date"
              id="fecha"
              name="fecha"
              value={formData.fecha}
              onChange={handleChange}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="horaInicio">Hora de Inicio</label>
            <input
              type="time"
              id="horaInicio"
              name="horaInicio"
              value={formData.horaInicio}
              onChange={handleChange}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="horaFin">Hora de Fin</label>
            <input
              type="time"
              id="horaFin"
              name="horaFin"
              value={formData.horaFin}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="descripcion">Descripción de la Actividad</label>
          <textarea
            id="descripcion"
            name="descripcion"
            rows={4}
            placeholder="Describe brevemente las tareas realizadas durante este periodo..."
            value={formData.descripcion}
            onChange={handleChange}
          />
        </div>

        <div className={styles.field}>
          <label>Adjuntar Evidencia (Imágenes o PDF)</label>

          <div
            className={`${styles.dropzone} ${
              isDragging ? styles.dropzoneActive : ""
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById("evidenciaInput").click()}
          >
            <div className={styles.dropzoneIcon}>⇪</div>
            <strong>Arrastra archivos aquí o haz clic</strong>
            <span>Tamaño máximo por archivo: 5MB. Formatos: JPG, PNG, PDF.</span>

            <input
              id="evidenciaInput"
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.pdf"
              className={styles.hiddenInput}
              onChange={handleFileChange}
            />
          </div>

          {files.length > 0 && (
            <ul className={styles.fileList}>
              {files.map((file, index) => (
                <li key={`${file.name}-${index}`}>
                  <span>{file.name}</span>

                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    aria-label={`Quitar ${file.name}`}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.formActions}>
          <button type="submit" className={styles.primaryButton}>
            ▷ Enviar para Revisión
          </button>

          <button
            type="button"
            className={styles.secondaryButton}
            onClick={handleCancel}
          >
            Cancelar
          </button>
        </div>
      </form>

      <section className={styles.infoGrid}>
        <article className={styles.infoCard}>
          <div className={styles.infoIcon}>ⓘ</div>

          <div>
            <h3>Información Importante</h3>
            <p>
              Recuerda que todas las horas deben ser validadas por un
              coordinador. Adjuntar fotos o capturas de pantalla agiliza el
              proceso de auditoría.
            </p>
          </div>
        </article>

        <article className={styles.infoCard}>
          <div className={styles.infoIcon}>⇲</div>

          <div>
            <h3>Tu Historial</h3>
            <p>
              Llevas acumuladas 24.5 horas este mes. ¡Sigue así, estás a
              solo 5.5 horas de tu meta mensual!
            </p>
          </div>
        </article>
      </section>
    </div>
  );
}
