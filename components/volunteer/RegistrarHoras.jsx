'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { calcularHoras } from '@/lib/utils/horas';
import { comprimirImagen, superaBytes } from '@/lib/utils/imagen';
import styles from './RegistrarHoras.module.css';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
// Límite de tamaño por evidencia (5 MB) y meta mensual de horas aprobadas.
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const META_MENSUAL = 30;

export default function FormularioHoras() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fecha: '',
    horaInicio: '',
    horaFin: '',
    descripcion: '',
  });
  // Una sola evidencia por archivo (imagen o PDF).
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mensaje, setMensaje] = useState('');
  // Horas aprobadas del mes actual (para la tarjeta "Tu Historial").
  const [horasMes, setHorasMes] = useState(0);

  const horasCalculadas = calcularHoras(formData.horaInicio, formData.horaFin);

  // Carga las horas aprobadas del mes para mostrar cifras reales (no texto
  // hardcodeado). Si falla, el formulario sigue funcionando sin esa cifra.
  useEffect(() => {
    let active = true;

    async function cargarHorasMes() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      try {
        // scope=mine: solo los registros del usuario actual (para un admin no
        // mezclar las horas de todos los voluntarios en "Tu Historial").
        const res = await fetch('/api/registros?scope=mine', {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) return;

        const ahora = new Date();
        const total = (body.data || []).reduce((sum, r) => {
          const fecha = new Date(r.fecha);
          const enEsteMes =
            fecha.getMonth() === ahora.getMonth() &&
            fecha.getFullYear() === ahora.getFullYear();
          if (r.estado === 'aprobado' && enEsteMes) {
            return sum + (Number(r.horas) || 0);
          }
          return sum;
        }, 0);

        if (active) setHorasMes(Math.round(total * 10) / 10);
      } catch {
        // Silencioso: no bloquea el registro si el cálculo falla.
      }
    }

    cargarHorasMes();
    return () => {
      active = false;
    };
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  // Valida tipo y tamaño (5 MB en bruto), luego comprime la imagen antes de
  // subirla: reescala a ~1600px y re-codifica (JPEG o PNG si hay transparencia).
  // Con eso se usa menos storage y el visor de evidencia descarga un archivo mucho menor.
  async function pickFile(selected) {
    if (!ACCEPTED_TYPES.includes(selected.type)) {
      setFileError('Formato no soportado. Solo se permiten imágenes JPEG, PNG o WebP.');
      return;
    }
    if (superaBytes(selected.size, MAX_FILE_SIZE)) {
      setFileError('El archivo supera los 5 MB. Usa una imagen más pequeña.');
      return;
    }
    setFileError('');
    try {
      const preparado = await comprimirImagen(selected);
      setFile(preparado);
    } catch (err) {
      setFileError(err.message || 'Error al procesar la imagen.');
    }
  }

  async function handleFileChange(event) {
    const selected = event.target.files[0];
    if (selected) await pickFile(selected);
    event.target.value = '';
  }

  async function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    const selected = event.dataTransfer.files[0];
    if (selected) await pickFile(selected);
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
    setFileError('');
  }

  function handleCancel() {
    setFormData({ fecha: '', horaInicio: '', horaFin: '', descripcion: '' });
    setFile(null);
    setFileError('');
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
      // El servidor obtiene el userId del token (Authorization); no se manda
      // en el body. userId aquí solo se usa para la carpeta del Storage.
      body: JSON.stringify({
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
          <label>Adjuntar Evidencia (Imágenes)</label>

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
            <span>Las imágenes se comprimen automáticamente. Máx 5 MB: JPG, PNG, WebP.</span>

            <input
              id="evidenciaInput"
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              className={styles.hiddenInput}
              onChange={handleFileChange}
            />
          </div>

          {fileError && <p className={styles.fileError}>{fileError}</p>}

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
              coordinador.
            </p>
          </div>
        </article>

        <article className={styles.infoCard}>
          <div className={styles.infoIcon}>⇲</div>
          <div>
            <h3>Tu Historial</h3>
            <p>
              {horasMes > 0
                ? `Llevas ${horasMes} horas aprobadas este mes.`
                : 'Aún no tienes horas aprobadas este mes. Registra tus actividades para acumular horas.'}
            </p>
          </div>
        </article>
      </section>
    </div>
  );
}