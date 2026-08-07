// Capa de datos del cliente para /reportes.
import { fetchConToken } from '@/lib/api/client';
import { mapReportes } from '@/lib/utils/reportesFormato';

export async function getReportes() {
  const res = await fetchConToken('/api/admin/reportes');
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