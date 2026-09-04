import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getUserFromRequest } from '@/lib/supabase/authServer';
import { getPerfilByUserId, upsertPerfil, actualizarPerfil } from '@/lib/db/perfil';
import { supabaseAdmin } from '@/lib/supabase/server';

const DOMINIO_PERMITIDO = '@sembrandoperu.org';

// Crea (o confirma) el perfil del usuario AUTENTICADO.
// - Si el perfil ya existe → devuelve el existente sin validar área.
// - Si NO existe → exige `areaId` para crearlo.
export async function POST(request) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  // VALIDACIÓN DE DOMINIO
  const email = user.email;
  if (!email || !email.endsWith(DOMINIO_PERMITIDO)) {
    try {
      await supabaseAdmin.auth.admin.deleteUser(user.id);
    } catch (_) {}
    return NextResponse.json(
      { error: `Solo se permiten correos del dominio ${DOMINIO_PERMITIDO}.` },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const nombre = body?.nombre;
  const apellido = body?.apellido;
  const areaId = body?.areaId;

  // ✅ Verificar si el perfil ya existe
  const perfilExistente = await prisma.profile.findUnique({
    where: { id: user.id },
  });

  // Si el perfil ya existe → devolverlo sin validar área (importante para coordinadores)
  if (perfilExistente) {
    return NextResponse.json({ profile: perfilExistente });
  }

  // 🔴 Si NO existe → el área es obligatoria para CREAR el perfil
  if (!areaId) {
    return NextResponse.json(
      { error: 'El área de voluntariado es obligatoria para nuevos registros.' },
      { status: 400 }
    );
  }

  // ✅ Validar que el área exista en la base de datos
  const areaExistente = await prisma.area.findUnique({
    where: { id: areaId },
  });

  if (!areaExistente) {
    return NextResponse.json(
      { error: 'El área seleccionada no es válida.' },
      { status: 400 }
    );
  }

  // ✅ Guardar perfil con área
  const { profile, error } = await upsertPerfil({
    id: user.id,
    nombre,
    apellido,
    areaId,
  });

  if (error) {
    return NextResponse.json({ error: 'No se pudo guardar el perfil.' }, { status: 500 });
  }

  return NextResponse.json({ profile });
}

// Obtiene el perfil del usuario AUTENTICADO.
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

// PATCH: actualiza nombre/apellido/avatar (el área NO se modifica)
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
    // areaId NO se incluye → nunca se actualiza
  });

  if (error) {
    return NextResponse.json({ error: 'No se pudo guardar el perfil.' }, { status: 500 });
  }

  return NextResponse.json({ profile });
}