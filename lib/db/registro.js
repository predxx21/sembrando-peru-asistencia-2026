import { prisma } from './client';
import { calcularHoras } from '@/lib/utils/horas';

// Include común de los listados: perfil del voluntario y revisor del registro.
const INCLUDE_COMPLETO = { profile: true, revisor: true };

// Construye el `where` de Prisma a partir de los filtros opcionales que manda
// el endpoint de listado. Los rangos de fecha se pasan como "YYYY-MM-DD".
function construirWhere({ profileId, estado, busqueda, desde, hasta }) {
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

  return where;
}

// Aplica paginación (page 1-based + limit) al `findManyArgs` si viene definida.
function conPaginacion(args, page, limit) {
  if (!page || !limit) return args;
  return { ...args, take: limit, skip: (page - 1) * limit };
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
        estado: 'pendiente',
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
  evidenciaUrl,
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
        evidenciaUrl,
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