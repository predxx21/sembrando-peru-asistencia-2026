import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

// Conexión a la BD.
//
// Supabase expone dos poolers (mismo host `pooler.supabase.com`, puerto
// distinto):
//   - 5432 (modo sesión): ~820ms por query en nuestra red (Perú → ca-central-1).
//   - 6543 (modo transacción): ~165ms por query, ~5x más rápida.
//
// Medido contra este proyecto (Perú → ca-central-1):
//   - 5432 (sesión): ~820ms por query y pool fácilmente agotable.
//   - 6543 (transacción) + `connection_limit=1` SIN `pgbouncer=true`: ~166ms por
//     query, pero los prepared statements con nombre chocan entre sesiones en
//     este pooler (ver abajo), así que no es fiable.
//   - 6543 + `pgbouncer=true` + `connection_limit=5`: ~825ms por query, sin
//     choques (la que usamos).
//
// Por defecto usamos `pgbouncer=true`, porque ESTE pooler de transacción no
// resetea las conexiones servidor entre transacciones: un prepared statement
// con nombre (s0, s1…) dejado por OTRA sesión se acumula y choca con el PREPARE
// de esta ("already exists", 42P05). Como todas las sesiones comparten los
// mismos nombres, el choque es PERMANENTE y el reintento no lo alcanza (la
// piscina devuelve siempre la misma conexión sucia). `pgbouncer=true` desactiva
// esos prepared statements → sin choque. Coste: ~825ms por query (en vez de
// ~166ms), que se amortiguan con las queries consolidadas en SQL
// (lib/db/reportes.js, lib/db/estadisticas.js) y la caché TTL en memoria
// (lib/cache.js). En serverless (Vercel/Edge) esta config es también la
// canónica de Supabase.
//
// El pool va con `connection_limit=5` (no 1) porque la app lanza queries en
// paralelo: Promise.all dentro del dashboard y de los listados, más los
// fetches simultáneos de una misma pantalla (/auth/me + /estadisticas +
// /registros). Con un solo slot todo se serializa en UNA conexión y el que
// queda en cola agota el timeout del pool (P2024 "Timed out fetching a new
// connection", connection_limit: 1). Con 5 slots, hasta 5 queries comparten
// pgbouncer (que multiplexa hacia la BD) sin choques de prepared statements.
//
// La config rápida (prepared statements con nombre, ~166ms/query) queda como
// opt-in experimental con USE_FAST_POOL=1; solo es estable si la piscina está
// limpia (Supabase las recicla de vez en cuando), y con uso normal reaparece el
// choque descrito arriba. Para serverless no se debería activar.
const baseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
const SEP = baseUrl.includes('?') ? '&' : '?';

const runtimeUrl =
  process.env.USE_FAST_POOL === '1'
    ? `${baseUrl}${SEP}connection_limit=1`
    : `${baseUrl}${SEP}pgbouncer=true&connection_limit=5`;

// Reintento de seguridad ante el choque de prepared statements con nombre del
// pooler (42P05 / 26000). Con el default (`pgbouncer=true`) no deberían ocurrir,
// pero protegen la config rápida opt-in (USE_FAST_POOL=1). Al reintentar es
// seguro: ambos códigos fallan ANTES de ejecutar la sentencia (no modifica
// filas), así que no hay riesgo de duplicar un write o un upsert.
const CODIGOS_TRANSIENTES = new Set(['42P05', '26000']);

async function reintentar(fn) {
  try {
    return await fn();
  } catch (error) {
    if (!CODIGOS_TRANSIENTES.has(error?.meta?.code)) throw error;
    return await fn();
  }
}

// El cliente se exporta YA envuelto en una Prisma Client Extension, de modo que
// CUALQUIER operación de modelo (find/upsert/aggregate/…) y de crudo
// ($queryRaw/$executeRaw) pasa por el reintento sin tocar cada llamada. La
// extensión vive sobre el singleton en `globalThis`, que persiste entre los
// hot-reloads de desarrollo para no duplicar wrappers.
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ datasources: { db: { url: runtimeUrl } } }).$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          return reintentar(() => query(args));
        },
      },
      $queryRaw: async ({ args, query }) => reintentar(() => query(args)),
      $executeRaw: async ({ args, query }) => reintentar(() => query(args)),
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;