import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase/authServer';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getPerfilByUserId } from '@/lib/db/perfil';
import { obtenerRegistroPorId, actualizarEstadoRegistro } from '@/lib/db/registro';
import { getCached, setCached, invalidateCache } from '@/lib/cache';

const EVIDENCIAS_BUCKET = 'evidencias';
const SIGNED_URL_EXPIRES_IN = 60 * 10; // 10 minutos

// Caché corta del detalle. Obtener el registro (query con includes) y generar
// la signed URL de la evidencia son 2 round-trips (~2s en frío con el pooler).
// El payload solo cambia con una escritura (aprobar/rechazar o corrección),
// y ambas ya llaman a invalidateCache() — así el cache hit nunca queda stale
// más allá de un TTL corto. 60s está muy por debajo de la expiración de la
// signed URL (10 min), así que nunca se sirve una URL vencida.
const CACHE_TTL_MS = 60 * 1000;

// La autorización se re-evalúa en CADA request, también en cache hit: aquí se
// usa el profileId del payload cacheado + el perfil (a su vez cacheado 30s en
// lib/db/perfil.js, un look-up en memoria). Cachear no salta el control de
// acceso.
function tienePermiso(registro, userId, rol) {
  return registro.profileId === userId || rol === 'admin';
}

// Devuelve UN registro (para la pantalla de detalle de evidencia), ya con
// una signed URL para la evidencia si existe. Solo el dueño del registro o un
// admin pueden verlo.
export async function GET(request, context) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const { id } = await context.params;
  const cacheKey = `registro:${id}`;

  // El perfil se lee en ambos caminos (cache hit o miss) para evaluar el rol.
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

  let evidenciaSignedUrl = null;

  if (registro.evidenciaUrl) {
    const { data: signed, error: signedError } = await supabaseAdmin.storage
      .from(EVIDENCIAS_BUCKET)
      .createSignedUrl(registro.evidenciaUrl, SIGNED_URL_EXPIRES_IN);

    if (signedError) {
      console.error('Error creando signed URL:', signedError);
    } else {
      evidenciaSignedUrl = signed?.signedUrl ?? null;
    }
  }

  const data = { ...registro, evidenciaSignedUrl };
  setCached(cacheKey, data, CACHE_TTL_MS);

  return NextResponse.json({ data });
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

  // Solo admin puede aprobar/rechazar
  if (profile.rol !== 'admin') {
    return NextResponse.json({ error: 'No tienes permisos de administrador.' }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const { estado, comentarioRevision } = body || {};

  if (!estado || !['aprobado', 'rechazado'].includes(estado)) {
    return NextResponse.json(
      { error: 'Estado inválido. Debe ser "aprobado" o "rechazado".' },
      { status: 400 }
    );
  }

  // Payload mínimo: el cliente ya actualiza su lista de forma optimista, así
  // que no hace falta devolver el perfil/revisor completos en la respuesta.
  const { data: registro, error } = await actualizarEstadoRegistro({
    id,
    estado,
    comentarioRevision,
    revisorId: profile.id,
  });

  if (error || !registro) {
    console.error('Error al actualizar registro:', error);
    return NextResponse.json(
      { error: 'No se pudo actualizar el registro.' },
      { status: 500 }
    );
  }

  // Aprobar/rechazar cambia el listado pendiente y las estadísticas.
  invalidateCache();

  return NextResponse.json({ data: registro });
}