'use client';

import { supabase } from '@/lib/supabase/client';

// Pide al servidor una URL temporal (signed URL, ~5 min) para ver la
// evidencia de un registro. Se usa en cualquier pantalla que necesite
// mostrar una foto/PDF de evidencia (formulario de horas, historial,
// revisión de administración).
export async function getEvidenciaSignedUrl(registroId) {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;

  if (!accessToken) {
    return { url: null, error: 'No hay sesión activa.' };
  }

  const response = await fetch(`/api/evidencias?registroId=${encodeURIComponent(registroId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    return { url: null, error: body.error || 'No se pudo obtener la evidencia.' };
  }

  return { url: body.url, error: null };
}
