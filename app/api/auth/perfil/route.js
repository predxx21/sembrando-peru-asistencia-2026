import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase/authServer';
import { getPerfilByUserId, upsertPerfil, actualizarPerfil } from '@/lib/db/perfil';

// Crea (o confirma) el perfil de un usuario en Postgres vía Prisma.
// Se llama desde el cliente justo después de un signUp/login exitoso
// contra Supabase Auth, porque Prisma no puede ejecutarse en el navegador.
export async function POST(request) {
  const body = await request.json().catch(() => null);

  if (!body?.id) {
    return NextResponse.json({ error: 'Falta el id del usuario.' }, { status: 400 });
  }

  const { profile, error } = await upsertPerfil({
    id: body.id,
    nombre: body.nombre,
    apellido: body.apellido,
  });

  if (error) {
    return NextResponse.json({ error: 'No se pudo guardar el perfil.' }, { status: 500 });
  }

  return NextResponse.json({ profile });
}

// Obtiene el perfil (nombre, apellido, rol) de un usuario ya autenticado.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Falta el id del usuario.' }, { status: 400 });
  }

  const { profile, error } = await getPerfilByUserId(id);

  if (error) {
    return NextResponse.json({ error: 'No se pudo obtener el perfil.' }, { status: 500 });
  }

  return NextResponse.json({ profile });
}

// PATCH: actualiza nombre/apellido del perfil del usuario autenticado.
// A diferencia del POST (que usa el id del body), este exige sesión válida
// y solo toca SU propio perfil.
export async function PATCH(request) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.nombre || !body?.apellido) {
    return NextResponse.json({ error: 'Faltan datos obligatorios.' }, { status: 400 });
  }

  const { profile, error } = await actualizarPerfil({
    id: user.id,
    nombre: body.nombre.trim(),
    apellido: body.apellido.trim(),
  });

  if (error) {
    return NextResponse.json({ error: 'No se pudo guardar el perfil.' }, { status: 500 });
  }

  return NextResponse.json({ profile });
}
