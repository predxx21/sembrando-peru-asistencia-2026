import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase/authServer';
import { getPerfilByUserId } from '@/lib/db/perfil';
import { obtenerRegistroPorId, corregirRegistro } from '@/lib/db/registro';
import { invalidateCache } from '@/lib/cache';
import { esEnteroPositivo, esFechaValida, esHoraValida } from '@/lib/utils/validar';

// PATCH: reenvía a revisión un registro RECHAZADO, con los datos corregidos
// por el voluntario. Es independiente del PATCH de /api/registros/[id], que
// es solo para admins (aprobar/rechazar). Aquí el dueño del registro edita
// su propia evidencia y vuelve a quedar 'pendiente'.
export async function PATCH(request, context) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);

  if (!body?.fecha || !body?.horaInicio || !body?.horaFin || !body?.descripcion) {
    return NextResponse.json({ error: 'Faltan datos obligatorios.' }, { status: 400 });
  }

  if (!esEnteroPositivo(id) || !esFechaValida(body.fecha) || !esHoraValida(body.horaInicio) || !esHoraValida(body.horaFin)) {
    return NextResponse.json(
      { error: 'Id, fecha u horas inválidos. Usa AAAA-MM-DD y HH:MM.' },
      { status: 400 }
    );
  }

  const { data: registro, error: registroError } = await obtenerRegistroPorId(id);

  if (registroError || !registro) {
    return NextResponse.json({ error: 'No se encontró el registro.' }, { status: 404 });
  }

  const { profile, error: perfilError } = await getPerfilByUserId(user.id);
  if (perfilError || !profile) {
    return NextResponse.json({ error: 'No se encontró tu perfil.' }, { status: 404 });
  }

  // Solo el dueño del registro puede corregirlo.
  if (registro.profileId !== profile.id) {
    return NextResponse.json({ error: 'No tienes permiso para corregir este registro.' }, { status: 403 });
  }

  // Solo se corrige un registro que haya sido rechazado.
  if (registro.estado !== 'rechazado') {
    return NextResponse.json(
      { error: 'Solo se pueden corregir registros rechazados.' },
      { status: 400 }
    );
  }

  const { data: actualizado, error } = await corregirRegistro({
    id: registro.id,
    profileId: profile.id,
    fecha: body.fecha,
    horaInicio: body.horaInicio,
    horaFin: body.horaFin,
    descripcion: body.descripcion,
    evidenciaUrl: body.evidenciaUrl || registro.evidenciaUrl,
  });

  if (error) {
    return NextResponse.json({ error: 'No se pudo corregir el registro.' }, { status: 500 });
  }

  // El reenvío devuelve el registro a 'pendiente': cambia el listado y stats.
  invalidateCache();

  return NextResponse.json({ data: actualizado });
}
