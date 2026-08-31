// Capa de datos del cliente: token de sesión + fetch autenticado + ayudantes
// compartidos entre los módulos de datos (admin, history, reports).
//
// Antes esto estaba replicado en cada *Data.js. Aquí vive una sola vez: el
// token se obtiene de Supabase y cada módulo conserva su serialización propia
// (listado vs historial devuelven formas distintas).
//
// M-5: Implementa refresh automático de token ante un 401. Supabase renueva el
// access token con el refresh token en segundo plano (getSession lo hace), así
// que un 401 suele ser transitorio. Reintentamos una vez con la sesión fresca.
import { supabase } from '@/lib/supabase/client';

// Token de sesión actual (undefined si no hay sesión activa).
export async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
}

// fetch con Bearer token y sin caché. Devuelve la Response cruda para que cada
// módulo procese su propio JSON (listado paginado, historial, reportes, PATCH).
//
// Si la respuesta es 401 (token expirado o inválido), intenta renovar la
// sesión con Supabase (que usa el refresh token) y reintenta UNA vez antes de
// redirigir a login. Así el usuario no tiene que relogear en cada expiración.
export async function fetchConToken(path, { method = 'GET', body } = {}) {
  let token = await getToken();

  if (!token) {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
    throw new Error('No hay sesión activa.');
  }

  const doFetch = (authToken) =>
    fetch(path, {
      cache: 'no-store',
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        Authorization: `Bearer ${authToken}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

  let response = await doFetch(token);

  // M-5: en 401, refrescar sesión con Supabase (usa refresh token) y reintentar.
  if (response.status === 401) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    const newToken = refreshed?.session?.access_token;

    if (newToken) {
      response = await doFetch(newToken);
    }

    // Si sigue fallando tras el reintento, redirigir a login.
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('Sesión expirada o inválida.');
    }
  }

  return response;
}
