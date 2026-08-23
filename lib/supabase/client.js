// lib/supabase/client.js
// Cliente único de Supabase para TODO el frontend (browser).
// Usa la publishable key. Singleton para sobrevivir hot-reload en desarrollo.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
}

const globalForSupabase = globalThis;
const supabase = globalForSupabase.supabaseClient || createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
globalForSupabase.supabaseClient = supabase;

export { supabase };