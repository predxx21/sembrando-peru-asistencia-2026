import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase/authServer';
import { getPerfilByUserId, upsertPerfil, actualizarPerfil } from '@/lib/db/perfil';

// Crea (o confirma) el perfil del usuario AUTENTICADO en Postgres vía Prisma.
// Se llama desde el cliente justo después de un signUp/login exitoso contra
// Supabase Auth, porque Prisma no puede ejecutarse en el navegador. El id se
// toma del token de sesión (user.id), NUNCA del body: si se aceptara body.id,
// cualquiera podría crear/sobrescribir el perfil de otro usuario (IDOR de
// escritura). El upsert es idempotente (update: {}) — no sobrescribe nada.
export async function POST(request) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  const { profile, error } = await upsertPerfil({
    id: user.id,
    nombre: body?.nombre,
    apellido: body?.apellido,
  });

  if (error) {
    return NextResponse.json({ error: 'No se pudo guardar el perfil.' }, { status: 500 });
  }

  return NextResponse.json({ profile });
}

// Obtiene el perfil (nombre, apellido, rol) del usuario AUTENTICADO. Siempre
// devuelve el del token (user.id) e ignora cualquier ?id=: si se aceptara un
// id arbitrario, cualquiera podría leer el perfil de otro usuario (IDOR de
// lectura).
export async function GET(request) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const { profile, error } = await getPerfilByUserId(user.id);

  if (error) {
    return NextResponse.json({ error: 'No se pudo obtener el perfil.' }, { status: 500 });
  }

  return NextResponse.json({ profile });
}

// PATCH: actualiza nombre/apellido/areaId del perfil del usuario autenticado.
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
    areaId: body.areaId || null,
      avatarUrl: body.avatarUrl || null,

  });

  if (error) {
    return NextResponse.json({ error: 'No se pudo guardar el perfil.' }, { status: 500 });
  }

  return NextResponse.json({ profile });
}
