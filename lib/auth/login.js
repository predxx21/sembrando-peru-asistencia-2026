import { supabase } from "@/lib/supabase/client";

export async function loginUser(email, password) {
  const result = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  const userId = result.data?.user?.id;

  // Red de seguridad: si por algún motivo el perfil no se creó durante el
  // registro (ej. la pestaña se cerró justo después del signUp), lo creamos
  // aquí usando los metadatos que Supabase Auth guardó del usuario. Es
  // idempotente (upsert), así que en el caso normal no hace nada. El id se
  // toma del token de sesión: el endpoint ya no acepta el id del body.
  if (userId) {
    try {
      await fetch('/api/auth/perfil', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${result.data.session?.access_token}`,
        },
        body: JSON.stringify({
          nombre: result.data.user.user_metadata?.nombre,
          apellido: result.data.user.user_metadata?.apellido,
        }),
      });
    } catch {
      // No bloqueamos el login si esto falla; el usuario ya está autenticado.
    }
  }

  return result;
}