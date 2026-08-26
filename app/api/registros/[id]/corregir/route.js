import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase/authServer';
import { getPerfilByUserId } from '@/lib/db/perfil';
import { obtenerRegistroPorId, corregirRegistro } from '@/lib/db/registro';
import { invalidateCacheByPrefix } from '@/lib/cache';
import { esEnteroPositivo, esFechaValida, esUUIDValido } from '@/lib/utils/validar';

// PATCH: reenvía a revisión un registro RECHAZADO con datos corregidos.
// Ahora solo permite editar fecha y descripción (las horas vienen del cronómetro).
export async function PATCH(request, context) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);

  // ✅ Solo se requieren fecha y descripción
  if (!body?.fecha || !body?.descripcion) {
    return NextResponse.json({ error: 'Faltan datos obligatorios (fecha y descripción).' }, { status: 400 });
  }

  if (!esEnteroPositivo(id) || !esFechaValida(body.fecha)) {
    return NextResponse.json(
      { error: 'Id o fecha inválidos. Usa AAAA-MM-DD.' },
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

  // Solo se corrige un registro rechazado.
  if (registro.estado !== 'rechazado') {
    return NextResponse.json(
      { error: 'Solo se pueden corregir registros rechazados.' },
      { status: 400 }
    );
  }

  // ✅ Llamada a corregirRegistro SOLO con fecha y descripción (las horas se mantienen)
  const { data: actualizado, error } = await corregirRegistro({
    id: registro.id,
    profileId: profile.id,
    fecha: body.fecha,
    // horaInicio y horaFin NO se envían – se mantienen los valores originales
    descripcion: body.descripcion,
  });

  if (error) {
    return NextResponse.json({ error: 'No se pudo corregir el registro.' }, { status: 500 });
  }

  invalidateCacheByPrefix('registros:');
  invalidateCacheByPrefix('admin:estadisticas:');
  invalidateCacheByPrefix('admin:auditoria:');
  invalidateCacheByPrefix('admin:reportes');

  return NextResponse.json({ data: actualizado });
}