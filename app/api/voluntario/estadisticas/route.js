import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase/authServer';
import { getPerfilByUserId } from '@/lib/db/perfil';
import { prisma } from '@/lib/db/client';

export async function GET(request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const { profile, error: perfilError } = await getPerfilByUserId(user.id);
  if (perfilError || !profile) {
    return NextResponse.json({ error: 'Perfil no encontrado.' }, { status: 404 });
  }

  const profileId = profile.id;

  const [total, aprobadas, pendientes, rechazados] = await Promise.all([
    prisma.registroAsistencia.aggregate({
      where: { profileId },
      _sum: { horas: true },
    }),
    prisma.registroAsistencia.aggregate({
      where: { profileId, estado: 'aprobado' },
      _sum: { horas: true },
    }),
    prisma.registroAsistencia.aggregate({
      where: { profileId, estado: 'pendiente' },
      _sum: { horas: true },
    }),
    prisma.registroAsistencia.count({
      where: { profileId, estado: 'rechazado' },
    }),
  ]);

  return NextResponse.json({
    data: {
      totalHoras: total._sum.horas || 0,
      horasAprobadas: aprobadas._sum.horas || 0,
      horasPendientes: pendientes._sum.horas || 0,
      rechazados: rechazados || 0,
    }
  });
}