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
// 2. Fetch de registros
// ============================================================
async function fetchRegistros(estado) {
  const token = await getToken();
  if (!token) throw new Error('No hay sesión activa.');

  // El servidor ya soporta filtrar por estado (?estado=pendiente);
  // usarlo evita bajar todos los registros para filtrarlos en el cliente.
  const query = estado ? `?estado=${encodeURIComponent(estado)}` : '';
  const res = await fetch(`/api/registros${query}`, {
    cache: 'no-store',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Error al obtener los registros');
  }
  const data = await res.json();
  return data.data || [];
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
    status: row.estado,
    description: row.descripcion,
    evidenceFileName: row.evidenciaUrl ? row.evidenciaUrl.split('/').pop() : 'Sin evidencia',
  };
}

// ============================================================
// 4. Funciones exportadas
// ============================================================
export async function getPendingSubmissions() {
  // El servidor ya devuelve solo pendientes vía ?estado=pendiente.
  const registros = await fetchRegistros('pendiente');
  return registros.map(mapActivity);
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