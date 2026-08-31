import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase/authServer';
import { getPerfilByUserId } from '@/lib/db/perfil';
import { obtenerAuditoriaCompleta } from '@/lib/db/estadisticas';
import { getCached, setCached } from '@/lib/cache';

// GET /api/admin/auditoria - Historial completo de auditoría con paginación y filtros
// Query params: page, limit, busqueda, estado (aprobado|rechazado), desde, hasta (ISO strings)
//
// Caché 60 s: la auditoría solo cambia al aprobar/rechazar (invalida TODA la caché).
// La clave incluye TODOS los filtros para servir cada combinación desde memoria.
const CACHE_TTL_MS = 60 * 1000;

export async function GET(request) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const { profile, error: perfilError } = await getPerfilByUserId(user.id);
  // Cambio: permitir admin y coordinador_general
  if (perfilError || !profile || (profile.rol !== 'admin' && profile.rol !== 'coordinador_general')) {
    return NextResponse.json(
      { error: 'No tienes permisos de administrador.' },
      { status: 403 }
    );
  }

  // Obtener areaId si es admin normal
  let areaId = undefined;
  if (profile.rol === 'admin') {
    areaId = profile.areaId;
    if (!areaId) {
      return NextResponse.json(
        { error: 'Tu perfil no tiene área asignada.' },
        { status: 400 }
      );
    }
  }
  // Para coordinador_general, areaId se mantiene undefined (ve todas las áreas)

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page')) || 1;
  const limit = Number(searchParams.get('limit')) || 20;
  const busqueda = searchParams.get('busqueda') || undefined;
  const estado = searchParams.get('estado') || undefined;
  const desde = searchParams.get('desde') || undefined;
  const hasta = searchParams.get('hasta') || undefined;

  const cacheKey = `admin:auditoria:${searchParams.toString()}`;
  const cacheado = getCached(cacheKey);
  if (cacheado) {
    return NextResponse.json(cacheado);
  }

  // Pasar areaId a la función de base de datos
  const { data: auditoria, total, error } = await obtenerAuditoriaCompleta({
    page,
    limit,
    busqueda,
    estado,
    desde,
    hasta,
    areaId, // <-- nuevo parámetro
  });

  if (error) {
    return NextResponse.json(
      { error: 'No se pudo obtener el historial de auditoría.' },
      { status: 500 }
    );
  }

  const body = { auditoria, total, page, limit };
  setCached(cacheKey, body, CACHE_TTL_MS);

  return NextResponse.json(body);
}