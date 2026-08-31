import { supabase } from '@/lib/supabase/client';

export async function registerUser({
  nombre,
  apellido,
  email,
  password,
  areaId, // ✅ nuevo parámetro
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

  const token = data?.session?.access_token;

  if (token) {
    try {
      const response = await fetch('/api/auth/perfil', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        // ✅ Enviar areaId junto con nombre y apellido
        body: JSON.stringify({ nombre, apellido, areaId }),
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