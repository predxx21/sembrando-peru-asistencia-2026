// Lista de áreas disponibles (centralizado para fácil mantenimiento)
export const AREAS = [
  'Logística',
  'Educación',
  'Salud',
  'Comunicación',
  'Administración',
  'Marketing',
  'Infraestructura',
];

// Umbrales para alertas de anomalías
export const UMBRALES = {
  JORNADA_MINIMA_MINUTOS: 15,  // < 15 min = alerta
  JORNADA_MAXIMA_HORAS: 8,     // > 8 hrs = alerta
};