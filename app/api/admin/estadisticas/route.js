import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase/authServer';
import { getPerfilByUserId } from '@/lib/db/perfil';
import { obtenerDatosDashboard } from '@/lib/db/estadisticas';

// Devuelve TODAS las estadísticas del dashboard (resumen, tendencia y
// auditoría) en una sola respuesta. Antes había que hacer 3 requests
// (?tipo=estadisticas|tendencia|auditoria) y cada una disparaba varias
// consultas secuenciales a la BD; ahora es 1 request + consultas en paralelo.
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

  const { stats, tendencia, auditoria, error } = await obtenerDatosDashboard();

  if (error) {
    return NextResponse.json(
      { error: 'No se pudieron obtener las estadísticas.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { stats, tendencia, auditoria } });
}
