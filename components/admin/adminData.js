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
async function fetchRegistros() {
  const token = await getToken();
  if (!token) throw new Error('No hay sesión activa.');

  const res = await fetch('/api/registros', {
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
    type: row.tipo || 'Actividad',
    duration: `${row.horas} hrs`,
    status: row.estado,
    description: row.descripcion,
    location: row.ubicacion || 'Sin ubicación',
    evidencePhoto: row.evidenciaUrl,
    evidenceFileName: row.evidenciaUrl ? row.evidenciaUrl.split('/').pop() : 'Sin evidencia',
    evidenceFileSize: 'N/A',
  };
}

// ============================================================
// 4. Funciones exportadas
// ============================================================
export async function getSubmissions() {
  const registros = await fetchRegistros();
  return registros.map(mapActivity);
}

export async function getPendingSubmissions() {
  const registros = await fetchRegistros();
  return registros
    .filter(r => r.estado === 'pendiente')
    .map(mapActivity);
}

export async function getSubmissionById(id) {
  const registros = await fetchRegistros();
  // 👇 Convertir a número porque Prisma usa Int
  const row = registros.find(r => Number(r.id) === Number(id));
  return row ? mapActivity(row) : null;
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