import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase/authServer';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getPerfilByUserId } from '@/lib/db/perfil';
import { obtenerRegistroPorId } from '@/lib/db/registro';

const EVIDENCIAS_BUCKET = 'evidencias';
const SIGNED_URL_EXPIRES_IN = 60 * 5; // 5 minutos

// Genera una URL temporal (signed URL) para ver la evidencia de UN registro
// específico. El bucket 'evidencias' es privado: nadie puede leerlo con
// getPublicUrl(). Solo este endpoint, corriendo con la service role key
// del lado del servidor, puede pedirle a Storage una URL firmada — y solo
// lo hace después de comprobar que quien pregunta es el dueño del registro
// o un coordinador/admin.
export async function GET(request) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const registroId = searchParams.get('registroId');

  if (!registroId) {
    return NextResponse.json({ error: 'Falta el id del registro.' }, { status: 400 });
  }

  const { data: registro, error: registroError } = await obtenerRegistroPorId(registroId);

  if (registroError || !registro) {
    return NextResponse.json({ error: 'No se encontró el registro.' }, { status: 404 });
  }

  const { profile } = await getPerfilByUserId(user.id);
  const esDueno = registro.profileId === user.id;
  const esAdmin = profile?.rol === 'admin';

  if (!esDueno && !esAdmin) {
    return NextResponse.json({ error: 'No tienes permiso para ver esta evidencia.' }, { status: 403 });
  }

  if (!registro.evidenciaUrl) {
    return NextResponse.json({ error: 'Este registro no tiene evidencia adjunta.' }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin.storage
    .from(EVIDENCIAS_BUCKET)
    .createSignedUrl(registro.evidenciaUrl, SIGNED_URL_EXPIRES_IN);

  if (error || !data?.signedUrl) {
    console.error('Error creando signed URL:', error);
    return NextResponse.json({ error: 'No se pudo generar el enlace de la evidencia.' }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl, expiresIn: SIGNED_URL_EXPIRES_IN });
}
