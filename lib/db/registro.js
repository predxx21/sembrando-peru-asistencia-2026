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
  if (desde) rangoFecha.gte = new Date(`${desde}T00:00:00Z`);  // ← se agrega la 'Z'
  if (hasta) rangoFecha.lte = new Date(`${hasta}T23:59:59Z`);  // ← se agrega la 'Z'
  if (Object.keys(rangoFecha).length) where.fecha = rangoFecha;

  // Búsqueda por nombre/apellido (case-insensitive) con escape de comodines
  if (busqueda) {
    // Escapar caracteres comodín: %, _ (que son especiales en LIKE)
    const busquedaSanitizada = busqueda.replace(/[%_]/g, '\\$&');
    where.profile = {
      OR: [
        { nombre: { contains: busquedaSanitizada, mode: 'insensitive' } },
        { apellido: { contains: busquedaSanitizada, mode: 'insensitive' } },
      ],
    };
  }

  // Filtro por área: ahora es un areaId (FK a la tabla areas).
  // Si se pasa un areaId, filtramos por profile.areaId.
  if (area) {
    where.profile = {
      ...where.profile,
      areaId: { equals: area },
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
// Usa transacción atómica para evitar race condition: verifica + crea en una sola operación.
export async function iniciarSesionCronometro({ profileId, descripcion }) {
  try {
    return await prisma.$transaction(async (tx) => {
      // Verificar dentro de la transacción (snapshot aislado) que no haya sesión activa
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
          horaInicio: ahora.toTimeString().slice(0, 5), // "HH:MM" para display
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

// Finalizar cronómetro - CORREGIDO: buscar por profileId, no por id numérico
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

export async function guardarRegistroAsistencia({
  profileId,
  fecha,
  horaInicio,
  horaFin,
  descripcion,
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
        // evidenciaUrl eliminada: ya no se usan evidencias (cronómetro)
        estado: 'aprobado',
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
    // Verificar que el registro no esté activo
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
    // Verificar que el registro existe, pertenece al usuario y no está activo
    const registroExistente = await prisma.registroAsistencia.findFirst({
      where: { id: Number(id), profileId },
      select: { sesionActiva: true },
    });
    if (!registroExistente) {
      return { data: null, error: { message: 'Registro no encontrado o no autorizado', status: 404 } };
    }
    if (registroExistente.sesionActiva) {
      return { data: null, error: { message: 'No se puede corregir un registro en curso', status: 409 } };
    }

    const horas = calcularHoras(horaInicio, horaFin);

    const registro = await prisma.registroAsistencia.update({
      where: {
        id: Number(id),
        profileId, // ✅ asegura que solo el dueño pueda corregir
      },
      data: {
        fecha: new Date(fecha),
        horaInicio,
        horaFin,
        horas,
        descripcion,
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