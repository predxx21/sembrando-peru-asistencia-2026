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
const CACHE_KEY = 'admin:estadisticas';
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

  const cacheado = getCached(CACHE_KEY);
  if (cacheado) {
    return NextResponse.json({ data: cacheado });
  }

  const { stats, tendencia, auditoria, error } = await obtenerDatosDashboard();

  if (error) {
    return NextResponse.json(
      { error: 'No se pudieron obtener las estadísticas.' },
      { status: 500 }
    );
  }

  const data = { stats, tendencia, auditoria };
  setCached(CACHE_KEY, data, CACHE_TTL_MS);

  return NextResponse.json({ data });
}
