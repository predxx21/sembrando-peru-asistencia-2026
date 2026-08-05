import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase/authServer';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getPerfilByUserId } from '@/lib/db/perfil';
import { obtenerRegistroPorId } from '@/lib/db/registro';

const EVIDENCIAS_BUCKET = 'evidencias';
const SIGNED_URL_EXPIRES_IN = 60 * 5; // 5 minutos

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
