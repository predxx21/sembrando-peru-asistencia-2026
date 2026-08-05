// lib/supabase/admin.js
//
// ⚠️ SOLO USAR DESDE EL SERVIDOR (Route Handlers, Server Components, etc.).
// Nunca importar este archivo desde un componente 'use client': la
// service role key bypassea TODAS las políticas de Storage/RLS, así que
// si llega al bundle del navegador cualquiera podría leer las evidencias
// de cualquier voluntario.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    'Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY. ' +
    'Agrega SUPABASE_SERVICE_ROLE_KEY (sin prefijo NEXT_PUBLIC_) a tu .env.local.'
  );
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
