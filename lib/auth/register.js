import { supabase } from '@/lib/supabase/client';

export async function registerUser({
  nombre,
  apellido,
  email,
  password,
}) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        nombre,
        apellido,
      },
    },
  });

  if (error) {
    return { data, error };
  }

  // Supabase Auth ya creó el usuario. Ahora creamos su fila en
  // public.profiles (Postgres, vía Prisma) usando el mismo id.
  const userId = data?.user?.id;

  if (userId) {
    try {
      const response = await fetch('/api/auth/perfil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, nombre, apellido }),
      });

      if (!response.ok) {
        return {
          data,
          error: { message: 'Tu cuenta se creó, pero no se pudo guardar tu perfil. Intenta iniciar sesión para reintentarlo.' },
        };
      }
    } catch {
      return {
        data,
        error: { message: 'Tu cuenta se creó, pero no se pudo guardar tu perfil (sin conexión). Intenta iniciar sesión para reintentarlo.' },
      };
    }
  }

  return { data, error: null };
}