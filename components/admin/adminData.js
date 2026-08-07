// components/admin/adminData.js

import { supabase } from '@/lib/supabase/client';

// ============================================================
// 1. Obtener token
// ============================================================
async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
}

// ============================================================
// 2. Fetch de registros (listado) con filtros opcionales
// ============================================================
// `estado`, `page` (1-based), `limit`, `busqueda`, `desde`, `hasta`. Devuelve
// { items, total, page, limit } para poder paginar en el servidor.
async function fetchRegistros(filtros = {}) {
  const token = await getToken();
  if (!token) throw new Error('No hay sesión activa.');

  const params = new URLSearchParams();
  Object.entries(filtros).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, v);
  });
  const qs = params.toString();

  const res = await fetch(`/api/registros${qs ? `?${qs}` : ''}`, {
    cache: 'no-store',
    headers: { 'Authorization': `Bearer ${token}` },
  });
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

// ============================================================
// 3. Transformar datos
// ============================================================
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
    name: row.profile?.nombre || 'Voluntario',
    initials: row.profile?.nombre ? row.profile.nombre.charAt(0) + (row.profile.apellido?.charAt(0) || '') : 'V',
    avatarColor: '#197343',
    date: formatDate(row.fecha),
    // Fecha en ISO para comparar en los filtros de rango (new Date() no debe
    // parsear la fecha ya formateada).
    isoDate: row.fecha,
    duration: `${row.horas} hrs`,
    horas: row.horas,
    status: row.estado,
    description: row.descripcion,
    evidenceFileName: row.evidenciaUrl ? row.evidenciaUrl.split('/').pop() : 'Sin evidencia',
  };
}

// ============================================================
// 4. Funciones exportadas
// ============================================================
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
  const token = await getToken();
  if (!token) throw new Error('No hay sesión activa.');

  const res = await fetch(`/api/registros/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ estado, comentarioRevision: comentario }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Error al revisar el registro.');
  }

  const data = await res.json();
  return data.data;
}