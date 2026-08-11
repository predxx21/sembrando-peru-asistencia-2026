// Helpers puros de fechas, compartidos entre el servidor (lib/db) y el
// cliente (componentes). Al ser funciones puras se pueden testear fácilmente
// con Vitest (ver fecha.test.js).

export const MESES_CORTOS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

// Etiquetas de los 7 días de la semana en orden LUNES → DOMINGO (índice 0-6).
export const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// Devuelve la etiqueta corta del mes (0-11) de una fecha Date.
export function getEtiquetaMes(fecha) {
  return MESES_CORTOS[fecha.getMonth()];
}

// Formatea una fecha (Date o string ISO) en formato es-PE corto, p.ej. "4 Ago".
//
// Igual que formatFechaEs lee el día/mes directamente del string para no
// depender de la zona horaria del servidor (Las fechas de registro viajan en
// UTC como "YYYY-MM-DD…"). Se usa para etiquetas compactas, p.ej. el rango de
// la semana en el gráfico de reportes.
export function formatFechaCorta(fecha) {
  const match =
    typeof fecha === 'string' && /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha);
  if (match) {
    const [, , m, d] = match;
    return `${Number(d)} ${MESES_CORTOS[Number(m) - 1]}`;
  }

  const d = fecha instanceof Date ? fecha : new Date(fecha);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]}`;
}

// Formatea una fecha (Date o string ISO) en formato es-PE corto, p.ej. "5 Ago 2026".
//
// Las fechas de registro son valores de calendario (sin hora) que viajan como
// string ISO en UTC (p.ej. "2026-08-05T00:00:00.000Z"). Si se formatean con los
// métodos locales (getDate/getMonth), una zona negativa como la de Perú (UTC-5)
// las muestra del día anterior. Por eso aquí se lee el día/mes/año directamente
// del string, sin conversión de zona horaria.
export function formatFechaEs(fecha) {
  const match =
    typeof fecha === 'string' && /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha);
  if (match) {
    const [, y, m, d] = match;
    return `${Number(d)} ${MESES_CORTOS[Number(m) - 1]} ${y}`;
  }

  const d = fecha instanceof Date ? fecha : new Date(fecha);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]} ${d.getFullYear()}`;
}
