// Validaciones puramente de entrada, reutilizadas por los endpoints. Responder
// 400 antes de tocar la BD evita que un valor malformado (fecha u hora inválida,
// id no numérico) reviente como 500 en Prisma.

// ¿Es un id entero positivo (p.ej. "12" o 5)?
export function esEnteroPositivo(valor) {
  if (valor === null || valor === undefined) return false;
  const n = Number(valor);
  return Number.isInteger(n) && n > 0;
}

// ¿Es una fecha de calendario "YYYY-MM-DD" real (p.ej. "2026-08-05")?
export function esFechaValida(fecha) {
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const [y, m, d] = fecha.split('-').map(Number);
  const fechaNorm = new Date(Date.UTC(y, m - 1, d));
  return (
    fechaNorm.getUTCFullYear() === y &&
    fechaNorm.getUTCMonth() === m - 1 &&
    fechaNorm.getUTCDate() === d
  );
}

// ¿Es una hora "H:MM" o "HH:MM" válida en formato 24h (p.ej. "8:30" u "08:30")?
export function esHoraValida(hora) {
  if (typeof hora !== 'string') return false;
  const match = /^(\d{1,2}):(\d{2})$/.exec(hora);
  if (!match) return false;
  const h = Number(match[1]);
  const m = Number(match[2]);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

// ¿La URL de una evidencia vive en la carpeta del usuario `userId` del bucket
// privado? El bucket es `evidencias/<userId>/<archivo>`, así que toda ruta
// ajena a `userId` pertenece a otro usuario (IDOR). El cliente construye esa
// ruta con su propio id, pero el servidor NO debe fiarse: se revalida aquí.
export function esEvidenciaPropia(evidenciaUrl, userId) {
  return typeof evidenciaUrl === 'string' && evidenciaUrl.startsWith(`${userId}/`);
}