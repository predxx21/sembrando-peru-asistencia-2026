// Capa de datos del historial del voluntario.
//
// Reutiliza lib/api/client.js (token + fetch autenticado) y los helpers de
// fechas de lib/utils/fecha.js en vez de duplicarlos.
import { fetchConToken } from '@/lib/api/client';
import { formatFechaEs } from '@/lib/utils/fecha';

async function fetchRegistros() {
  // scope=mine: SIEMPRE solo los registros del usuario actual (independiente
  // del rol). Así el historial de un admin no muestra los de los demás.
  const res = await fetchConToken('/api/registros?scope=mine');
  if (!res.ok) {
    throw new Error('Error al obtener los registros');
  }
  const data = await res.json();
  return data.data || [];
}

function mapActivity(row) {
  return {
    id: row.id,
    title: row.descripcion,
    description: row.descripcion,
    date: formatFechaEs(row.fecha),
    // Fecha ISO para poder inicializar el <input type="date"> de la pantalla
    // de corrección (necesita "YYYY-MM-DD", no la fecha ya formateada).
    isoDate: row.fecha,
    startTime: row.horaInicio,
    endTime: row.horaFin,
    hours: row.horas,
    status: row.estado,
    coordinatorComment: row.comentarioRevision || '',
    reviewedBy: row.revisor ? row.revisor.nombre : '',
    reviewedAt: row.fechaRevision,
    // NUEVO: Campos del cronómetro
    horaInicioReal: row.horaInicioReal,
    areaId: row.profile?.areaId || null,
    area: row.profile?.area?.nombre || null,
  };
}

export async function getHistoryActivities() {
  const registros = await fetchRegistros();
  return registros.map(mapActivity);
}

// Devuelve UN registro (pantalla de detalle). Usa el endpoint puntual
// /api/registros/[id] en vez de descargar todo el historial y filtrar
// (misma optimización que hace el panel de administración).
export async function getActivityById(id) {
  const res = await fetchConToken(`/api/registros/${id}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Error al obtener el registro.');
  }
  const { data } = await res.json();
  return data ? mapActivity(data) : null;
}