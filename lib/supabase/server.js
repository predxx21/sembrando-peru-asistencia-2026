// lib/supabase/server.js
// Cliente de Supabase con SERVICE ROLE KEY para uso en servidor (Route Handlers).
// SOLO se usa server-side. Nunca exponer SUPABASE_SERVICE_ROLE_KEY al cliente.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.');
}

const globalForSupabaseServer = globalThis;
const supabaseAdmin = globalForSupabaseServer.supabaseAdminClient || createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
globalForSupabaseServer.supabaseAdminClient = supabaseAdmin;

export { supabaseAdmin };