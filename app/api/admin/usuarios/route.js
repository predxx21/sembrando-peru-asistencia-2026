import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase/authServer';
import { getPerfilByUserId } from '@/lib/db/perfil';
import { listarUsuarios } from '@/lib/db/usuarios';
import { getCached, setCached } from '@/lib/cache';

const CACHE_TTL_MS = 30 * 1000;

export async function GET(request) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const { profile, error: perfilError } = await getPerfilByUserId(user.id);
  // Permitir admin y coordinador_general
  if (perfilError || !profile || (profile.rol !== 'admin' && profile.rol !== 'coordinador_general')) {
    return NextResponse.json(
      { error: 'No tienes permisos de administrador.' },
      { status: 403 }
    );
  }

  // Si es admin de área, solo ve usuarios de su área
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
  // coordinador_general ve todos los usuarios (areaId = undefined)

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page')) || 1;
  const limit = Number(searchParams.get('limit')) || 20;
  const busqueda = searchParams.get('busqueda') || undefined;

  // Clave de caché incluye profile.id para aislar por usuario
  const cacheKey = `admin:usuarios:${profile.id}:${searchParams.toString()}`;
  const cacheado = getCached(cacheKey);
  if (cacheado) {
    return NextResponse.json(cacheado);
  }

  // Pasar areaId a listarUsuarios (necesitas modificar la función en lib/db/usuarios.js para que acepte areaId)
  const { usuarios, total, error } = await listarUsuarios({ page, limit, busqueda, areaId });

  if (error) {
    return NextResponse.json(
      { error: 'No se pudieron obtener los usuarios.' },
      { status: 500 }
    );
  }

  const body = { usuarios, total, page, limit };
  setCached(cacheKey, body, CACHE_TTL_MS);

  return NextResponse.json(body);
}