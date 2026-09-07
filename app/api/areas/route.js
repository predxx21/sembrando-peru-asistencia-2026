import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase/authServer';
import { prisma } from '@/lib/db/client';

// Lista de áreas activas. Requiere sesión. El REGISTRO de voluntarios usa el
// catálogo público `/api/areas/publico` (aún no hay sesión en ese momento).
export async function GET(request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  try {
    const areas = await prisma.area.findMany({
      where: { activa: true },
      orderBy: { orden: 'asc' },
      select: { id: true, nombre: true },
    });
    return NextResponse.json({ areas });
  } catch (error) {
    console.error('Error al cargar áreas:', error);
    return NextResponse.json(
      { error: 'Error al cargar áreas' },
      { status: 500 }
    );
  }
}