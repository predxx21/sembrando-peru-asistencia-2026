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
  // public.profiles (Postgres, vía Prisma). El endpoint exige sesión: si la
  // confirmación de email está activa, el signUp no devuelve sesión y se
  // OMITE el POST aquí — el perfil se creará en el primer login (login.js ya
  // hace el upsert de seguridad).
  const token = data?.session?.access_token;

  if (token) {
    try {
      const response = await fetch('/api/auth/perfil', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nombre, apellido }),
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