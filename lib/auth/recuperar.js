import { supabase } from '@/lib/supabase/client';

export async function solicitarRecuperacion(email) {
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/restablecer-contrasena`;
  return supabase.auth.resetPasswordForEmail(email, { redirectTo });
}