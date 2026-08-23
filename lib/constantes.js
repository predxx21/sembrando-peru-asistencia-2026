// Lista de áreas disponibles (fallback si no se puede cargar desde BD)
// Las áreas ahora viven en la tabla `areas` de la BD. Este array es solo
// para compatibilidad con el seed inicial y tests.
export const AREAS = [
  'DDO',
  'Gestión de Proyectos',
  'Marketing',
  'Fundraising',
  'TI',
  'Sensibilización',
];

// Umbrales para alertas de anomalías
export const UMBRALES = {
  JORNADA_MINIMA_MINUTOS: 15,  // < 15 min = alerta
  JORNADA_MAXIMA_HORAS: 8,     // > 8 hrs = alerta
};