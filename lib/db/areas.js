import { prisma } from './client';

// Capa de datos para la tabla `areas`.
//
// Las áreas ahora son una entidad propia (no un string hardcodeado) para
// poder agregar nuevas áreas sin tocar el código: basta con INSERT en la
// tabla `areas` desde el panel de admin o SQL. El frontend las carga
// dinámicamente en lugar de usar el array constante de lib/constantes.js.
//
// Cada área tiene: id (uuid), nombre (único), descripcion, activa (bool),
// orden (int para ordenar en el select).

// Lista todas las áreas activas ordenadas por `orden` ascendente.
// Usado por los selects de "Área de Voluntariado" en el perfil.
export async function obtenerAreasActivas() {
  try {
    const areas = await prisma.area.findMany({
      where: { activa: true },
      orderBy: { orden: 'asc' },
      select: { id: true, nombre: true, descripcion: true },
    });
    return { data: areas, error: null };
  } catch (error) {
    console.error('Error en obtenerAreasActivas:', error);
    return { data: null, error };
  }
}
