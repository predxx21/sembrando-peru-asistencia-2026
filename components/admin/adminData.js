import { supabase } from '@/lib/supabase/client';

async function fetchRegistros() {
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

export async function getSubmissions() {
  const registros = await fetchRegistros();
  return registros.map(mapActivity);
}

export async function getSubmissionById(id) {
  const registros = await fetchRegistros();
  const row = registros.find(r => r.id === id);
  return row ? mapActivity(row) : null;
}

// Para compatibilidad con el código existente que espera un array
export const submissions = await getSubmissions();