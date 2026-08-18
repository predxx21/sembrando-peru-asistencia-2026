import { supabase } from '@/lib/supabase/client';

export async function restablecerContrasena(password) {
  return supabase.auth.updateUser({ password });
}