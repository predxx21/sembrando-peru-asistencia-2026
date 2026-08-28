import { prisma } from './client';
import { Prisma } from '@prisma/client';

// M-1: Agregaciones compartidas para estadísticas y reportes.
//
// Ambos módulos (estadisticas.js y reportes.js) necesitaban el mismo resumen
// (pendientes, totalHoras, horasAprobadas, voluntariosActivos). Se unifica
// aquí para no duplicar el SQL de agregación condicional (FILTER).
//
// `voluntariosActivos` cuenta profiles DISTINCT con al menos un registro en
// los últimos 30 días. `fechaLimite` se calcula en UTC para alinearse con
// cómo se guardan las fechas (medianoche UTC).
//
// Ahora acepta areaId para filtrar por área del voluntario.

export async function obtenerResumenGlobal(areaId) {
  try {
    const fechaLimite = new Date();
    fechaLimite.setMonth(fechaLimite.getMonth() - 1);

    // Construir la cláusula WHERE condicional
    let whereClause = Prisma.empty;
    if (areaId) {
      whereClause = Prisma.sql`WHERE "profileId" IN (SELECT id FROM "profiles" WHERE "areaId" = ${areaId})`;
    }

    const filas = await prisma.$queryRaw`
      SELECT
        COUNT(*) FILTER (WHERE estado = 'pendiente')::int AS pendientes,
        COALESCE(SUM(horas) FILTER (WHERE estado = 'aprobado'), 0) AS horas_aprobadas,
        COALESCE(SUM(horas), 0) AS total_horas,
        COUNT(DISTINCT "profileId") FILTER (WHERE fecha >= ${fechaLimite})::int AS voluntarios_activos
      FROM "registroasistencia"
      ${whereClause}
    `;

    const f = filas[0] || {};

    return {
      pendientes: Number(f.pendientes) || 0,
      totalHoras: Math.round(Number(f.total_horas) || 0),
      horasAprobadas: Math.round(Number(f.horas_aprobadas) || 0),
      voluntariosActivos: Number(f.voluntarios_activos) || 0,
    };
  } catch (error) {
    console.error('Error en obtenerResumenGlobal:', error);
    return null;
  }
}