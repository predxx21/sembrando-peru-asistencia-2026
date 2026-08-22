import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase/authServer';
import { getPerfilByUserId } from '@/lib/db/perfil';
import { obtenerRegistroPorId, actualizarEstadoRegistro } from '@/lib/db/registro';
import { getCached, setCached, invalidateCache } from '@/lib/cache';
import { esEnteroPositivo } from '@/lib/utils/validar';

// Caché corta del detalle.
const CACHE_TTL_MS = 60 * 1000;

// La autorización se re-evalúa en CADA request, también en cache hit.
function tienePermiso(registro, userId, rol) {
  return registro.profileId === userId || rol === 'admin';
}

// Devuelve UN registro. Solo el dueño del registro o un admin pueden verlo.
export async function GET(request, context) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const { id } = await context.params;

  if (!esEnteroPositivo(id)) {
    return NextResponse.json({ error: 'Id de registro inválido.' }, { status: 400 });
  }

  const cacheKey = `registro:${id}`;

  const { profile } = await getPerfilByUserId(user.id);

  const cacheado = getCached(cacheKey);
  if (cacheado) {
    if (!tienePermiso(cacheado, user.id, profile?.rol)) {
      return NextResponse.json(
        { error: 'No tienes permiso para ver este registro.' },
        { status: 403 }
      );
    }
    return NextResponse.json({ data: cacheado });
  }

  const { data: registro, error } = await obtenerRegistroPorId(id);

  if (error || !registro) {
    return NextResponse.json({ error: 'No se encontró el registro.' }, { status: 404 });
  }

  if (!tienePermiso(registro, user.id, profile?.rol)) {
    return NextResponse.json(
      { error: 'No tienes permiso para ver este registro.' },
      { status: 403 }
    );
  }

  setCached(cacheKey, registro, CACHE_TTL_MS);

  return NextResponse.json({ data: registro });
}

export async function PATCH(request, context) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const { profile, error: perfilError } = await getPerfilByUserId(user.id);
  if (perfilError || !profile) {
    return NextResponse.json({ error: 'No se encontró tu perfil.' }, { status: 404 });
  }

  // Solo admin puede auditar
  if (profile.rol !== 'admin') {
    return NextResponse.json({ error: 'No tienes permisos de administrador.' }, { status: 403 });
  }

  const { id } = await context.params;

  if (!esEnteroPositivo(id)) {
    return NextResponse.json({ error: 'Id de registro inválido.' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const { estado, comentarioRevision } = body || {};

  if (!estado || !['aprobado', 'rechazado'].includes(estado)) {
    return NextResponse.json(
      { error: 'Estado inválido. Debe ser "aprobado" o "rechazado".' },
      { status: 400 }
    );
  }

  // NUEVO: Comentario obligatorio al rechazar (auditoría)
  if (estado === 'rechazado' && !comentarioRevision?.trim()) {
    return NextResponse.json(
      { error: 'Debes indicar el motivo del rechazo.' },
      { status: 400 }
    );
  }

  // CAMBIO: Ya no validamos que esté "pendiente", el admin puede auditar cualquier registro
  const { data: registroActual, error: registroError } = await obtenerRegistroPorId(id);
  if (registroError || !registroActual) {
    return NextResponse.json({ error: 'No se encontró el registro.' }, { status: 404 });
  }

  // Un admin no puede auditar su propio registro (conflicto de interés).
  if (registroActual.profileId === user.id) {
    return NextResponse.json(
      { error: 'No puedes auditar tu propio registro.' },
      { status: 403 }
    );
  }

  const { data: registro, error } = await actualizarEstadoRegistro({
    id,
    estado,
    comentarioRevision: comentarioRevision?.trim() || null,
    revisorId: profile.id,
  });

  if (error || !registro) {
    console.error('Error al actualizar registro:', error);
    return NextResponse.json(
      { error: 'No se pudo actualizar el registro.' },
      { status: 500 }
    );
  }

  // Auditoría cambia el listado y las estadísticas.
  invalidateCache();

  return NextResponse.json({ data: registro });
}