import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase/authServer';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getPerfilByUserId } from '@/lib/db/perfil';
import { obtenerRegistroPorId } from '@/lib/db/registro';
import { getCached, setCached } from '@/lib/cache';
import { esEnteroPositivo, esEvidenciaPropia } from '@/lib/utils/validar';

const EVIDENCIAS_BUCKET = 'evidencias';
const SIGNED_URL_EXPIRES_IN = 60 * 5; // 5 minutos

// Caché corta de la signed URL. Generarla cuesta 2 round-trips (query del
// registro + Storage); con la caché, revisitar la evidencia responde en ms.
// TTL de 60s, muy por debajo de la expiración (5 min), así nunca se sirve una
// URL vencida. Cualquier escritura (aprobar/rechazar, corrección) invalida
// toda la caché, así un reenvío con nueva evidencia no queda stale. La
// autorización se re-evalúa en CADA request ANTES de servir la URL cacheada:
// se guarda el profileId en la entrada de caché solo para esa comprobación.
const CACHE_TTL_MS = 60 * 1000;

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

  if (!esEnteroPositivo(registroId)) {
    return NextResponse.json({ error: 'Id de registro inválido.' }, { status: 400 });
  }

  const cacheKey = `evidencia:${registroId}`;

  // El perfil se lee en ambos caminos (cache hit o miss) para evaluar el rol.
  const { profile } = await getPerfilByUserId(user.id);

  const cacheado = getCached(cacheKey);
  if (cacheado) {
    if (!(cacheado.profileId === user.id || profile?.rol === 'admin')) {
      return NextResponse.json({ error: 'No tienes permiso para ver esta evidencia.' }, { status: 403 });
    }
    return NextResponse.json({ url: cacheado.url, expiresIn: cacheado.expiresIn });
  }

  const { data: registro, error: registroError } = await obtenerRegistroPorId(registroId);

  if (registroError || !registro) {
    return NextResponse.json({ error: 'No se encontró el registro.' }, { status: 404 });
  }

  const esDueno = registro.profileId === user.id;
  const esAdmin = profile?.rol === 'admin';

  if (!esDueno && !esAdmin) {
    return NextResponse.json({ error: 'No tienes permiso para ver esta evidencia.' }, { status: 403 });
  }

  // Defensa en profundidad: además de la propiedad del registro, la ruta
  // debe vivir en la carpeta del DUEÑO del registro (`evidencias/<profileId>/…`).
  // Una fila legacy con una ruta ajena no se firma ni para su propio dueño.
  if (!registro.evidenciaUrl || !esEvidenciaPropia(registro.evidenciaUrl, registro.profileId)) {
    return NextResponse.json({ error: 'Este registro no tiene evidencia adjunta.' }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin.storage
    .from(EVIDENCIAS_BUCKET)
    .createSignedUrl(registro.evidenciaUrl, SIGNED_URL_EXPIRES_IN);

  if (error || !data?.signedUrl) {
    console.error('Error creando signed URL:', error);
    return NextResponse.json({ error: 'No se pudo generar el enlace de la evidencia.' }, { status: 500 });
  }

  setCached(
    cacheKey,
    { profileId: registro.profileId, url: data.signedUrl, expiresIn: SIGNED_URL_EXPIRES_IN },
    CACHE_TTL_MS
  );

  return NextResponse.json({ url: data.signedUrl, expiresIn: SIGNED_URL_EXPIRES_IN });
}
