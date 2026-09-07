import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';

// Catálogo público de áreas (solo id + nombre de áreas activas).
// Se usa en la pantalla de REGISTRO, donde el voluntario aún no tiene sesión,
// por eso deliberadamente NO exige autenticación. No expone datos sensibles.
// Todo otro consumo debe pasar por `/api/areas` (exige sesión).
export async function GET() {
  try {
    const areas = await prisma.area.findMany({
      where: { activa: true },
      orderBy: { orden: 'asc' },
      select: { id: true, nombre: true },
    });
    return NextResponse.json({ areas });
  } catch (error) {
    console.error('Error al cargar áreas públicas:', error);
    return NextResponse.json(
      { error: 'Error al cargar áreas' },
      { status: 500 }
    );
  }
}