import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase/authServer';
import { getPerfilByUserId } from '@/lib/db/perfil';
import { guardarRegistroAsistencia, obtenerRegistrosPorUsuario } from '@/lib/db/registro';

// Crea un registro de asistencia. El cliente ya subió la evidencia a
// Supabase Storage y solo nos manda el path; aquí guardamos el registro en
// Postgres vía Prisma (no se puede hacer desde el navegador). El dueño del
// registro sale del token, nunca de lo que mande el body.
export async function POST(request) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  if (!body?.fecha || !body?.horaInicio || !body?.horaFin || !body?.descripcion) {
    return NextResponse.json({ error: 'Faltan datos obligatorios.' }, { status: 400 });
  }

  const { profile, error: perfilError } = await getPerfilByUserId(user.id);

  if (perfilError || !profile) {
    return NextResponse.json({ error: 'No se encontró tu perfil.' }, { status: 404 });
  }

  const { data, error } = await guardarRegistroAsistencia({
    profileId: profile.id,
    fecha: body.fecha,
    horaInicio: body.horaInicio,
    horaFin: body.horaFin,
    horas: body.horas,
    descripcion: body.descripcion,
    evidenciaUrl: body.evidenciaUrl,
  });

  if (error) {
    return NextResponse.json({ error: 'No se pudo guardar el registro.' }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// Lista los registros del usuario autenticado (Historial / Panel).
export async function GET(request) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const { profile, error: perfilError } = await getPerfilByUserId(user.id);

  if (perfilError || !profile) {
    return NextResponse.json({ error: 'No se encontró tu perfil.' }, { status: 404 });
  }

  const { data, error } = await obtenerRegistrosPorUsuario(profile.id);

  if (error) {
    return NextResponse.json({ error: 'No se pudieron obtener tus registros.' }, { status: 500 });
  }

  return NextResponse.json({ data });
}
