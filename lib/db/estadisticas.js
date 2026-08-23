import { prisma } from './client';
import { obtenerResumenGlobal } from './agregaciones';

// Estadísticas para el Panel de Administración.
//
// Agrupadas aquí (antes vivían en lib/db/registro.js) para que el endpoint
// consolidado /api/admin/estadisticas pueda disparar las consultas y devolver
// todo en UNA sola respuesta HTTP. Eso baja de ~12 consultas secuenciales a
// 1 round-trip en el dashboard.

// Resumen general: pendientes, horas totales, horas aprobadas y voluntarios
// activos del último mes. Usa función compartida en agregaciones.js.
export async function obtenerEstadisticas() {
  try {
    const resumen = await obtenerResumenGlobal();
    if (!resumen) throw new Error('Error en agregación');

    return { data: resumen, error: null };
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

// Últimos 4 registros revisados por el admin logeado (aprobados/rechazados) para la
// línea de auditoría del dashboard.
//
// Solo la UI usa id, estado, fechaRevision y revisor.nombre; el `profile` del
// voluntario no se muestra en la auditoría. Al usar `select` mínimo en vez de
// `include` (que traía las dos relaciones completas), se cortan round-trips
// extra a la BD — importante porque la conexión es única y serializada.
export async function obtenerAuditoria({ revisorId } = {}) {
  try {
    const where = {
      estado: { in: ['aprobado', 'rechazado'] },
      fechaRevision: { not: null },
    };

    if (revisorId) {
      where.revisorId = revisorId;
    }

    const registros = await prisma.registroAsistencia.findMany({
      where,
      orderBy: { fechaRevision: 'desc' },
      take: 4,
      select: {
        id: true,
        estado: true,
        fechaRevision: true,
        revisor: { select: { nombre: true } },
      },
    });

    return { data: registros, error: null };
  } catch (error) {
    console.error('Error en obtenerAuditoria:', error);
    return { data: null, error };
  }
}

// Auditoría completa con paginación y filtros (para vista /administracion/auditoria).
// Filtros: busqueda (nombre voluntario/revisor), estado ('aprobado'|'rechazado'),
// desde/hasta (ISO strings), revisorId (admin específico, opcional).
export async function obtenerAuditoriaCompleta({
  page = 1,
  limit = 20,
  busqueda,
  estado,
  desde,
  hasta,
  revisorId,
} = {}) {
  try {
    const where = {
      estado: { in: ['aprobado', 'rechazado'] },
      fechaRevision: { not: null },
    };

    if (estado) where.estado = estado;
    if (revisorId) where.revisorId = revisorId;
    if (desde || hasta) {
      where.fechaRevision = {};
      if (desde) where.fechaRevision.gte = new Date(desde);
      if (hasta) {
        const h = new Date(hasta);
        h.setHours(23, 59, 59, 999);
        where.fechaRevision.lte = h;
      }
    }

    // Búsqueda por nombre/apellido (voluntario O revisor) en SQL para
    // escalar bien (evita filtrar en memoria con miles de registros).
    if (busqueda) {
      const q = busqueda.replace(/[%_]/g, '\\$&');
      where.OR = [
        { profile: { nombre: { contains: q, mode: 'insensitive' } } },
        { profile: { apellido: { contains: q, mode: 'insensitive' } } },
        { revisor: { nombre: { contains: q, mode: 'insensitive' } } },
        { revisor: { apellido: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [registros, total] = await Promise.all([
      prisma.registroAsistencia.findMany({
        where,
        orderBy: { fechaRevision: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          estado: true,
          fechaRevision: true,
          comentarioRevision: true,
          profile: { select: { nombre: true, apellido: true } },
          revisor: { select: { nombre: true, apellido: true } },
        },
      }),
      prisma.registroAsistencia.count({ where }),
    ]);

    return {
      data: registros,
      total,
      error: null,
    };
  } catch (error) {
    console.error('Error en obtenerAuditoriaCompleta:', error);
    return { data: [], total: 0, error };
  }
}

// Combina las tres consultas en paralelo. La usa el endpoint consolidado.
export async function obtenerDatosDashboard({ revisorId } = {}) {
  const [stats, tendencia, auditoria] = await Promise.all([
    obtenerEstadisticas(),
    obtenerTendenciaEnvios(),
    obtenerAuditoria({ revisorId }),
  ]);

  return {
    stats: stats.data || {},
    tendencia: tendencia.data || [],
    auditoria: auditoria.data || [],
    error: stats.error || tendencia.error || auditoria.error,
  };
}
