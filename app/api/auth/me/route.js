import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase/authServer';
import { getPerfilByUserId } from '@/lib/db/perfil';

// Devuelve el usuario autenticado y su rol (para la UI: sidebar, guard del
// portal y redirección por rol tras el login). El backend ya valida sesión y
// rol en cada endpoint; esto solo le dice al navegador quién es.
export async function GET(request) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const { profile, error } = await getPerfilByUserId(user.id);

  if (error || !profile) {
    return NextResponse.json(
      { error: 'No se encontró tu perfil.' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    data: {
      id: user.id,
      email: user.email,
      nombre: profile.nombre,
      apellido: profile.apellido,
      rol: profile.rol,
    },
  });
}