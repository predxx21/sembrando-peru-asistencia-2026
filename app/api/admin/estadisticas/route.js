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
// NOTA: La auditoría se filtra por el área del admin (si es admin normal) o
// global para coordinador_general. La caché usa clave compuesta por el profileId
// para aislar por usuario y rol.
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

  const cacheKey = `admin:estadisticas:${profile.id}`;
  const cacheado = getCached(cacheKey);
  if (cacheado) {
    return NextResponse.json({ data: cacheado });
  }

  // Pasar areaId a la función de dashboard
  const { stats, tendencia, auditoria, error } = await obtenerDatosDashboard(areaId);

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