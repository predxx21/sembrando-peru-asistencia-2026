import { prisma } from './client';

export async function guardarRegistroAsistencia({
  profileId,
  fecha,
  horaInicio,
  horaFin,
  horas,
  descripcion,
  evidenciaUrl,
}) {
  try {
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