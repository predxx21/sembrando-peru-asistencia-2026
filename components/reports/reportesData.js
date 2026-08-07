// Capa de datos del cliente para /reportes (patrón idéntico a adminData.js).
// getReportes() pide el token de Supabase y llama al endpoint admin. El mapper
// puro mapReportes vive en lib/utils/reportesFormato.js y se re-exporta aquí
// para que la UI lo use sin repetir la transformación.
import { supabase } from '@/lib/supabase/client';
import { mapReportes } from '@/lib/utils/reportesFormato';

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
}

export async function getReportes() {
  const token = await getToken();
  if (!token) throw new Error('No hay sesión activa.');

  const res = await fetch('/api/admin/reportes', {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json().catch(() => ({}));

  if (res.status === 401) throw new Error('No hay sesión activa.');
  if (res.status === 403) {
    // La página distingue este caso (err.status === 403) para mostrar el
    // mensaje de acceso restringido a quienes no son coordinadores.
    const err = new Error('Solo los coordinadores pueden ver los reportes.');
    err.status = 403;
    throw err;
  }
  if (!res.ok) throw new Error(body.error || 'Error al obtener los reportes.');

  return mapReportes(body.data);
}

export { mapReportes };
