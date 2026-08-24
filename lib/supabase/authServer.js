// lib/supabase/authServer.js
//
// Valida el access token que el cliente manda en el header Authorization
// y devuelve el usuario de Supabase Auth correspondiente. Se usa en Route
// Handlers para saber "quién está pidiendo esto" antes de autorizar nada.
//
// Seguridad: cache keyed by user.id (no por token) para reducir ventana de
// exposición si un token es robado. Siempre validamos el token con Supabase
// en cada request (fuente de verdad), y cacheamos el usuario por su ID para
// que requests subsiguientes del mismo usuario (con tokens válidos) sean rápidos.
import { supabaseAdmin } from './server';

// Cache por user.id (no por token). TTL 60s: usuario desactivado se re-verifica.
const CACHE_TTL_MS = 60 * 1000;
const globalForAuth = globalThis;
const authCache = globalForAuth.authCache || new Map();
globalForAuth.authCache = authCache;

export async function getUserFromRequest(request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;

  if (!token) {
    return null;
  }

  // 1. Validar token con Supabase (fuente de verdad) - SIEMPRE
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data?.user) {
    return null;
  }

  const user = data.user;
  const ahora = Date.now();

  // 2. Cache hit por user.id → devolvemos usuario ya validado
  const cached = authCache.get(user.id);
  if (cached && cached.expira > ahora) {
    return cached.user;
  }

  // 3. Guardar en cache por user.id
  authCache.set(user.id, { user, expira: ahora + CACHE_TTL_MS });
  return user;
}