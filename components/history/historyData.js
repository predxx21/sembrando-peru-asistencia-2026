import { supabase } from '@/lib/supabase/client';

async function fetchRegistros() {
  // Obtener el token de sesión
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    throw new Error('No hay sesión activa.');
  }

  const res = await fetch('/api/registros', {
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
    isoDate: row.fecha,
    startTime: row.horaInicio,
    endTime: row.horaFin,
    hours: row.horas,
    type: row.tipo || 'Actividad',
    status: row.estado,
    evidencePhoto: row.evidenciaUrl,
    evidenceFileName: row.evidenciaUrl ? row.evidenciaUrl.split('/').pop() : 'Sin evidencia',
    location: row.ubicacion || 'Sin ubicación',
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
  const row = registros.find(r => r.id === id);
  return row ? mapActivity(row) : null;
}