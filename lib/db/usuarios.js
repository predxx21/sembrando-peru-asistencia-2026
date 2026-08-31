import { Prisma } from '@prisma/client';
import { prisma } from './client';

export async function listarUsuarios({ page = 1, limit = 20, busqueda, areaId } = {}) {
  const skip = Math.max(0, (page - 1) * limit);

  const filtro = busqueda
    ? `%${busqueda.replace(/[%_]/g, '\\$&')}%`
    : null;

  // Construir condiciones dinámicas con Prisma.sql
  const condiciones = [];

  if (areaId) {
    condiciones.push(Prisma.sql`p."areaId" = ${areaId}`);
  }

  if (filtro) {
    condiciones.push(Prisma.sql`(p.nombre ILIKE ${filtro} OR p.apellido ILIKE ${filtro})`);
  }

  // Si no hay condiciones, WHERE 1=1
  let whereClause = Prisma.sql`WHERE 1=1`;
  if (condiciones.length > 0) {
    whereClause = Prisma.sql`WHERE ${Prisma.join(condiciones, ' AND ')}`;
  }

  try {
    const filas = await prisma.$queryRaw`
      SELECT
        p.id,
        p.nombre,
        p.apellido,
        p.rol,
        u.email
      FROM "profiles" p
      LEFT JOIN auth.users u ON u.id = p.id::uuid
      ${whereClause}
      ORDER BY p.nombre ASC
      LIMIT ${limit} OFFSET ${skip};
    `;

    const totalFilas = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS total
      FROM "profiles" p
      ${whereClause}
    `;

    const usuarios = filas.map((f) => ({
      id: f.id,
      nombre: f.nombre,
      apellido: f.apellido,
      email: f.email || '',
      rol: f.rol,
    }));

    return { usuarios, total: Number(totalFilas[0]?.total) || 0, error: null };
  } catch (error) {
    console.error('Error en listarUsuarios:', error);
    return { usuarios: [], total: 0, error };
  }
}