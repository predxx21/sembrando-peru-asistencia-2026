import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase/authServer';
import { getPerfilByUserId } from '@/lib/db/perfil';
import {
  guardarRegistroAsistencia,
  obtenerRegistrosPorUsuario,
  obtenerTodosLosRegistros,
} from '@/lib/db/registro';

// POST: Crear un registro de asistencia
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
    descripcion: body.descripcion,
    evidenciaUrl: body.evidenciaUrl,
  });

  if (error) {
    return NextResponse.json({ error: 'No se pudo guardar el registro.' }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// GET: Listar registros (con filtro opcional por estado)
export async function GET(request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const { profile, error: perfilError } = await getPerfilByUserId(user.id);
  if (perfilError || !profile) {
    return NextResponse.json({ error: 'No se encontró tu perfil.' }, { status: 404 });
  }

  // Obtener query params para filtro de estado
  const { searchParams } = new URL(request.url);
  const estado = searchParams.get('estado') || undefined;

  let data, error;
  if (profile.rol === 'admin') {
    // Si es admin, devuelve todos los registros (opcionalmente filtrados por estado)
    const result = await obtenerTodosLosRegistros({ estado });
    data = result.data;
    error = result.error;
  } else {
    // Si es voluntario, solo sus propios registros (opcionalmente filtrados)
    // Nota: obtenerRegistrosPorUsuario no soporta filtro de estado, pero podemos agregarlo o filtrar después
    const result = await obtenerRegistrosPorUsuario(profile.id);
    data = result.data;
    error = result.error;
    if (estado) {
      data = data.filter(r => r.estado === estado);
    }
  }

  if (error) {
    return NextResponse.json({ error: 'No se pudieron obtener los registros.' }, { status: 500 });
  }

  return NextResponse.json({ data });
}