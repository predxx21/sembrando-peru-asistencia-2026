import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase/authServer';
import { getPerfilByUserId } from '@/lib/db/perfil';
import { obtenerReportes } from '@/lib/db/reportes';
import { getCached, setCached } from '@/lib/cache';

// Reportes consolidados para /reportes (exclusivo de admin). Espejo de
// /api/admin/estadisticas: valida sesión, exige rol=admin o coordinador_general,
// y devuelve todo en UNA sola respuesta HTTP.
//
// Igual que estadísticas, se cachea 60 s (cambia poco y las escrituras
// invalidan la caché). Así recargar /reportes responde en milisegundos.
// La clave incluye el perfilId para aislar por administrador (y su área).
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

  const cacheKey = `admin:reportes:${profile.id}`;
  const cacheado = getCached(cacheKey);
  if (cacheado) {
    return NextResponse.json({ data: cacheado });
  }

  // Pasar areaId a obtenerReportes
  const { data, error } = await obtenerReportes(areaId);

  if (error || !data) {
    return NextResponse.json(
      { error: 'No se pudieron obtener los reportes.' },
      { status: 500 }
    );
  }

  setCached(cacheKey, data, CACHE_TTL_MS);

  return NextResponse.json({ data });
}