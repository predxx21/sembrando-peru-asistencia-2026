import { prisma } from './client';
import { getEtiquetaMes } from '@/lib/utils/fecha';

// Reportes consolidados para /reportes (exclusivo de admin).
//
// Antes este módulo bajaba TODAS las filas aprobadas (con su perfil) y hacía
// todo el cómputo en JS: con datos reales eso tomaba segundos y no escalaba.
// Ahora se resuelve con agregación SQL en paralelo (aggregate/groupBy) y solo
// se traen las filas mínimas (fecha+horas de los últimos 12 meses) para el
// gráfico por mes. Mantiene el MISMO shape de salida para no romper
// `mapReportes` (lib/utils/reportesFormato.js).

// Meta de horas del proyecto (usada en la tarjeta "Hito del Proyecto").
const META_HORAS = 15000;

export async function obtenerReportes() {
  try {
    const ahora = new Date();
    const haceUnMes = new Date(ahora);
    haceUnMes.setMonth(haceUnMes.getMonth() - 1);
    const inicioDoceMeses = new Date(ahora.getFullYear(), ahora.getMonth() - 11, 1);

    const [totalAgr, activos, porPerfil, meses] = await Promise.all([
      prisma.registroAsistencia.aggregate({
        where: { estado: 'aprobado' },
        _sum: { horas: true },
      }),
      prisma.registroAsistencia.groupBy({
        by: ['profileId'],
        where: { estado: 'aprobado', fecha: { gte: haceUnMes } },
        _count: true,
      }),
      prisma.registroAsistencia.groupBy({
        by: ['profileId'],
        where: { estado: 'aprobado' },
        _sum: { horas: true },
        _count: { _all: true },
        _max: { fecha: true },
      }),
      prisma.registroAsistencia.findMany({
        where: { estado: 'aprobado', fecha: { gte: inicioDoceMeses } },
        select: { fecha: true, horas: true },
      }),
    ]);

    const totalHoras = totalAgr._sum.horas || 0;
    const perfilesConHoras = porPerfil.length;
    const promedioHoras = perfilesConHoras
      ? Math.round((totalHoras / perfilesConHoras) * 10) / 10
      : 0;
    const percent = Math.min(100, Math.round((totalHoras / META_HORAS) * 100));

    // Nombre/apellido de los perfiles con horas aprobadas (una sola query).
    const ids = porPerfil.map((r) => r.profileId);
    const perfiles = ids.length
      ? await prisma.profile.findMany({
          where: { id: { in: ids } },
          select: { id: true, nombre: true, apellido: true },
        })
      : [];
    const perfilMap = new Map(perfiles.map((p) => [p.id, p]));

    const contribuyentes = porPerfil
      .map((r) => {
        const perfil = perfilMap.get(r.profileId);
        return {
          profileId: r.profileId,
          nombre: perfil?.nombre || '',
          apellido: perfil?.apellido || '',
          horas: Math.round(r._sum.horas || 0),
          porcentaje: totalHoras
            ? Math.round(((r._sum.horas || 0) / totalHoras) * 100)
            : 0,
        };
      })
      .sort((a, b) => b.horas - a.horas)
      .slice(0, 5);

    const voluntarios = porPerfil
      .map((r) => {
        const perfil = perfilMap.get(r.profileId);
        return {
          profileId: r.profileId,
          nombre: perfil?.nombre || '',
          apellido: perfil?.apellido || '',
          registros: r._count._all,
          horas: Math.round(r._sum.horas || 0),
          // Se serializa a ISO; el cliente lo formatea a es-PE (mapReportes).
          ultimaActividad: r._max.fecha ? r._max.fecha.toISOString() : null,
        };
      })
      .sort((a, b) => b.horas - a.horas);

    return {
      data: {
        stats: {
          totalHoras: Math.round(totalHoras),
          voluntariosActivos: activos.length,
          promedioHoras,
          meta: META_HORAS,
          percent,
        },
        porMes: agruparPorMes(meses),
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
// reciente. Recibe solo { fecha, horas } (las filas del rango).
function agruparPorMes(filas) {
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

  for (const fila of filas) {
    const key = `${fila.fecha.getFullYear()}-${fila.fecha.getMonth()}`;
    const bucket = buckets.find((b) => b.key === key);
    if (bucket) bucket.value += fila.horas || 0;
  }

  return buckets.map(({ month, year, value }) => ({
    month,
    year,
    value: Math.round(value),
  }));
}