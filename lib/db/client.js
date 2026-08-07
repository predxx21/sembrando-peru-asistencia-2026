import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

// Conexión a la BD.
//
// Supabase expone dos poolers (mismo host `pooler.supabase.com`, puerto
// distinto). Usamos el puerto 6543 (modo transacción) con `pgbouncer=true`:
// ese flag desactiva los prepared statements con nombre (s0, s1…) que en este
// pooler chocan entre sesiones con el error 42P05 ("already exists"), porque
// todas las sesiones comparten los mismos nombres y la piscina no resetea las
// conexiones servidor entre transacciones. Sin el flag, el choque es
// permanente y el reintento no lo alcanza: la piscina devuelve siempre la
// misma conexión sucia.
//
// `connection_limit=5` (no 1) porque la app lanza queries en paralelo
// (Promise.all del dashboard y de los listados). Con un solo slot todo se
// serializa en UNA conexión y el que queda en cola agota el timeout del pool
// (P2024 "Timed out fetching a new connection"). Con 5 slots, hasta 5 queries
// comparten pgbouncer (que multiplexa hacia la BD) sin choques.
const baseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
const SEP = baseUrl.includes('?') ? '&' : '?';
const runtimeUrl = `${baseUrl}${SEP}pgbouncer=true&connection_limit=5`;

// El cliente vive sobre el singleton en `globalThis`, que persiste entre los
// hot-reloads de desarrollo para no duplicar instancias ni agotar el pool.
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ datasources: { db: { url: runtimeUrl } } });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
