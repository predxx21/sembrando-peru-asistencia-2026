import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase/authServer';
import { getPerfilByUserId } from '@/lib/db/perfil';
import { obtenerReportes } from '@/lib/db/reportes';
import { getCached, setCached } from '@/lib/cache';

// Reportes consolidados para /reportes (exclusivo de admin). Espejo de
// /api/admin/estadisticas: valida sesión, exige rol=admin y devuelve todo
// en UNA sola respuesta HTTP.
//
// Igual que estadísticas, se cachea 60 s (cambia poco y las escrituras
// invalidan la caché). Así recargar /reportes responde en milisegundos.
const CACHE_KEY = 'admin:reportes';
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

  const { data, error } = await obtenerReportes();

  if (error || !data) {
    return NextResponse.json(
      { error: 'No se pudieron obtener los reportes.' },
      { status: 500 }
    );
  }

  setCached(CACHE_KEY, data, CACHE_TTL_MS);

  return NextResponse.json({ data });
}
