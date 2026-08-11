// Mapper puro que transforma el payload de /api/admin/reportes al contrato
// que espera la UI de /reportes. Al ser puro se testea con Vitest sin
// necesidad de mockear Supabase ni fetch (ver reportesFormato.test.js).
import { formatFechaEs } from './fecha';

const COLOR_AVATAR = '#197343';

function inicialesDe(nombre, apellido) {
  const n = (nombre || '').trim();
  const a = (apellido || '').trim();
  return `${n.charAt(0) || ''}${a.charAt(0) || ''}`.toUpperCase() || 'V';
}

function nombreCompleto(nombre, apellido) {
  return [nombre, apellido].filter(Boolean).join(' ').trim() || 'Voluntario';
}

export function mapReportes(payload) {
  const datos = payload || {};

  const stats = {
    pendientes: datos.stats?.pendientes ?? 0,
    horasAprobadas: datos.stats?.horasAprobadas ?? 0,
    totalHoras: datos.stats?.totalHoras ?? 0,
    voluntariosActivos: datos.stats?.voluntariosActivos ?? 0,
  };

  const porSemana = (datos.porSemana || []).map(({ fecha, dia, value }) => ({
    fecha,
    dia,
    value: Number(value) || 0,
  }));

  const contribuyentes = (datos.contribuyentes || []).map((c) => ({
    id: c.profileId,
    name: nombreCompleto(c.nombre, c.apellido),
    iniciales: inicialesDe(c.nombre, c.apellido),
    avatarColor: COLOR_AVATAR,
    horas: `${c.horas ?? 0}h`,
    context: `${c.porcentaje ?? 0}% del total`,
  }));

  const voluntarios = (datos.voluntarios || []).map((v) => ({
    id: v.profileId,
    nombre: nombreCompleto(v.nombre, v.apellido),
    iniciales: inicialesDe(v.nombre, v.apellido),
    avatarColor: COLOR_AVATAR,
    registros: v.registros ?? 0,
    horas: Number(v.horas) || 0,
    ultimaActividad: v.ultimaActividad ? formatFechaEs(v.ultimaActividad) : '—',
    // Fecha ISO sin formatear: la usa el modal de exportación para filtrar
    // por rango de fecha (new Date() no debe parsear el texto ya formateado).
    ultimaActividadISO: v.ultimaActividad || null,
  }));

  return { stats, porSemana, contribuyentes, voluntarios };
}
