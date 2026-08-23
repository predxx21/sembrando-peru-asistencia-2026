import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase/authServer';
import { obtenerAreasActivas } from '@/lib/db/areas';

// GET /api/areas - Lista todas las áreas activas (para selects de perfil)
// Requiere autenticación (cualquier usuario logeado puede ver las áreas).
export async function GET(request) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const { data, error } = await obtenerAreasActivas();

  if (error) {
    return NextResponse.json(
      { error: 'No se pudieron obtener las áreas.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ areas: data });
}
