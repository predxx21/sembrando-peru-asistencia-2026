// Caché en memoria con TTL (time-to-live).
//
// Los datos que cacheamos (estadísticas, reportes, listados de registros)
// cambian poco: solo cuando un voluntario registra horas o un coordinador
// aprueba/rechaza. Un TTL corto + invalidación explícita en esas escrituras
// hace que AL RECARGAR la página los endpoints respondan en milisegundos,
// sin pisar la BD en cada request.
//
// Vive en `globalThis` para sobrevivir al hot-reload de Next.js en desarrollo
// (igual que el singleton de Prisma en lib/db/client.js). En memoria: no hay
// coordinación entre instancias serverless, pero no hay riesgo de datos
// incorrectos, solo de que una instancia fría vuelva a consultar la BD.
//
// Límite de tamaño para prevenir memory leak en serverless (p.ej. 500 entradas).
const MAX_CACHE_ENTRIES = 500;

const globalForCache = globalThis;

const CACHE = globalForCache.cacheTtl || new Map();
globalForCache.cacheTtl = CACHE;

export function getCached(key) {
  const entry = CACHE.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expira) {
    CACHE.delete(key);
    return null;
  }
  return entry.value;
}

export function setCached(key, value, ttlMs) {
  // Evict oldest entry if cache is full (simple LRU approximation)
  if (CACHE.size >= MAX_CACHE_ENTRIES) {
    const firstKey = CACHE.keys().next().value;
    if (firstKey !== undefined) {
      CACHE.delete(firstKey);
    }
  }
  CACHE.set(key, { value, expira: Date.now() + ttlMs });
}

// Elimina UNA clave puntual (p.ej. el perfil que acaba de editarse) sin
// vaciar el resto de la caché.
export function removeCached(key) {
  CACHE.delete(key);
}

// Vacía toda la caché. Se llama tras cualquier escritura que la invalida
// (nuevo registro, aprobar/rechazar, corrección) para que la siguiente
// lectura refleje el cambio al instante.
export function invalidateCache() {
  CACHE.clear();
}