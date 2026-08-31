import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';

export async function GET() {
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