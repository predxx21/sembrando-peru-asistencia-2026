// Helpers de sesión para el navegador (client-side).
//
// El rol vive en Postgres (Profile.rol), así que se lee vía /api/auth/me:
// el cliente manda el Bearer token y el servidor devuelve datos + rol.
// Estos helpers centralizan eso para que sidebar, guards del portal y
// login/registro no dupliquen la lógica.
import { supabase } from '@/lib/supabase/client';

export async function getSesion() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// Usuario + rol, o lanza error si no hay sesión o el servidor no responde.
export async function getUsuarioActual() {
  const session = await getSesion();
  if (!session?.access_token) throw new Error('No hay sesión activa.');

  const res = await fetch('/api/auth/me', {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  const body = await res.json().catch(() => ({}));

  if (!res.ok) throw new Error(body.error || 'No se pudo obtener el usuario.');

  const data = body.data;
  return {
    id: data.id,
    email: data.email,
    nombre: data.nombre,
    apellido: data.apellido,
    rol: data.rol,
  };
}

// Rol actual, o null si no hay sesión / error (nunca lanza).
export async function obtenerRolActual() {
  try {
    const usuario = await getUsuarioActual();
    return usuario.rol;
  } catch {
    return null;
  }
}

// Página de inicio según el rol (admin → administración, resto → principal).
export function rutaPorRol(rol) {
  return rol === 'admin' ? '/administracion' : '/principal';
}

// Rutas exclusivas de admin: si un rol distinto intenta abrirlas, el guard
// del portal lo devuelve a /principal.
export function isAdminRoute(pathname) {
  return (
    pathname === '/administracion' ||
    pathname.startsWith('/administracion/') ||
    pathname === '/reportes' ||
    pathname.startsWith('/reportes/')
  );
}