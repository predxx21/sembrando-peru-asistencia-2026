// Capa de datos del Panel de administración.
//
// Reutiliza lib/api/client.js (token + fetch autenticado) y los helpers de
// fechas de lib/utils/fecha.js en vez de duplicarlos.
import { fetchConToken, nombreEvidencia } from '@/lib/api/client';
import { formatFechaEs } from '@/lib/utils/fecha';

// Fetch de registros (listado pendiente) con filtros opcionales. `estado`,
// `page` (1-based), `limit`, `busqueda`, `desde`, `hasta`. Devuelve
// { items, total, page, limit } para poder paginar en el servidor.
async function fetchRegistros(filtros = {}) {
  const params = new URLSearchParams();
  Object.entries(filtros).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, v);
  });
  const qs = params.toString();

  const res = await fetchConToken(`/api/registros${qs ? `?${qs}` : ''}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Error al obtener los registros');
  }
  const body = await res.json();
  const items = body.data || [];
  return {
    items,
    total: body.total ?? items.length,
    page: body.page,
    limit: body.limit,
  };
}

function mapActivity(row) {
  return {
    id: row.id,
    name: row.profile?.nombre || 'Voluntario',
    initials: row.profile?.nombre
      ? row.profile.nombre.charAt(0) + (row.profile.apellido?.charAt(0) || '')
      : 'V',
    avatarColor: '#197343',
    date: formatFechaEs(row.fecha),
    // Fecha en ISO para comparar en los filtros de rango (new Date() no debe
    // parsear la fecha ya formateada).
    isoDate: row.fecha,
    duration: `${row.horas} hrs`,
    horas: row.horas,
    status: row.estado,
    description: row.descripcion,
    evidenceFileName: nombreEvidencia(row.evidenciaUrl),
  };
}

// Trae la página actual de pendientes con filtros aplicados EN EL SERVIDOR
// (búsqueda por nombre y rango de fechas). Devuelve { items, total }.
export async function getPendingSubmissions({ page, limit, busqueda, desde, hasta } = {}) {
  const { items, total } = await fetchRegistros({
    estado: 'pendiente',
    page,
    limit,
    busqueda,
    desde,
    hasta,
  });
  return { items: items.map(mapActivity), total };
}

export async function reviewSubmission(id, estado, comentario) {
  const res = await fetchConToken(`/api/registros/${id}`, {
    method: 'PATCH',
    body: { estado, comentarioRevision: comentario },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Error al revisar el registro.');
  }

  const data = await res.json();
  return data.data;
}