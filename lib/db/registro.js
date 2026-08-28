import { prisma } from './client';
import { calcularHoras } from '@/lib/utils/horas';
import { esHoraFinMayorAInicio } from '@/lib/utils/validar';

// M-2: select mínimo para listados (evita traer todas las columnas de profile y revisor)
const SELECT_LISTADO = {
  profile: {
    select: {
      id: true,
      nombre: true,
      apellido: true,
      avatarUrl: true,
      areaId: true,
      area: { select: { id: true, nombre: true } },
    },
  },
  revisor: {
    select: {
      id: true,
      nombre: true,
      apellido: true,
    },
  },
};

// Construye el `where` de Prisma a partir de los filtros opcionales
function construirWhere({ profileId, estado, busqueda, desde, hasta, area }) {
  const where = {};

  if (profileId) where.profileId = profileId;
  if (estado) where.estado = estado;

  const rangoFecha = {};
  if (desde) rangoFecha.gte = new Date(`${desde}T00:00:00Z`);
  if (hasta) rangoFecha.lte = new Date(`${hasta}T23:59:59Z`);
  if (Object.keys(rangoFecha).length) where.fecha = rangoFecha;

  // Búsqueda por nombre/apellido (case-insensitive)
  if (busqueda) {
    const busquedaSanitizada = busqueda.replace(/[%_]/g, '\\$&');
    where.profile = {
      OR: [
        { nombre: { contains: busquedaSanitizada, mode: 'insensitive' } },
        { apellido: { contains: busquedaSanitizada, mode: 'insensitive' } },
      ],
    };
  }

  // Filtro por área
  if (area) {
    where.profile = {
      ...where.profile,
      areaId: { equals: area },
    };
  }

  return where;
}

// Aplica paginación (page 1-based + limit)
function conPaginacion(args, page, limit) {
  if (!page || !limit) return args;
  return { ...args, take: limit, skip: (page - 1) * limit };
}

// ============================================================
//  CRONÓMETRO
// ============================================================

// Obtener sesión activa de un usuario
export async function obtenerSesionActiva(profileId) {
  try {
    const registro = await prisma.registroAsistencia.findFirst({
      where: { profileId, sesionActiva: true },
    });
    return { data: registro, error: null };
  } catch (error) {
    console.error('Error en obtenerSesionActiva:', error);
    return { data: null, error };
  }
}

// Iniciar sesión de cronómetro (transacción atómica)
export async function iniciarSesionCronometro({ profileId, descripcion }) {
  try {
    return await prisma.$transaction(async (tx) => {
      const existente = await tx.registroAsistencia.findFirst({
        where: { profileId, sesionActiva: true },
      });
      if (existente) {
        throw new Error('Ya tienes una sesión activa.');
      }

      const ahora = new Date();
      const registro = await tx.registroAsistencia.create({
        data: {
          profileId,
          fecha: ahora,
          horaInicioReal: ahora,
          horaInicio: ahora.toTimeString().slice(0, 5),
          horaFin: '',
          horas: 0,
          descripcion,
          sesionActiva: true,
          estado: 'pendiente',
        },
      });
      return { data: registro, error: null };
    });
  } catch (error) {
    console.error('Error en iniciarSesionCronometro:', error);
    return { data: null, error };
  }
}

// Finalizar cronómetro
export async function terminarSesionCronometro({ profileId }) {
  try {
    const registro = await prisma.registroAsistencia.findFirst({
      where: { profileId, sesionActiva: true },
    });

    if (!registro) {
      return { data: null, error: { message: 'No hay sesión activa', status: 409 } };
    }

    const ahora = new Date();
    const horaFin = ahora.toTimeString().slice(0, 5);
    const horaInicioReal = new Date(registro.horaInicioReal);
    const diffMs = ahora - horaInicioReal;
    const horas = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));

    const actualizado = await prisma.registroAsistencia.update({
      where: { id: registro.id },
      data: {
        horaFin,
        horas: Math.max(0, horas),
        sesionActiva: false,
      },
    });
    return { data: actualizado, error: null };
  } catch (error) {
    console.error('Error en terminarSesionCronometro:', error);
    return { data: null, error: { message: 'Error interno', status: 500 } };
  }
}

// ============================================================
//  REGISTROS MANUALES (solo para compatibilidad, actualmente no se usan)
// ============================================================

export async function guardarRegistroAsistencia({
  profileId,
  fecha,
  horaInicio,
  horaFin,
  descripcion,
}) {
  try {
    const horas = calcularHoras(horaInicio, horaFin);
    const registro = await prisma.registroAsistencia.create({
      data: {
        profileId,
        fecha: new Date(`${fecha}T00:00:00.000Z`),
        horaInicio,
        horaFin,
        horas,
        descripcion,
        estado: 'pendiente',
      },
    });
    return { data: registro, error: null };
  } catch (error) {
    console.error('Error en guardarRegistroAsistencia:', error);
    return { data: null, error };
  }
}

// ============================================================
//  CONSULTAS
// ============================================================

export async function obtenerRegistrosPorUsuario(profileId, filtros = {}) {
  try {
    const where = construirWhere({ ...filtros, profileId });
    const args = conPaginacion(
      { where, orderBy: { fecha: 'desc' }, include: SELECT_LISTADO },
      filtros.page,
      filtros.limit
    );

    const [data, total] = await Promise.all([
      prisma.registroAsistencia.findMany(args),
      prisma.registroAsistencia.count({ where }),
    ]);
    return { data, total, error: null };
  } catch (error) {
    console.error('Error en obtenerRegistrosPorUsuario:', error);
    return { data: null, total: 0, error };
  }
}

export async function obtenerRegistroPorId(id) {
  try {
    const registro = await prisma.registroAsistencia.findUnique({
      where: { id: Number(id) },
      include: SELECT_LISTADO,
    });
    return { data: registro, error: null };
  } catch (error) {
    console.error('Error en obtenerRegistroPorId:', error);
    return { data: null, error };
  }
}

export async function obtenerTodosLosRegistros(filtros = {}) {
  try {
    const where = construirWhere(filtros);
    const args = conPaginacion(
      { where, orderBy: { fecha: 'desc' }, include: SELECT_LISTADO },
      filtros.page,
      filtros.limit
    );

    const [data, total] = await Promise.all([
      prisma.registroAsistencia.findMany(args),
      prisma.registroAsistencia.count({ where }),
    ]);
    return { data, total, error: null };
  } catch (error) {
    console.error('Error en obtenerTodosLosRegistros:', error);
    return { data: null, total: 0, error };
  }
}

// ============================================================
//  APROBAR / RECHAZAR (auditoría)
// ============================================================

export async function actualizarEstadoRegistro({ id, estado, comentarioRevision, revisorId }) {
  try {
    const registroActual = await prisma.registroAsistencia.findUnique({
      where: { id: Number(id) },
      select: { sesionActiva: true },
    });
    if (!registroActual) {
      return { data: null, error: { message: 'Registro no encontrado', status: 404 } };
    }
    if (registroActual.sesionActiva) {
      return { data: null, error: { message: 'No se puede modificar un registro en curso', status: 409 } };
    }

    const registro = await prisma.registroAsistencia.update({
      where: { id: Number(id) },
      data: {
        estado,
        comentarioRevision: comentarioRevision || null,
        revisorId,
        fechaRevision: new Date(),
      },
    });
    return { data: registro, error: null };
  } catch (error) {
    console.error('Error en actualizarEstadoRegistro:', error);
    return { data: null, error: { message: 'Error interno', status: 500 } };
  }
}

// ============================================================
//  CORREGIR REGISTRO (voluntario) – adaptado a cronómetro
// ============================================================

/**
 * Reenvía un registro rechazado con datos corregidos (SOLO fecha y descripción).
 * Las horas se mantienen intactas porque vienen del cronómetro.
 */
export async function corregirRegistro({
  id,
  profileId,
  fecha,
  descripcion,
  // ⚠️ horaInicio y horaFin ya NO se usan – se mantienen los valores originales
}) {
  try {
    // Verificar que el registro existe, pertenece al usuario, está rechazado y no activo
    const registroExistente = await prisma.registroAsistencia.findFirst({
      where: {
        id: Number(id),
        profileId,
        estado: 'rechazado',
        sesionActiva: false,
      },
      select: {
        id: true,
        horas: true,
        horaInicio: true,
        horaFin: true,
        horaInicioReal: true,
      },
    });

    if (!registroExistente) {
      return {
        data: null,
        error: {
          message: 'Registro no encontrado, no autorizado, no rechazado o en curso.',
          status: 404,
        },
      };
    }

    // Mantenemos las horas, horaInicio, horaFin y horaInicioReal originales
    const registro = await prisma.registroAsistencia.update({
      where: {
        id: Number(id),
        profileId, // asegura que solo el dueño pueda corregir
      },
      data: {
        fecha: new Date(`${fecha}T00:00:00.000Z`),
        descripcion,
        // Las horas y tiempos se mantienen SIN CAMBIOS
        horas: registroExistente.horas,
        horaInicio: registroExistente.horaInicio,
        horaFin: registroExistente.horaFin,
        horaInicioReal: registroExistente.horaInicioReal,
        // Reseteamos el estado a pendiente y limpiamos revisión
        estado: 'pendiente',
        comentarioRevision: null,
        revisorId: null,
        fechaRevision: null,
      },
    });

    return { data: registro, error: null };
  } catch (error) {
    console.error('Error en corregirRegistro:', error);
    return { data: null, error };
  }
}