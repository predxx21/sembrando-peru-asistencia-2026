// Umbrales para alertas de anomalías
export const UMBRALES = {
  JORNADA_MINIMA_MINUTOS: 15,  // < 15 min = alerta
  JORNADA_MAXIMA_HORAS: 8,     // > 8 hrs = alerta
};

// NOTA: Las áreas ahora viven en la tabla `areas` de la BD y se cargan
// dinámicamente vía /api/areas. El array AREAS legacy se eliminó.