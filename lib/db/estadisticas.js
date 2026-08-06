import { prisma } from './client';

// Estadísticas para el Panel de Administración.
//
// Agrupadas aquí (antes vivían en lib/db/registro.js) para que el endpoint
// consolidado /api/admin/estadisticas pueda disparar las tres consultas en
// paralelo con Promise.all y devolver todo en UNA sola respuesta HTTP.
// Eso baja de ~12 consultas secuenciales a 1 round-trip en el dashboard.

// Resumen general: pendientes, horas totales, horas aprobadas y voluntarios
// activos del último mes. Las 4 consultas se disparan en paralelo.
export async function obtenerEstadisticas() {
  try {
    const fechaLimite = new Date();
    fechaLimite.setMonth(fechaLimite.getMonth() - 1);

    const [totalPendientes, horasAprobadas, totalHoras, voluntariosActivos] =
      await Promise.all([
        prisma.registroAsistencia.count({ where: { estado: 'pendiente' } }),
        prisma.registroAsistencia.aggregate({
          where: { estado: 'aprobado' },
          _sum: { horas: true },
        }),
        prisma.registroAsistencia.aggregate({
          _sum: { horas: true },
        }),
        prisma.registroAsistencia.groupBy({
          by: ['profileId'],
          where: { fecha: { gte: fechaLimite } },
          _count: true,
        }),
      ]);

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

// Tendencia de envíos de los últimos 7 días.
// Una SOLA consulta trae las fechas del rango y el conteo se hace en JS,
// rellenando con 0 los días sin envíos (antes eran 7 COUNT secuenciales,
// uno por día — el principal cuello de botella del dashboard).
export async function obtenerTendenciaEnvios() {
  try {
    const hoy = new Date();
    const inicio = new Date(hoy);
    inicio.setDate(inicio.getDate() - 6);
    inicio.setHours(0, 0, 0, 0);

    const registros = await prisma.registroAsistencia.findMany({
      where: { fecha: { gte: inicio } },
      select: { fecha: true },
    });

    // Domingo = 'D', Lunes = 'L', etc. (getDay(): 0 = domingo)
    const etiquetas = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
    const resultados = [];

    for (let i = 6; i >= 0; i--) {
      const fecha = new Date(inicio);
      fecha.setDate(inicio.getDate() + i);
      const key = fecha.toDateString();
      const value = registros.filter(
        (r) => r.fecha.toDateString() === key
      ).length;

      resultados.push({ day: etiquetas[fecha.getDay()], value });
    }

    return { data: resultados, error: null };
  } catch (error) {
    console.error('Error en obtenerTendenciaEnvios:', error);
    return { data: null, error };
  }
}

// Últimos 10 registros revisados (aprobados/rechazados) para la línea de
// auditoría del dashboard.
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

// Combina las tres consultas en paralelo. La usa el endpoint consolidado.
export async function obtenerDatosDashboard() {
  const [stats, tendencia, auditoria] = await Promise.all([
    obtenerEstadisticas(),
    obtenerTendenciaEnvios(),
    obtenerAuditoria(),
  ]);

  return {
    stats: stats.data || {},
    tendencia: tendencia.data || [],
    auditoria: auditoria.data || [],
    error: stats.error || tendencia.error || auditoria.error,
  };
}
