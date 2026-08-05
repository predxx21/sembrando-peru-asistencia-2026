import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase/authServer';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getPerfilByUserId } from '@/lib/db/perfil';
import { obtenerRegistroPorId } from '@/lib/db/registro';
import { prisma } from '@/lib/db/client';

const EVIDENCIAS_BUCKET = 'evidencias';
const SIGNED_URL_EXPIRES_IN = 60 * 10; // 10 minutos

// Devuelve UN registro (para la pantalla de detalle de evidencia), ya con
// una signed URL fresca para la evidencia si existe. Solo el dueño del
// registro o un admin pueden verlo.
export async function GET(request, context) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const { id } = await context.params;
  const { data: registro, error } = await obtenerRegistroPorId(id);

  if (error || !registro) {
    return NextResponse.json({ error: 'No se encontró el registro.' }, { status: 404 });
  }

  const { profile } = await getPerfilByUserId(user.id);
  const esDueno = registro.profileId === user.id;
  const esAdmin = profile?.rol === 'admin';

  if (!esDueno && !esAdmin) {
    return NextResponse.json({ error: 'No tienes permiso para ver este registro.' }, { status: 403 });
  }

  let evidenciaSignedUrl = null;

  if (registro.evidenciaUrl) {
    const { data: signed, error: signedError } = await supabaseAdmin.storage
      .from(EVIDENCIAS_BUCKET)
      .createSignedUrl(registro.evidenciaUrl, SIGNED_URL_EXPIRES_IN);

    if (signedError) {
      console.error('Error creando signed URL:', signedError);
    } else {
      evidenciaSignedUrl = signed?.signedUrl ?? null;
    }
  }

  return NextResponse.json({ data: { ...registro, evidenciaSignedUrl } });
}

export async function PATCH(request, context) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const { profile, error: perfilError } = await getPerfilByUserId(user.id);
  if (perfilError || !profile) {
    return NextResponse.json({ error: 'No se encontró tu perfil.' }, { status: 404 });
  }

  // Solo admin puede aprobar/rechazar
  if (profile.rol !== 'admin') {
    return NextResponse.json({ error: 'No tienes permisos de administrador.' }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const { estado, comentarioRevision } = body || {};

  if (!estado || !['aprobado', 'rechazado'].includes(estado)) {
    return NextResponse.json(
      { error: 'Estado inválido. Debe ser "aprobado" o "rechazado".' },
      { status: 400 }
    );
  }

  try {
    const registro = await prisma.registroAsistencia.update({
      where: { id: Number(id) },
      data: {
        estado,
        comentarioRevision: comentarioRevision || null,
        revisorId: profile.id,
        fechaRevision: new Date(),
      },
      include: {
        profile: true,
        revisor: true,
      },
    });

    return NextResponse.json({ data: registro });
  } catch (error) {
    console.error('Error al actualizar registro:', error);
    return NextResponse.json(
      { error: 'No se pudo actualizar el registro.' },
      { status: 500 }
    );
  }
}