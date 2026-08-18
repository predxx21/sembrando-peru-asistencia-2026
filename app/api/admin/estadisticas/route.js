import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase/authServer';
import { getPerfilByUserId } from '@/lib/db/perfil';
import { obtenerDatosDashboard } from '@/lib/db/estadisticas';
import { getCached, setCached } from '@/lib/cache';

// Devuelve TODAS las estadísticas del dashboard (resumen, tendencia y
// auditoría) en una sola respuesta. Antes había que hacer 3 requests
// (?tipo=estadisticas|tendencia|auditoria) y cada una disparaba varias
// consultas secuenciales a la BD; ahora es 1 request + consultas en paralelo.
//
// Los datos cambian poco (solo al aprobar/rechazar o registrar), así que se
// cachean 60 s en memoria: al recargar la página el endpoint responde en
// milisegundos sin pisar la BD. Las escrituras invalidan la caché.
//
// NOTA: La auditoría se filtra por el revisor logeado (revisorId = profile.id),
// así que cada admin ve SOLO sus propias revisiones. La caché usa clave
// compuesta por el profileId para aislar por admin.
const CACHE_TTL_MS = 60 * 1000;

export async function GET(request) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const { profile, error: perfilError } = await getPerfilByUserId(user.id);
  if (perfilError || !profile || profile.rol !== 'admin') {
    return NextResponse.json(
      { error: 'No tienes permisos de administrador.' },
      { status: 403 }
    );
  }

  const cacheKey = `admin:estadisticas:${profile.id}`;
  const cacheado = getCached(cacheKey);
  if (cacheado) {
    return NextResponse.json({ data: cacheado });
  }

  const { stats, tendencia, auditoria, error } = await obtenerDatosDashboard({
    revisorId: profile.id,
  });

  if (error) {
    return NextResponse.json(
      { error: 'No se pudieron obtener las estadísticas.' },
      { status: 500 }
    );
  }

  const data = { stats, tendencia, auditoria };
  setCached(cacheKey, data, CACHE_TTL_MS);

  return NextResponse.json({ data });
}
