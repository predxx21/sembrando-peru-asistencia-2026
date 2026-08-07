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

// GET: Listar registros.
//
// Filtros opcionales (query params): estado, busqueda, desde, hasta.
// Alcance:
//   - scope=mine      → solo los del usuario actual (cualquier rol). Lo usa
//                       el historial para que el admin vea ÚNICAMENTE lo suyo.
//   - admin (sin scope) → todos los registros (cola de revisión).
//   - voluntario        → solo los suyos.
// Paginación: page (1-based) + limit → devuelve { data, total, page, limit }.
export async function GET(request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const { profile, error: perfilError } = await getPerfilByUserId(user.id);
  if (perfilError || !profile) {
    return NextResponse.json({ error: 'No se encontró tu perfil.' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const pageRaw = Number(searchParams.get('page'));
  const limitRaw = Number(searchParams.get('limit'));
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : null;
  const limit = Number.isInteger(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : null;

  const filtros = {
    estado: searchParams.get('estado') || undefined,
    busqueda: searchParams.get('busqueda') || undefined,
    desde: searchParams.get('desde') || undefined,
    hasta: searchParams.get('hasta') || undefined,
    page,
    limit,
  };

  const scope = searchParams.get('scope') === 'mine' ? 'mine' : null;

  let result;
  if (scope === 'mine') {
    result = await obtenerRegistrosPorUsuario(profile.id, filtros);
  } else if (profile.rol === 'admin') {
    result = await obtenerTodosLosRegistros(filtros);
  } else {
    result = await obtenerRegistrosPorUsuario(profile.id, filtros);
  }

  if (result.error) {
    return NextResponse.json({ error: 'No se pudieron obtener los registros.' }, { status: 500 });
  }

  const body = { data: result.data };
  if (page && limit) {
    body.total = result.total;
    body.page = page;
    body.limit = limit;
  }

  return NextResponse.json(body);
}