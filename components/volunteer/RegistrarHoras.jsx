'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { calcularHoras } from '@/lib/utils/horas';
import styles from './RegistrarHoras.module.css';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

export default function FormularioHoras() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fecha: '',
    horaInicio: '',
    horaFin: '',
    descripcion: '',
  });
  // Una sola evidencia por registro (imagen o PDF).
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const horasCalculadas = calcularHoras(formData.horaInicio, formData.horaFin);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function pickFile(selected) {
    if (!ACCEPTED_TYPES.includes(selected.type)) return;
    setFile(selected);
  }

  function handleFileChange(event) {
    const selected = event.target.files[0];
    if (selected) pickFile(selected);
    event.target.value = '';
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    const selected = event.dataTransfer.files[0];
    if (selected) pickFile(selected);
  }

  function handleDragOver(event) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function removeFile() {
    setFile(null);
  }

  function handleCancel() {
    setFormData({ fecha: '', horaInicio: '', horaFin: '', descripcion: '' });
    setFile(null);
    setMensaje('');
  }

  async function handleSubmit(event) {
  event.preventDefault();

  const { fecha, horaInicio, horaFin, descripcion } = formData;

  if (!fecha || !horaInicio || !horaFin || !descripcion) {
    setMensaje('❌ Completa todos los campos obligatorios.');
    return;
  }

  if (horasCalculadas <= 0) {
    setMensaje('❌ La hora de fin debe ser mayor que la hora de inicio.');
    return;
  }

  if (!file) {
    setMensaje('❌ Debes adjuntar una evidencia (imagen o PDF).');
    return;
  }

  setIsSubmitting(true);
  setMensaje('');

  try {
    // 1. Obtener usuario y token
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      throw new Error('No hay sesión activa. Inicia sesión nuevamente.');
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      throw new Error('No se pudo obtener el usuario autenticado.');
    }
    const userId = userData.user.id;

    // 2. Subir la evidencia a Supabase Storage (bucket privado)
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('evidencias')
      .upload(fileName, file);

    if (uploadError) {
      throw new Error('Error al subir la evidencia: ' + uploadError.message);
    }

    // 3. Guardar el registro en la API (con token). El servidor recalcula
    //    las horas a partir de horaInicio/horaFin (no confía en el cliente).
    const response = await fetch('/api/registros', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        userId,
        fecha,
        horaInicio,
        horaFin,
        descripcion,
        evidenciaUrl: fileName,
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || 'Error al guardar el registro.');
    }

    setMensaje('✅ Registro guardado exitosamente. Será revisado por la coordinación.');
    setFormData({ fecha: '', horaInicio: '', horaFin: '', descripcion: '' });
    setFile(null);

    setTimeout(() => {
      router.push('/historial');
    }, 3000);
  } catch (err) {
    console.error('Error en el registro:', err);
    setMensaje('❌ ' + (err.message || 'Error al guardar el registro. Inténtalo nuevamente.'));
  } finally {
    setIsSubmitting(false);
  }
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
              required
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
              required
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
              required
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
            required
          />
        </div>

        <div className={styles.field}>
          <label>Adjuntar Evidencia (Imágenes o PDF)</label>

          <div
            className={`${styles.dropzone} ${
              isDragging ? styles.dropzoneActive : ''
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('evidenciaInput').click()}
          >
            <div className={styles.dropzoneIcon}>⇪</div>
            <strong>Arrastra archivos aquí o haz clic</strong>
            <span>Tamaño máximo por archivo: 5MB. Formatos: JPG, PNG, PDF.</span>

            <input
              id="evidenciaInput"
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              className={styles.hiddenInput}
              onChange={handleFileChange}
            />
          </div>

          {file && (
            <ul className={styles.fileList}>
              <li>
                <span>{file.name}</span>
                <button
                  type="button"
                  onClick={removeFile}
                  aria-label={`Quitar ${file.name}`}
                >
                  ✕
                </button>
              </li>
            </ul>
          )}
        </div>

        <div className={styles.formActions}>
          <button
            type="submit"
            className={styles.primaryButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Enviando...' : '▷ Enviar para Revisión'}
          </button>

          <button
            type="button"
            className={styles.secondaryButton}
            onClick={handleCancel}
          >
            Cancelar
          </button>
        </div>

        {mensaje && <p className={styles.mensaje}>{mensaje}</p>}
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