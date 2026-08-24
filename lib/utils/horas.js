// Cálculo de horas a partir de horaInicio/horaFin ("HH:MM").
//
// Función pura (sin dependencias de servidor/BD) para compartir entre el
// cliente (formularios de horas y corrección) y el servidor (lib/db/registro.js).
// Así el cálculo es idéntico en ambos lados y no se repite lógica.
//
// Soporta cruce de medianoche: si horaFin < horaInicio (ej. 22:00 → 06:00),
// se asume que la jornada terminó al día siguiente (+24h).
// Si horaFin === horaInicio (mismo tiempo), devuelve 0 (duración 0).
export function calcularHoras(horaInicio, horaFin) {
  if (!horaInicio || !horaFin) return 0;

  const [startH, startM] = horaInicio.split(':').map(Number);
  const [endH, endM] = horaFin.split(':').map(Number);

  // Validar rangos de hora/minuto
  if (!Number.isFinite(startH) || !Number.isFinite(startM) ||
      !Number.isFinite(endH) || !Number.isFinite(endM)) return 0;
  if (startH < 0 || startH > 23 || startM < 0 || startM > 59) return 0;
  if (endH < 0 || endH > 23 || endM < 0 || endM > 59) return 0;

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  let diff = endMinutes - startMinutes;
  // Cruce de medianoche: la jornada terminó al día siguiente (solo si fin < inicio).
  // Si fin === inicio, diff = 0 → duración 0 (mismo día, misma hora).
  if (diff < 0) {
    diff += 24 * 60;
  }

  return Math.round((diff / 60) * 10) / 10;
}