// lib/supabase/authServer.js
//
// Valida el access token que el cliente manda en el header Authorization
// y devuelve el usuario de Supabase Auth correspondiente. Se usa en Route
// Handlers para saber "quién está pidiendo esto" antes de autorizar nada.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Cliente reutilizable: en una misma pantalla se validan varios requests con
// el mismo token; no hace falta instanciar un cliente nuevo en cada llamada.
const supabase = createClient(supabaseUrl, supabasePublishableKey);

// Cache de corta vida (TTL) keyed by token con el fin de no pagar el
// round-trip a Supabase Auth en cada request. Vive en `globalThis` (igual que
// el singleton de Prisma) para sobrevivir al hot-reload de Next.js en
// desarrollo. La caducidad es corta (~60 s) para que un usuario
// desactivado/bloqueado se re-verifique a los pocos segundos.
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

  const ahora = Date.now();

  // Hit de cache dentro del TTL → devolvemos el usuario ya validado.
  const cached = authCache.get(token);
  if (cached && cached.expira > ahora) {
    return cached.user;
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    // No guardamos en cache los fallos: si fue un error transitorio, la
    // siguiente llamada reintenta de verdad.
    return null;
  }

  authCache.set(token, { user: data.user, expira: ahora + CACHE_TTL_MS });
  return data.user;
}