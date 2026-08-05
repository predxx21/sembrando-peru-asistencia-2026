'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import styles from './RegistrarHoras.module.css';

function calculateHours(startTime, endTime) {
  if (!startTime || !endTime) return 0;
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  const diff = endMinutes - startMinutes;
  if (diff <= 0) return 0;
  return Math.round((diff / 60) * 10) / 10;
}

export default function FormularioHoras() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fecha: '',
    horaInicio: '',
    horaFin: '',
    descripcion: '',
  });
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const horasCalculadas = calculateHours(formData.horaInicio, formData.horaFin);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function addFiles(newFiles) {
    const accepted = Array.from(newFiles).filter((file) =>
      ['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)
    );
    setFiles((prev) => [...prev, ...accepted]);
  }

  function handleFileChange(event) {
    addFiles(event.target.files);
    event.target.value = '';
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
    setFormData({ fecha: '', horaInicio: '', horaFin: '', descripcion: '' });
    setFiles([]);
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

  if (files.length === 0) {
    setMensaje('❌ Debes adjuntar al menos una evidencia (imagen o PDF).');
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

    // 2. Subir evidencia a Supabase Storage
    const file = files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('evidencias')
      .upload(fileName, file);

    if (uploadError) {
      throw new Error('Error al subir la evidencia: ' + uploadError.message);
    }

    // 3. Guardar el registro en la API (con token)
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
        horas: horasCalculadas,
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
    setFiles([]);

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