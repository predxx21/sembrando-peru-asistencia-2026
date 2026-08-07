// Helpers puros de fechas, compartidos entre el servidor (lib/db) y el
// cliente (componentes). Al ser funciones puras se pueden testear fácilmente
// con Vitest (ver fecha.test.js).

export const MESES_CORTOS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

// Devuelve la etiqueta corta del mes (0-11) de una fecha Date.
export function getEtiquetaMes(fecha) {
  return MESES_CORTOS[fecha.getMonth()];
}

// Formatea una fecha (Date o string ISO) en formato es-PE corto, p.ej. "5 Ago 2026".
export function formatFechaEs(fecha) {
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]} ${d.getFullYear()}`;
}
