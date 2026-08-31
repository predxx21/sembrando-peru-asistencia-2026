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
// Ahora acepta areaId para filtrar por área del voluntario.
export async function obtenerEstadisticas(areaId) {
  try {
    const resumen = await obtenerResumenGlobal(areaId);
    if (!resumen) throw new Error('Error en agregación');

    return { data: resumen, error: null };
  } catch (error) {
    console.error('Error en obtenerEstadisticas:', error);
    return { data: null, error };
  }
}

// Tendencia de envíos de la semana actual.
// Una SOLA consulta trae las fechas del rango y el conteo se hace en JS,
// rellenando con 0 los días sin envíos. La semana va de LUNES a DOMINGO
// (getDay(): 0 = domingo, 1 = lunes), así el gráfico siempre se ordena
// L M M J V S D sin importar qué día de la semana sea hoy.
// Ahora acepta areaId para filtrar por área del voluntario.
export async function obtenerTendenciaEnvios(areaId) {
  try {
    const hoy = new Date();

    // Calcular el lunes de la semana actual
    const diaSemana = hoy.getDay(); // 0 a 6 (domingo a sábado)
    const diasDesdeLunes = diaSemana === 0 ? 6 : diaSemana - 1;
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - diasDesdeLunes);
    lunes.setHours(0, 0, 0, 0);

    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    domingo.setHours(23, 59, 59, 999);

    // Construir where con o sin filtro de área
    const whereFecha = { fecha: { gte: lunes, lte: domingo } };
    let where = whereFecha;
    if (areaId) {
      where = {
        ...whereFecha,
        profile: { areaId },
      };
    }

    const registros = await prisma.registroAsistencia.findMany({
      where,
      select: { fecha: true },
    });

    // Domingo = 'D', Lunes = 'L', Martes = 'M', Miércoles = 'M',
    // Jueves = 'J', Viernes = 'V', Sábado = 'S'
    const etiquetas = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
    const resultados = [];

    // Lunes → Domingo siempre
    for (let i = 0; i < 7; i++) {
      const fecha = new Date(lunes);
      fecha.setDate(lunes.getDate() + i);
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
// Ahora acepta areaId para filtrar por área del voluntario (y revisorId opcional).
export async function obtenerAuditoria({ revisorId, areaId } = {}) {
  try {
    const where = {
      estado: { in: ['aprobado', 'rechazado'] },
      fechaRevision: { not: null },
    };

    if (revisorId) {
      where.revisorId = revisorId;
    }
    if (areaId) {
      where.profile = { areaId };
    }

    const registros = await prisma.registroAsistencia.findMany({
      where,
      orderBy: { fechaRevision: 'desc' },
      take: 5,
      select: {
        id: true,
        estado: true,
        fechaRevision: true,
        profile: { select: { nombre: true } },
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
// desde/hasta (ISO strings), revisorId (admin específico, opcional), areaId.
export async function obtenerAuditoriaCompleta({
  page = 1,
  limit = 20,
  busqueda,
  estado,
  desde,
  hasta,
  revisorId,
  areaId,
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
    if (areaId) {
      where.profile = { areaId };
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
// La auditoría del dashboard muestra los últimos registros de TODOS los admins
// (no filtrada por revisor) — el filtro por admin solo aplica en la vista
// completa /administracion/auditoria.
// Ahora acepta areaId para pasar a obtenerEstadisticas y obtenerAuditoria (filtra por área).
export async function obtenerDatosDashboard(areaId) {
  const [stats, tendencia, auditoria] = await Promise.all([
    obtenerEstadisticas(areaId),
    obtenerTendenciaEnvios(areaId),
    obtenerAuditoria({ areaId }), // sin revisorId → auditoría global filtrada por área
  ]);

  return {
    stats: stats.data || {},
    tendencia: tendencia.data || [],
    auditoria: auditoria.data || [],
    error: stats.error || tendencia.error || auditoria.error,
  };
}