import { prisma } from './client';
import { getEtiquetaMes } from '@/lib/utils/fecha';

// Reportes consolidados para /reportes (exclusivo de admin).
//
// Sigue el mismo enfoque que lib/db/estadisticas.js: UNA consulta trae los
// registros aprobados y el cómputo (stats, por mes, contribuyentes y
// voluntarios) se hace en JS, para evitar N consultas secuenciales a la BD.

// Meta de horas del proyecto (usada en la tarjeta "Hito del Proyecto").
const META_HORAS = 15000;

export async function obtenerReportes() {
  try {
    const registros = await prisma.registroAsistencia.findMany({
      where: { estado: 'aprobado' },
      include: { profile: true },
      orderBy: { fecha: 'asc' },
    });

    const data = {
      stats: calcularStats(registros),
      porMes: agruparPorMes(registros),
      contribuyentes: calcularContribuyentes(registros),
      voluntarios: calcularVoluntarios(registros),
    };

    return { data, error: null };
  } catch (error) {
    console.error('Error en obtenerReportes:', error);
    return { data: null, error };
  }
}

// Resumen general: horas aprobadas, voluntarios activos (últimos 30 días,
// mismo criterio que el dashboard) y promedio por voluntario con horas.
function calcularStats(registros) {
  const totalHoras = registros.reduce((sum, r) => sum + (r.horas || 0), 0);

  const haceUnMes = new Date();
  haceUnMes.setMonth(haceUnMes.getMonth() - 1);

  const perfilesActivos = new Set(registros.map((r) => r.profileId));
  const activosRecientes = new Set(
    registros.filter((r) => r.fecha >= haceUnMes).map((r) => r.profileId)
  );

  const promedioHoras = perfilesActivos.size
    ? Math.round((totalHoras / perfilesActivos.size) * 10) / 10
    : 0;

  const percent = Math.min(100, Math.round((totalHoras / META_HORAS) * 100));

  return {
    totalHoras: Math.round(totalHoras),
    voluntariosActivos: activosRecientes.size,
    promedioHoras,
    meta: META_HORAS,
    percent,
  };
}

// Horas aprobadas de los últimos 12 meses, con etiqueta corta (Ene…Dic) y
// 0s rellenados para los meses sin actividad. Orden: del más antiguo al
// más reciente (mismo patrón que obtenerTendenciaEnvios).
function agruparPorMes(registros) {
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

  for (const registro of registros) {
    const key = `${registro.fecha.getFullYear()}-${registro.fecha.getMonth()}`;
    const bucket = buckets.find((b) => b.key === key);
    if (bucket) bucket.value += registro.horas || 0;
  }

  return buckets.map(({ month, year, value }) => ({
    month,
    year,
    value: Math.round(value),
  }));
}

// Top 5 perfiles por horas aprobadas, con su porcentaje del total.
function calcularContribuyentes(registros) {
  const porPerfil = new Map();

  for (const registro of registros) {
    const perfil = registro.profile;
    const actual = porPerfil.get(registro.profileId) || {
      profileId: registro.profileId,
      nombre: perfil?.nombre || '',
      apellido: perfil?.apellido || '',
      horas: 0,
    };
    actual.horas += registro.horas || 0;
    porPerfil.set(registro.profileId, actual);
  }

  const totalHoras = registros.reduce((sum, r) => sum + (r.horas || 0), 0) || 1;

  return [...porPerfil.values()]
    .map(({ profileId, nombre, apellido, horas }) => ({
      profileId,
      nombre,
      apellido,
      horas: Math.round(horas),
      porcentaje: Math.round((horas / totalHoras) * 100),
    }))
    .sort((a, b) => b.horas - a.horas)
    .slice(0, 5);
}

// Fila por perfil (solo quienes tienen al menos una hora aprobada): total de
// horas, nº de registros y fecha de su última actividad.
function calcularVoluntarios(registros) {
  const porPerfil = new Map();

  for (const registro of registros) {
    const perfil = registro.profile;
    const actual = porPerfil.get(registro.profileId) || {
      profileId: registro.profileId,
      nombre: perfil?.nombre || '',
      apellido: perfil?.apellido || '',
      registros: 0,
      horas: 0,
      ultimaActividad: null,
    };
    actual.registros += 1;
    actual.horas += registro.horas || 0;
    if (!actual.ultimaActividad || registro.fecha > actual.ultimaActividad) {
      actual.ultimaActividad = registro.fecha;
    }
    porPerfil.set(registro.profileId, actual);
  }

  return [...porPerfil.values()]
    .map(({ profileId, nombre, apellido, registros, horas, ultimaActividad }) => ({
      profileId,
      nombre,
      apellido,
      registros,
      horas: Math.round(horas),
      // Se serializa a ISO string; el cliente lo formatea a es-PE (mapReportes).
      ultimaActividad: ultimaActividad ? ultimaActividad.toISOString() : null,
    }))
    .sort((a, b) => b.horas - a.horas);
}
