import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase/authServer';
import { getPerfilByUserId } from '@/lib/db/perfil';
import { obtenerSesionActiva, iniciarSesionCronometro, terminarSesionCronometro } from '@/lib/db/registro';
import { invalidateCacheByPrefix } from '@/lib/cache';

// GET: Obtener sesión activa actual
export async function GET(request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const { profile } = await getPerfilByUserId(user.id);
  if (!profile) {
    return NextResponse.json({ error: 'No se encontró tu perfil.' }, { status: 404 });
  }

  const { data, error } = await obtenerSesionActiva(profile.id);
  if (error) {
    return NextResponse.json({ error: 'Error al obtener sesión.' }, { status: 500 });
  }

  // ✅ Añadir duracionActual calculada en el servidor
  if (data) {
    const ahora = new Date();
    const inicio = new Date(data.horaInicioReal);
    const diff = Math.max(0, (ahora - inicio) / 1000);
    data.duracionActual = Math.round(diff * 10) / 10;
  }

  return NextResponse.json({ data });
}

// POST: Iniciar nueva sesión
export async function POST(request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const { profile } = await getPerfilByUserId(user.id);
  if (!profile) {
    return NextResponse.json({ error: 'No se encontró tu perfil.' }, { status: 404 });
  }

  // Verificar que no tenga sesión activa
  const { data: existente } = await obtenerSesionActiva(profile.id);
  if (existente) {
    return NextResponse.json({ error: 'Ya tienes una sesión activa.' }, { status: 409 });
  }

  const body = await request.json();
  const { descripcion } = body;

  if (!descripcion?.trim()) {
    return NextResponse.json({ error: 'La descripción es obligatoria.' }, { status: 400 });
  }

  const { data, error } = await iniciarSesionCronometro({
    profileId: profile.id,
    descripcion: descripcion.trim(),
  });

  if (error) {
    return NextResponse.json({ error: 'No se pudo iniciar la sesión.' }, { status: 500 });
  }

  // El voluntario inició sesión: el historial y stats cambian.
  invalidateCacheByPrefix('registros:');

  return NextResponse.json({ data });
}

// PATCH: Terminar sesión
export async function PATCH(request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const { profile } = await getPerfilByUserId(user.id);
  if (!profile) {
    return NextResponse.json({ error: 'No se encontró tu perfil.' }, { status: 404 });
  }

  const { data, error } = await terminarSesionCronometro({ profileId: profile.id });

  if (error) {
    const status = error.status || 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  // El voluntario terminó sesión: se creó un registro, invalida caché.
  invalidateCacheByPrefix('registros:');
  invalidateCacheByPrefix('admin:estadisticas:');
  invalidateCacheByPrefix('admin:reportes');

  return NextResponse.json({ data });
}