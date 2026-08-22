// Capa de datos del cliente: token de sesión + fetch autenticado + ayudantes
// compartidos entre los módulos de datos (admin, history, reports).
//
// Antes esto estaba replicado en cada *Data.js. Aquí vive una sola vez: el
// token se obtiene de Supabase y cada módulo conserva su serialización propia
// (listado vs historial devuelven formas distintas).
import { supabase } from '@/lib/supabase/client';

// Token de sesión actual (undefined si hay sesión activa... o el access token).
export async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
}

// fetch con Bearer token y sin caché. Devuelve la Response cruda para que cada
// módulo procese su propio JSON (listado paginado, historial, reportes, PATCH).
export async function fetchConToken(path, { method = 'GET', body } = {}) {
  const token = await getToken();
  if (!token) throw new Error('No hay sesión activa.');
  return fetch(path, {
    cache: 'no-store',
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}