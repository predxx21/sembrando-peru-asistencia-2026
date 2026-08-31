// lib/supabase/authServer.js
//
// Valida el access token que el cliente manda en el header Authorization
// y devuelve el usuario de Supabase Auth correspondiente. Se usa en Route
// Handlers para saber "quién está pidiendo esto" antes de autorizar nada.
//
// Optimización: cachea por hash del token (no por user.id) para poder
// saltarse la validación con Supabase en requests subsiguientes.
// TTL 60s: un token revocado o usuario desactivado se detecta al expirar.
import { supabaseAdmin } from './server';
import crypto from 'crypto';

const CACHE_TTL_MS = 60 * 1000;
const globalForAuth = globalThis;
const authCache = globalForAuth.authCache || new Map();
globalForAuth.authCache = authCache;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function getUserFromRequest(request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;

  if (!token) {
    return null;
  }

  const tokenHash = hashToken(token);
  const ahora = Date.now();

  // 1. Revisar caché por hash del token
  const cached = authCache.get(tokenHash);
  if (cached && cached.expira > ahora) {
    return cached.user;
  }

  // 2. No hay caché o expiró → validar con Supabase
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    // Si el token es inválido, no cacheamos el error (podría ser temporal)
    return null;
  }

  // 3. Guardar en caché (clave = hash del token)
  authCache.set(tokenHash, {
    user: data.user,
    expira: ahora + CACHE_TTL_MS,
  });

  return data.user;
}