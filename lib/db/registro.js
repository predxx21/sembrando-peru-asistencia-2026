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

// Obtener estadísticas para el dashboard
export async function obtenerEstadisticas() {
  try {
    // Total de registros pendientes
    const totalPendientes = await prisma.registroAsistencia.count({
      where: { estado: 'pendiente' },
    });

    // Total de horas aprobadas
    const horasAprobadas = await prisma.registroAsistencia.aggregate({
      where: { estado: 'aprobado' },
      _sum: { horas: true },
    });

    // Total de horas generales
    const totalHoras = await prisma.registroAsistencia.aggregate({
      _sum: { horas: true },
    });

    // Voluntarios activos (que han registrado al menos una actividad en el último mes)
    const fechaLimite = new Date();
    fechaLimite.setMonth(fechaLimite.getMonth() - 1);

    const voluntariosActivos = await prisma.registroAsistencia.groupBy({
      by: ['profileId'],
      where: {
        fecha: { gte: fechaLimite },
      },
      _count: true,
    });

    return {
      data: {
        pendientes: totalPendientes,
        totalHoras: Math.round(totalHoras._sum.horas || 0),
        horasAprobadas: Math.round(horasAprobadas._sum.horas || 0),
        voluntariosActivos: voluntariosActivos.length,
      },
      error: null,
    };
  } catch (error) {
    console.error('Error en obtenerEstadisticas:', error);
    return { data: null, error };
  }
}

// Obtener tendencia de envíos (últimos 7 días)
export async function obtenerTendenciaEnvios() {
  try {
    const dias = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
    const hoy = new Date();
    const resultados = [];

    for (let i = 6; i >= 0; i--) {
      const fecha = new Date(hoy);
      fecha.setDate(fecha.getDate() - i);
      const inicio = new Date(fecha);
      inicio.setHours(0, 0, 0, 0);
      const fin = new Date(fecha);
      fin.setHours(23, 59, 59, 999);

      const count = await prisma.registroAsistencia.count({
        where: {
          fecha: {
            gte: inicio,
            lte: fin,
          },
        },
      });

      resultados.push({
        day: dias[6 - i],
        value: count,
      });
    }

    return { data: resultados, error: null };
  } catch (error) {
    console.error('Error en obtenerTendenciaEnvios:', error);
    return { data: null, error };
  }
}

// Obtener registros de auditoría (últimos 10)
export async function obtenerAuditoria() {
  try {
    const registros = await prisma.registroAsistencia.findMany({
      where: {
        estado: { in: ['aprobado', 'rechazado'] },
        fechaRevision: { not: null },
      },
      orderBy: { fechaRevision: 'desc' },
      take: 10,
      include: {
        profile: true,
        revisor: true,
      },
    });

    return { data: registros, error: null };
  } catch (error) {
    console.error('Error en obtenerAuditoria:', error);
    return { data: null, error };
  }
}