import { prisma } from './client';
import { getEtiquetaMes } from '@/lib/utils/fecha';

// Reportes consolidados para /reportes (exclusivo de admin).
//
// Antes este módulo hacía 5 round-trips a la BD (4 agregados en Promise.all +
// 1 query secuencial de perfiles para los nombres). Como la conexión es única
// y serializada (lib/db/client.js), esos 5 viajes se encadenaban (~1.4s en la
// primera carga). Ahora TODO se resuelve en UNA sola query ($queryRaw) con tres
// subconsultas agregadas que devuelven columnas JSON: resumen con agregación
// condicional (FILTER), agregados por perfil (JOIN a profiles para el nombre,
// sin query extra) y horas por mes. Mantiene el MISMO shape de salida para no
// romper `mapReportes` (lib/utils/reportesFormato.js).

// Meta de horas del proyecto (usada en la tarjeta "Hito del Proyecto").
const META_HORAS = 15000;

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
    const inicioDoceMeses = new Date(ahora.getFullYear(), ahora.getMonth() - 11, 1);

    // Una sola query: la fila devuelta trae 3 columnas JSON (summary, perfiles,
    // meses). Todo el trabajo pesado (sumas, conteos, joins, agrupación por mes)
    // ocurre en Postgres en un único round-trip.
    const filas = await prisma.$queryRaw`
      SELECT
        (
          SELECT json_build_object(
            'totalHoras', COALESCE(SUM(horas) FILTER (WHERE estado = 'aprobado'), 0),
            'voluntariosActivos', COUNT(DISTINCT "profileId") FILTER (
              WHERE estado = 'aprobado' AND fecha >= ${haceUnMes}
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
              EXTRACT(YEAR FROM fecha)::int AS year,
              EXTRACT(MONTH FROM fecha)::int AS month,
              COALESCE(SUM(horas), 0) AS horas
            FROM "registroasistencia"
            WHERE estado = 'aprobado' AND fecha >= ${inicioDoceMeses}
            GROUP BY 1, 2
          ) t
        ) AS meses
    `;

    const summary = parseJson(filas[0]?.summary) || {};
    const perfiles = parseJson(filas[0]?.perfiles) || [];
    const porMesAgregado = parseJson(filas[0]?.meses) || [];

    const totalHoras = Number(summary.totalHoras) || 0;
    const voluntariosActivos = Number(summary.voluntariosActivos) || 0;
    const perfilesConHoras = perfiles.length;
    const promedioHoras = perfilesConHoras
      ? Math.round((totalHoras / perfilesConHoras) * 10) / 10
      : 0;
    const percent = Math.min(100, Math.round((totalHoras / META_HORAS) * 100));

    // Top 5 aportantes (perfiles ya viene ordenado de mayor a menor horas).
    const contribuyentes = perfiles.slice(0, 5).map((r) => ({
      profileId: r.profileId,
      nombre: r.nombre || '',
      apellido: r.apellido || '',
      horas: Math.round(Number(r.horas) || 0),
      porcentaje: totalHoras
        ? Math.round(((Number(r.horas) || 0) / totalHoras) * 100)
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
          totalHoras: Math.round(totalHoras),
          voluntariosActivos,
          promedioHoras,
          meta: META_HORAS,
          percent,
        },
        porMes: agruparPorMes(porMesAgregado),
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

// Horas aprobadas de los últimos 12 meses, con etiqueta corta (Ene…Dic) y 0s
// rellenados para los meses sin actividad. Orden: del más antiguo al más
// reciente. Recibe las filas YA agregadas por mes desde SQL ({ year, month,
// horas }) — el mes llega 1-12 (EXTRACT de Postgres) y aquí se convierte a
// 0-11 (getMonth de JS).
function agruparPorMes(agregados) {
  const ahora = new Date();
  const buckets = [];

  for (let i = 11; i >= 0; i--) {
    const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    buckets.push({
      key: `${fecha.getFullYear()}-${fecha.getMonth()}`,
      month: getEtiquetaMes(fecha),
      year: fecha.getFullYear(),
      value: 0,
    });
  }

  for (const a of agregados) {
    const key = `${a.year}-${(Number(a.month) || 0) - 1}`;
    const bucket = buckets.find((b) => b.key === key);
    if (bucket) bucket.value += Number(a.horas) || 0;
  }

  return buckets.map(({ month, year, value }) => ({
    month,
    year,
    value: Math.round(value),
  }));
}
