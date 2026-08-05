// app/api/estadisticas/route.js

import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase/authServer';
import { getPerfilByUserId } from '@/lib/db/perfil';
import {
  obtenerEstadisticas,
  obtenerTendenciaEnvios,
  obtenerAuditoria,
} from '@/lib/db/registro';

export async function GET(request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const { profile, error: perfilError } = await getPerfilByUserId(user.id);
  if (perfilError || !profile || profile.rol !== 'admin') {
    return NextResponse.json({ error: 'No tienes permisos de administrador.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get('tipo');

  if (tipo === 'estadisticas') {
    const result = await obtenerEstadisticas();
    return NextResponse.json({ data: result.data, error: result.error });
  }

  if (tipo === 'tendencia') {
    const result = await obtenerTendenciaEnvios();
    return NextResponse.json({ data: result.data, error: result.error });
  }

  if (tipo === 'auditoria') {
    const result = await obtenerAuditoria();
    return NextResponse.json({ data: result.data, error: result.error });
  }

  return NextResponse.json({ error: 'Tipo de consulta inválido.' }, { status: 400 });
}