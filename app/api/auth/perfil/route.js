import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase/authServer';
import { getPerfilByUserId, upsertPerfil, actualizarPerfil } from '@/lib/db/perfil';
import { supabaseAdmin } from '@/lib/supabase/server'; // ← si no existe, crea el cliente admin

// 🔒 Dominio permitido (cámbialo por el tuyo si es diferente)
const DOMINIO_PERMITIDO = '@sembrandoperu.org';

// Crea (o confirma) el perfil del usuario AUTENTICADO en Postgres vía Prisma.
// Se llama desde el cliente justo después de un signUp/login exitoso contra
// Supabase Auth.
export async function POST(request) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  // 🔒 VALIDACIÓN DE DOMINIO EN EL SERVIDOR
  const email = user.email;
  if (!email || !email.endsWith(DOMINIO_PERMITIDO)) {
    // Opcional: eliminar el usuario de Supabase Auth para que no quede huérfano
    try {
      await supabaseAdmin.auth.admin.deleteUser(user.id);
    } catch (_) {
      // Si falla la eliminación, al menos el perfil no se crea
    }
    return NextResponse.json(
      { error: `Solo se permiten correos del dominio ${DOMINIO_PERMITIDO}.` },
      { status: 403 }
    );
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

// Obtiene el perfil (nombre, apellido, rol) del usuario AUTENTICADO.
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

// PATCH: actualiza nombre/apellido/avatar del perfil del usuario autenticado.
// El área NO se puede modificar (se asigna una única vez al registrarse).
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
    avatarUrl: body.avatarUrl || null,
    // ⚠️ areaId NO se incluye → nunca se actualiza
  });

  if (error) {
    return NextResponse.json({ error: 'No se pudo guardar el perfil.' }, { status: 500 });
  }

  return NextResponse.json({ profile });
}