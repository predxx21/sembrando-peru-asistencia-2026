import { supabase } from '@/lib/supabase/client';

async function fetchRegistros() {
  // Obtener el token de sesión
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    throw new Error('No hay sesión activa.');
  }

  // scope=mine: SIEMPRE solo los registros del usuario actual (independiente
  // del rol). Así el historial de un admin no muestra los de los demás.
  const res = await fetch('/api/registros?scope=mine', {
    cache: 'no-store',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error('Error al obtener los registros');
  }
  const data = await res.json();
  return data.data || [];
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function mapActivity(row) {
  return {
    id: row.id,
    title: row.descripcion,
    description: row.descripcion,
    date: formatDate(row.fecha),
    // Fecha ISO para poder inicializar el <input type="date"> de la pantalla
    // de corrección (necesita "YYYY-MM-DD", no la fecha ya formateada).
    isoDate: row.fecha,
    startTime: row.horaInicio,
    endTime: row.horaFin,
    hours: row.horas,
    status: row.estado,
    // Nombre del archivo de evidencia (la URL firmada se obtiene por separado
    // con getEvidenciaSignedUrl porque el bucket es privado).
    evidenceFileName: row.evidenciaUrl ? row.evidenciaUrl.split('/').pop() : 'Sin evidencia',
    coordinatorComment: row.comentarioRevision || '',
    reviewedBy: row.revisor ? row.revisor.nombre : '',
  };
}

export async function getHistoryActivities() {
  const registros = await fetchRegistros();
  return registros.map(mapActivity);
}

export async function getActivityById(id) {
  const registros = await fetchRegistros();
  // 👇 Convertir a número porque Prisma usa Int (igual que en adminData.js).
  // El id llega como string desde useParams().
  const row = registros.find(r => Number(r.id) === Number(id));
  return row ? mapActivity(row) : null;
}