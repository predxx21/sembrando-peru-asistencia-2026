import { prisma } from './client';
import { calcularHoras } from '@/lib/utils/horas';

// Include común de los listados: perfil del voluntario y revisor del registro.
const INCLUDE_COMPLETO = { profile: true, revisor: true };

// Construye el `where` de Prisma a partir de los filtros opcionales que manda
// el endpoint de listado. Los rangos de fecha se pasan como "YYYY-MM-DD".
function construirWhere({ profileId, estado, busqueda, desde, hasta, area }) {
  const where = {};

  if (profileId) where.profileId = profileId;
  if (estado) where.estado = estado;

  const rangoFecha = {};
  if (desde) rangoFecha.gte = new Date(`${desde}T00:00:00`);
  if (hasta) rangoFecha.lte = new Date(`${hasta}T23:59:59`);
  if (Object.keys(rangoFecha).length) where.fecha = rangoFecha;

  // Búsqueda por nombre/apellido del voluntario (case-insensitive).
  if (busqueda) {
    where.profile = {
      OR: [
        { nombre: { contains: busqueda, mode: 'insensitive' } },
        { apellido: { contains: busqueda, mode: 'insensitive' } },
      ],
    };
  }

  // Filtro por área
  if (area) {
    where.profile = {
      ...where.profile,
      area: { equals: area },
    };
  }

  return where;
}

// Aplica paginación (page 1-based + limit) al `findManyArgs` si viene definida.
function conPaginacion(args, page, limit) {
  if (!page || !limit) return args;
  return { ...args, take: limit, skip: (page - 1) * limit };
}

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

// Crear sesión de cronómetro (horaInicioReal = now)
export async function iniciarSesionCronometro({ profileId, descripcion }) {
  try {
    const ahora = new Date();
    const registro = await prisma.registroAsistencia.create({
      data: {
        profileId,
        fecha: ahora,
        horaInicioReal: ahora,
        horaInicio: ahora.toTimeString().slice(0, 5), // "HH:MM" para display
        horaFin: '',
        horas: 0,
        descripcion,
        sesionActiva: true,
        estado: 'aprobado',
      },
    });
    return { data: registro, error: null };
  } catch (error) {
    console.error('Error en iniciarSesionCronometro:', error);
    return { data: null, error };
  }
}

// Finalizar cronómetro - CORREGIDO: buscar por profileId, no por id numérico
export async function terminarSesionCronometro({ profileId }) {
  try {
    // Buscar la sesión activa del usuario
    const registro = await prisma.registroAsistencia.findFirst({
      where: { profileId, sesionActiva: true },
    });

    if (!registro) {
      return { data: null, error: new Error('No hay sesión activa') };
    }

    const ahora = new Date();
    const horaFin = ahora.toTimeString().slice(0, 5);

    // ⚠️ CORRECCIÓN CRÍTICA: Calcular horas por diferencia de timestamps
    // NO usar calcularHoras() porque falla si cruza medianoche
    const horaInicioReal = new Date(registro.horaInicioReal);
    const diffMs = ahora - horaInicioReal;
    const horas = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));

    const actualizado = await prisma.registroAsistencia.update({
      where: { id: registro.id },
      data: {
        horaFin,
        horas: Math.max(0, horas), // Asegurar que no sea negativo
        sesionActiva: false,
      },
    });
    return { data: actualizado, error: null };
  } catch (error) {
    console.error('Error en terminarSesionCronometro:', error);
    return { data: null, error };
  }
}

export async function guardarRegistroAsistencia({
  profileId,
  fecha,
  horaInicio,
  horaFin,
  descripcion,
  evidenciaUrl,
}) {
  try {
    // El servidor recalcula las horas a partir de las horas de inicio/fin
    // (misma lógica que el formulario en el cliente) en vez de confiar en el
    // valor que manda el navegador. Así no se puede registrar un total trucado.
    const horas = calcularHoras(horaInicio, horaFin);

    const registro = await prisma.registroAsistencia.create({
      data: {
        profileId,
        fecha: new Date(fecha),
        horaInicio,
        horaFin,
        horas,
        descripcion,
        evidenciaUrl,
        estado: 'aprobado', // CAMBIO: Aprobado por defecto
      },
    });
    return { data: registro, error: null };
  } catch (error) {
    console.error('Error en guardarRegistroAsistencia:', error);
    return { data: null, error };
  }
}

export async function obtenerRegistrosPorUsuario(profileId, filtros = {}) {
  try {
    const where = construirWhere({ ...filtros, profileId });
    const args = conPaginacion(
      { where, orderBy: { fecha: 'desc' }, include: INCLUDE_COMPLETO },
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
      include: INCLUDE_COMPLETO,
    });
    return { data: registro, error: null };
  } catch (error) {
    console.error('Error en obtenerRegistroPorId:', error);
    return { data: null, error };
  }
}

// Lista TODOS los registros del sistema (para el Panel de Administración),
// con filtros opcionales (estado, búsqueda, rango de fechas) y paginación.
// `page`/`limit` 1-based; sin ellos devuelve todo (compat con llamadas que no
// pagan). Devuelve { data, total } para la paginación del cliente.
export async function obtenerTodosLosRegistros(filtros = {}) {
  try {
    const where = construirWhere(filtros);
    const args = conPaginacion(
      { where, orderBy: { fecha: 'desc' }, include: INCLUDE_COMPLETO },
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

// Aprueba o rechaza un registro.
// NUEVO: El admin puede auditar cualquier registro, no solo los pendientes
export async function actualizarEstadoRegistro({ id, estado, comentarioRevision, revisorId }) {
  try {
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
    return { data: null, error };
  }
}

// Reenvía un registro rechazado con los datos corregidos por el voluntario.
// Solo el dueño del registro lo llama (desde la pantalla de corrección).
// Al reenviar, el registro vuelve a 'pendiente' y se limpia la revisión
// anterior para que el coordinador lo evalúe como nuevo.
export async function corregirRegistro({
  id,
  profileId,
  fecha,
  horaInicio,
  horaFin,
  descripcion,
}) {
  try {
    const horas = calcularHoras(horaInicio, horaFin);

    const registro = await prisma.registroAsistencia.update({
      where: { id: Number(id) },
      data: {
        fecha: new Date(fecha),
        horaInicio,
        horaFin,
        horas,
        descripcion,
        // Mantener evidenciaUrl existente (legacy) - no se sobrescribe
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