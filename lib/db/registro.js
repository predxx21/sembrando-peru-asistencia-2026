import { prisma } from './client';
import { calcularHoras } from '@/lib/utils/horas';

export async function guardarRegistroAsistencia({
  profileId,
  fecha,
  horaInicio,
  horaFin,
  descripcion,
  evidenciaUrl,
}) {
  try {
    // El servidor recalcula las horas a partir de las horas de inicio/fin
    // (misma lógica que el formulario en el cliente) en vez de confiar en el
    // valor que manda el navegador. Así no se puede registrar un total trucado.
    const horas = calcularHoras(horaInicio, horaFin);

    const registro = await prisma.registroAsistencia.create({
      data: {
        profileId,
        fecha: new Date(fecha),
        horaInicio,
        horaFin,
        horas,
        descripcion,
        evidenciaUrl,
        estado: 'pendiente',
      },
    });
    return { data: registro, error: null };
  } catch (error) {
    console.error('Error en guardarRegistroAsistencia:', error);
    return { data: null, error };
  }
}

export async function obtenerRegistrosPorUsuario(profileId) {
  try {
    const registros = await prisma.registroAsistencia.findMany({
      where: { profileId },
      orderBy: { fecha: 'desc' },
      include: {
        profile: true,
        revisor: true,
      },
    });
    return { data: registros, error: null };
  } catch (error) {
    console.error('Error en obtenerRegistrosPorUsuario:', error);
    return { data: null, error };
  }
}

export async function obtenerRegistroPorId(id) {
  try {
    const registro = await prisma.registroAsistencia.findUnique({
      where: { id: Number(id) },
      include: {
        profile: true,
        revisor: true,
      },
    });
    return { data: registro, error: null };
  } catch (error) {
    console.error('Error en obtenerRegistroPorId:', error);
    return { data: null, error };
  }
}

// ✅ Lista TODOS los registros del sistema (para el Panel de Administración).
// `estado` es opcional: si se manda, filtra (ej. 'pendiente').
export async function obtenerTodosLosRegistros({ estado } = {}) {
  try {
    const registros = await prisma.registroAsistencia.findMany({
      where: estado ? { estado } : undefined,
      orderBy: { fecha: 'desc' },
      include: {
        profile: true,
        revisor: true,
      },
    });
    return { data: registros, error: null };
  } catch (error) {
    console.error('Error en obtenerTodosLosRegistros:', error);
    return { data: null, error };
  }
}

// ✅ Aprueba o rechaza un registro.
export async function actualizarEstadoRegistro({ id, estado, comentarioRevision, revisorId }) {
  try {
    const registro = await prisma.registroAsistencia.update({
      where: { id: Number(id) },
      data: {
        estado,
        comentarioRevision: comentarioRevision || null,
        revisorId,
        fechaRevision: new Date(),
      },
      include: {
        profile: true,
        revisor: true,
      },
    });
    return { data: registro, error: null };
  } catch (error) {
    console.error('Error en actualizarEstadoRegistro:', error);
    return { data: null, error };
  }
}

// ✅ Reenvía un registro rechazado con los datos corregidos por el voluntario.
// Solo el dueño del registro lo llama (desde la pantalla de corrección).
// Al reenviar, el registro vuelve a 'pendiente' y se limpia la revisión
// anterior para que el coordinador lo evalúe como nuevo.
export async function corregirRegistro({
  id,
  profileId,
  fecha,
  horaInicio,
  horaFin,
  descripcion,
  evidenciaUrl,
}) {
  try {
    const horas = calcularHoras(horaInicio, horaFin);

    const registro = await prisma.registroAsistencia.update({
      where: { id: Number(id) },
      data: {
        fecha: new Date(fecha),
        horaInicio,
        horaFin,
        horas,
        descripcion,
        evidenciaUrl,
        estado: 'pendiente',
        comentarioRevision: null,
        revisorId: null,
        fechaRevision: null,
      },
      include: {
        profile: true,
        revisor: true,
      },
    });
    return { data: registro, error: null };
  } catch (error) {
    console.error('Error en corregirRegistro:', error);
    return { data: null, error };
  }
}