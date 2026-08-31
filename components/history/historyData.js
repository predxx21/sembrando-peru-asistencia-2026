// Capa de datos del historial del voluntario.
import { fetchConToken } from '@/lib/api/client';
import { formatFechaEs } from '@/lib/utils/fecha';

async function fetchRegistros({ page = 1, limit = 6 } = {}) {
  const queryParams = new URLSearchParams({
    scope: 'mine',
    page: page.toString(),
    limit: limit.toString(),
  });

  const res = await fetchConToken(`/api/registros?${queryParams}`);
  if (!res.ok) {
    throw new Error('Error al obtener los registros');
  }
  const data = await res.json();
  return data; // { data: [...], total: 50 }
}

function mapActivity(row) {
  return {
    id: row.id,
    title: row.descripcion,
    description: row.descripcion,
    date: formatFechaEs(row.fecha),
    isoDate: row.fecha,
    startTime: row.horaInicio,
    endTime: row.horaFin,
    hours: row.horas,
    status: row.estado,
    coordinatorComment: row.comentarioRevision || '',
    reviewedBy: row.revisor ? row.revisor.nombre : '',
    reviewedAt: row.fechaRevision,
    horaInicioReal: row.horaInicioReal,
    sesionActiva: row.sesionActiva || false,
    areaId: row.profile?.areaId || null,
    area: row.profile?.area?.nombre || null,
  };
}

// Obtiene una página del historial con paginación en servidor
export async function getHistoryActivities({ page = 1, limit = 6 } = {}) {
  const { data, total } = await fetchRegistros({ page, limit });
  return {
    activities: data.map(mapActivity),
    total,
    page,
    limit,
  };
}

// Devuelve UN registro (pantalla de detalle)
export async function getActivityById(id) {
  const res = await fetchConToken(`/api/registros/${id}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Error al obtener el registro.');
  }
  const { data } = await res.json();
  return data ? mapActivity(data) : null;
}