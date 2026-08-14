import { prisma } from './client';

// Lista usuarios (perfil + email de auth) para la gestión de roles del admin.
// Como `Profile` NO tiene relación con `auth.users` en el schema de Prisma, se
// une vía $queryRaw (igual que en estadisticas.js). Paginado en el servidor.
//
// NOTA: el fragmento WHERE condicional se construye con prisma.sql (NO con
// prisma.$queryRaw anidado), porque $queryRaw dentro de otro $queryRaw rompe la
// interpolación de parámetros ("syntax error at or near $1"). prisma.sql sí es
// embebible dentro de un $queryRaw exterior.
export async function listarUsuarios({ page = 1, limit = 20, busqueda } = {}) {
  const skip = Math.max(0, (page - 1) * limit);

  // Prisma no soporta ILIKE dinámico con parámetros de forma segura para el
  // nombre/apellido; usamos un LIKE simple (el buscador es solo conveniencia).
  const filtro = busqueda
    ? `%${busqueda.replace(/[%_]/g, '\\$&')}%`
    : null;

  const condicion = filtro
    ? prisma.sql`WHERE p.nombre ILIKE ${filtro} OR p.apellido ILIKE ${filtro}`
    : prisma.sql``;

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
      ${condicion}
      ORDER BY p.nombre ASC
      LIMIT ${limit} OFFSET ${skip};
    `;

    const totalFilas = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS total
      FROM "profiles" p
      ${condicion}
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