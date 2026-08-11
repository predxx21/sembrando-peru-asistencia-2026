import { prisma } from './client';
import { DIAS_CORTOS } from '@/lib/utils/fecha';

// Reportes consolidados para /reportes (exclusivo de admin).
//
// Antes este módulo hacía 5 round-trips a la BD (4 agregados en Promise.all +
// 1 query secuencial de perfiles para los nombres). Como la conexión es única
// y serializada (lib/db/client.js), esos 5 viajes se encadenaban (~1.4s en la
// primera carga). Ahora TODO se resuelve en UNA sola query ($queryRaw) con tres
// subconsultas agregadas que devuelven columnas JSON: resumen con agregación
// condicional (FILTER), agregados por perfil (JOIN a profiles para el nombre,
// sin query extra) y horas por día de la semana actual. Mantiene el MISMO
// shape de salida para no romper `mapReportes` (lib/utils/reportesFormato.js).
//
// El summary usa la MISMA semántica que `obtenerEstadisticas`
// (lib/db/estadisticas.js): `totalHoras` suma TODAS las horas (no solo
// aprobadas) y `voluntariosActivos` cuenta a cualquiera con registro en el
// último mes. Así los 4 cards de métricas muestran valores idénticos en ambos
// paneles.

// Normaliza una columna json/jsonb de $queryRaw a un valor JS. Prisma suele
// parsearla sola; si el driver la devuelve como string, aquí se decodifica.
function parseJson(valor) {
  if (valor == null) return null;
  return typeof valor === 'string' ? JSON.parse(valor) : valor;
}

export async function obtenerReportes() {
  try {
    const ahora = new Date();
    const haceUnMes = new Date(ahora);
    haceUnMes.setMonth(haceUnMes.getMonth() - 1);

    // Lunes de la semana actual a medianoche UTC. Las fechas de registro se
    // guardan como medianoche UTC (new Date("YYYY-MM-DD")), así que el inicio
    // de semana se calcula con componentes UTC para alinearse sin desfase.
    const diasDesdeLunes = (ahora.getDay() + 6) % 7; // getDay(): 0 = domingo
    const inicioSemana = new Date(
      Date.UTC(
        ahora.getUTCFullYear(),
        ahora.getUTCMonth(),
        ahora.getUTCDate() - diasDesdeLunes
      )
    );
    const finSemana = new Date(inicioSemana.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Una sola query: la fila devuelta trae 3 columnas JSON (summary, perfiles,
    // dias). Todo el trabajo pesado (sumas, conteos, joins, agrupación por día)
    // ocurre en Postgres en un único round-trip.
    const filas = await prisma.$queryRaw`
      SELECT
        (
          SELECT json_build_object(
            'pendientes', COUNT(*) FILTER (WHERE estado = 'pendiente'),
            'totalHoras', COALESCE(SUM(horas), 0),
            'horasAprobadas', COALESCE(SUM(horas) FILTER (WHERE estado = 'aprobado'), 0),
            'voluntariosActivos', COUNT(DISTINCT "profileId") FILTER (
              WHERE fecha >= ${haceUnMes}
            )
          )
          FROM "registroasistencia"
        ) AS summary,
        (
          SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.horas DESC), '[]'::json)
          FROM (
            SELECT
              ra."profileId",
              p.nombre,
              p.apellido,
              COUNT(*)::int AS registros,
              COALESCE(SUM(ra.horas), 0) AS horas,
              -- ISO string para que el cliente lo formatee a es-PE sin parseo raro.
              to_char(MAX(ra.fecha), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS ultima_actividad
            FROM "registroasistencia" ra
            JOIN "profiles" p ON p.id = ra."profileId"
            WHERE ra.estado = 'aprobado'
            GROUP BY ra."profileId", p.nombre, p.apellido
          ) t
        ) AS perfiles,
        (
          SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
          FROM (
            SELECT
              -- Fecha ISO del día (lunes … domingo de la semana actual). La
              -- zona se fija a UTC para alinear el agrupado con cómo se
              -- guardan las fechas de registro (medianoche UTC).
              to_char((fecha AT TIME ZONE 'UTC')::date, 'YYYY-MM-DD') AS dia,
              COALESCE(SUM(horas), 0) AS horas
            FROM "registroasistencia"
            WHERE estado = 'aprobado' AND fecha >= ${inicioSemana} AND fecha < ${finSemana}
            GROUP BY 1
          ) t
        ) AS dias
    `;

    const summary = parseJson(filas[0]?.summary) || {};
    const perfiles = parseJson(filas[0]?.perfiles) || [];
    const diasAgregados = parseJson(filas[0]?.dias) || [];

    const pendientes = Number(summary.pendientes) || 0;
    const totalHoras = Number(summary.totalHoras) || 0;
    const horasAprobadas = Number(summary.horasAprobadas) || 0;
    const voluntariosActivos = Number(summary.voluntariosActivos) || 0;

    // Base del porcentaje de los contribuyentes: el "total" de la vista de
    // reportes conserva la semántica de horas aprobadas (perfiles y tabla de
    // voluntarios solo consideran aprobados).
    const totalAprobadas = horasAprobadas;

    // Top 5 aportantes (perfiles ya viene ordenado de mayor a menor horas).
    const contribuyentes = perfiles.slice(0, 5).map((r) => ({
      profileId: r.profileId,
      nombre: r.nombre || '',
      apellido: r.apellido || '',
      horas: Math.round(Number(r.horas) || 0),
      porcentaje: totalAprobadas
        ? Math.round(((Number(r.horas) || 0) / totalAprobadas) * 100)
        : 0,
    }));

    const voluntarios = perfiles.map((r) => ({
      profileId: r.profileId,
      nombre: r.nombre || '',
      apellido: r.apellido || '',
      registros: Number(r.registros) || 0,
      horas: Math.round(Number(r.horas) || 0),
      // Ya viene como ISO string desde SQL; el cliente lo formatea a es-PE
      // (mapReportes) sin necesidad de que sea un objeto Date.
      ultimaActividad: r.ultima_actividad || null,
    }));

    return {
      data: {
        stats: {
          pendientes,
          totalHoras: Math.round(totalHoras),
          horasAprobadas: Math.round(horasAprobadas),
          voluntariosActivos,
        },
        porSemana: agruparPorDia(
          diasAgregados,
          inicioSemana.toISOString().slice(0, 10)
        ),
        contribuyentes: contribuyentes,
        voluntarios,
      },
      error: null,
    };
  } catch (error) {
    console.error('Error en obtenerReportes:', error);
    return { data: null, error };
  }
}

// Horas aprobadas de la semana actual (lunes a domingo), con una entrada por
// día y 0s rellenados para los días sin actividad. `lunesISO` es la fecha del
// lunes en curso como "YYYY-MM-DD"; las filas YA vienen agregadas por día
// desde SQL ({ dia: 'YYYY-MM-DD', horas }).
function agruparPorDia(agregados, lunesISO) {
  const buckets = [];
  const lunes = new Date(`${lunesISO}T00:00:00.000Z`);

  for (let i = 0; i < 7; i++) {
    const fecha = new Date(lunes.getTime() + i * 24 * 60 * 60 * 1000);
    buckets.push({
      fecha: fecha.toISOString().slice(0, 10),
      dia: DIAS_CORTOS[i],
      value: 0,
    });
  }

  const porFecha = new Map(agregados.map((a) => [a.dia, Number(a.horas) || 0]));
  for (const bucket of buckets) {
    if (porFecha.has(bucket.fecha)) {
      bucket.value = Math.round(porFecha.get(bucket.fecha));
    }
  }

  return buckets;
}
