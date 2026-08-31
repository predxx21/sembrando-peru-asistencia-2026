import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase/authServer';
import { getPerfilByUserId } from '@/lib/db/perfil';
import { obtenerRegistroPorId, actualizarEstadoRegistro } from '@/lib/db/registro';
import { getCached, setCached, invalidateCacheByPrefix } from '@/lib/cache';
import { esEnteroPositivo } from '@/lib/utils/validar';

// Caché corta del detalle.
const CACHE_TTL_MS = 60 * 1000;

// La autorización se re-evalúa en CADA request, también en cache hit.
function tienePermiso(registro, userId, rol) {
  // Ahora permitimos que tanto admin como coordinador_general vean cualquier registro
  // pero la lógica de área se aplica en el PATCH.
  return registro.profileId === userId || rol === 'admin' || rol === 'coordinador_general';
}

// Devuelve UN registro. Solo el dueño del registro, admin o coordinador_general pueden verlo.
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

  // Permitir solo admin o coordinador_general
  if (profile.rol !== 'admin' && profile.rol !== 'coordinador_general') {
    return NextResponse.json(
      { error: 'No tienes permisos de administrador.' },
      { status: 403 }
    );
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

  // Comentario obligatorio al rechazar
  if (estado === 'rechazado' && !comentarioRevision?.trim()) {
    return NextResponse.json(
      { error: 'Debes indicar el motivo del rechazo.' },
      { status: 400 }
    );
  }

  // Obtener el registro para validar área y propietario
  const { data: registroActual, error: registroError } = await obtenerRegistroPorId(id);
  if (registroError || !registroActual) {
    return NextResponse.json({ error: 'No se encontró el registro.' }, { status: 404 });
  }

  // Un admin NORMAL no puede auditar su propio registro (conflicto de interés)
  // (el coordinador_general sí podría, pero lo dejamos igual por seguridad)
  if (registroActual.profileId === user.id) {
    return NextResponse.json(
      { error: 'No puedes auditar tu propio registro.' },
      { status: 403 }
    );
  }

  // ✅ Verificación de área para admin normal
  if (profile.rol === 'admin') {
    // Obtener el área del voluntario dueño del registro
    // Nota: el registro tiene profileId, debemos obtener el área de ese perfil
    // Usamos una consulta adicional o incluimos profile en la obtención del registro.
    // Como obtenerRegistroPorId no trae el areaId del voluntario, hacemos una consulta extra.
    const { prisma } = await import('@/lib/db/client');
    const voluntario = await prisma.profile.findUnique({
      where: { id: registroActual.profileId },
      select: { areaId: true },
    });

    if (!voluntario || voluntario.areaId !== profile.areaId) {
      return NextResponse.json(
        { error: 'No tienes permisos para auditar este registro (área diferente).' },
        { status: 403 }
      );
    }
  }
  // Si es coordinador_general, no hay restricción de área.

  // ✅ Actualizar el estado del registro
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

  // Invalidar cachés relacionadas
  invalidateCacheByPrefix('registros:');
  invalidateCacheByPrefix('admin:estadisticas:');
  invalidateCacheByPrefix('admin:auditoria:');
  invalidateCacheByPrefix('admin:reportes');

  return NextResponse.json({ data: registro });
}