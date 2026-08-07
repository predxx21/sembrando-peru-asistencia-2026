import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase/authServer';
import { getPerfilByUserId } from '@/lib/db/perfil';
import { obtenerReportes } from '@/lib/db/reportes';

// Reportes consolidados para /reportes (exclusivo de admin). Espejo de
// /api/admin/estadisticas: valida sesión, exige rol=admin y devuelve todo
// en UNA sola respuesta HTTP.
export async function GET(request) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const { profile, error: perfilError } = await getPerfilByUserId(user.id);
  if (perfilError || !profile || profile.rol !== 'admin') {
    return NextResponse.json(
      { error: 'No tienes permisos de administrador.' },
      { status: 403 }
    );
  }

  const { data, error } = await obtenerReportes();

  if (error || !data) {
    return NextResponse.json(
      { error: 'No se pudieron obtener los reportes.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}
