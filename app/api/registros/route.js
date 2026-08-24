import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase/authServer';
import { getPerfilByUserId } from '@/lib/db/perfil';
import {
  guardarRegistroAsistencia,
  obtenerRegistrosPorUsuario,
  obtenerTodosLosRegistros,
} from '@/lib/db/registro';
import { getCached, setCached, invalidateCacheByPrefix } from '@/lib/cache';
import { esFechaValida, esHoraValida, esHoraFinMayorAInicio, esUUIDValido } from '@/lib/utils/validar';

// Listados de registros: TTL corto (30 s) porque cambian con cada aprobación
// o nuevo registro. La clave incluye el usuario y TODOS los filtros, así cada
// combinación (scope=mine, estado, paginación, búsqueda, rango) tiene su
// propia entrada. Las escrituras invalidan las claves con prefijo 'registros:'.
const CACHE_TTL_MS = 30 * 1000;
const CACHE_KEY_PREFIX = 'registros:';

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

  if (!esFechaValida(body.fecha) || !esHoraValida(body.horaInicio) || !esHoraValida(body.horaFin)) {
    return NextResponse.json(
      { error: 'Fecha u horas inválidas. Usa AAAA-MM-DD para la fecha y HH:MM para las horas.' },
      { status: 400 }
    );
  }

  // La hora de fin debe ser posterior a la de inicio (acepta cruce medianoche).
  if (!esHoraFinMayorAInicio(body.horaInicio, body.horaFin)) {
    return NextResponse.json(
      { error: 'La hora de fin debe ser posterior a la de inicio.' },
      { status: 400 }
    );
  }

  const { profile, error: perfilError } = await getPerfilByUserId(user.id);
  if (perfilError || !profile) {
    return NextResponse.json({ error: 'No se encontró tu perfil.' }, { status: 404 });
  }

  // El área es obligatoria: si falta, el filtro por área del panel admin no
  // funciona (los registros sin área no aparecen al filtrar).
  if (!profile.areaId) {
    return NextResponse.json(
      { error: 'Debes asignar un área en tu perfil antes de registrar horas.' },
      { status: 400 }
    );
  }

  const { data, error } = await guardarRegistroAsistencia({
    profileId: profile.id,
    fecha: body.fecha,
    horaInicio: body.horaInicio,
    horaFin: body.horaFin,
    descripcion: body.descripcion,
    // evidenciaUrl eliminada: ya no se usan evidencias (cronómetro)
  });

  if (error) {
    return NextResponse.json({ error: 'No se pudo guardar el registro.' }, { status: 500 });
  }

  // Un registro nuevo cambia listados, estadísticas y reportes.
  invalidateCacheByPrefix('registros:');
  invalidateCacheByPrefix('admin:estadisticas:');
  invalidateCacheByPrefix('admin:reportes');

  return NextResponse.json({ data });
}

// GET: Listar registros.
//
// Filtros opcionales (query params): estado, busqueda, desde, hasta, area.
// Alcance:
//   - scope=mine      → solo los del usuario actual (cualquier rol). Lo usa
//                       el historial para que el admin vea ÚNICAMENTE lo suyo.
//   - admin (sin scope) → todos los registros (cola de revisión).
//   - voluntario        → solo los suyos.
// Paginación: page (1-based) + limit → devuelve { data, total, page, limit }.
export async function GET(request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const { profile } = await getPerfilByUserId(user.id);
  if (!profile) {
    return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
  }

  const searchParams = request.nextUrl.searchParams;
  const scope = searchParams.get('scope');
  const profileIdParam = searchParams.get('profileId');
  const estado = searchParams.get('estado');
  const busqueda = searchParams.get('busqueda');
  const desde = searchParams.get('desde');
  const hasta = searchParams.get('hasta');
  const area = searchParams.get('area');
  const page = parseInt(searchParams.get('page')) || 1;
  const limit = parseInt(searchParams.get('limit')) || 10;

  // A-4: profileId es UUID (string), no entero. Validar con esUUIDValido.
  let filtroProfileId = profileIdParam || undefined;

  // Si es voluntario, forzar su propio profileId
  if (profile.rol !== 'admin') {
    filtroProfileId = profile.id;
  }
  // Si scope=mine, siempre usar su propio profileId (incluso para admin)
  if (scope === 'mine') {
    filtroProfileId = profile.id;
  }

  // Si es admin pero envió profileId inválido (no UUID)
  if (filtroProfileId && !esUUIDValido(filtroProfileId)) {
    return NextResponse.json({ error: 'profileId inválido' }, { status: 400 });
  }

  const filtros = {
    profileId: filtroProfileId,
    estado,
    busqueda,
    desde,
    hasta,
    area,
    page,
    limit,
  };

  // Cache por combinación de filtros (clave con prefijo para invalidación granular)
  const cacheKey = `${CACHE_KEY_PREFIX}${request.nextUrl.searchParams.toString()}`;
  const cacheado = getCached(cacheKey);
  if (cacheado) {
    return NextResponse.json(cacheado);
  }

  const { data, total, error } = await obtenerTodosLosRegistros(filtros);
  if (error) {
    return NextResponse.json({ error: 'Error al obtener registros' }, { status: 500 });
  }

  const body = { data, total };
  setCached(cacheKey, body, CACHE_TTL_MS);
  return NextResponse.json(body);
}