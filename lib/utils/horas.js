// Cálculo de horas a partir de horaInicio/horaFin ("HH:MM").
//
// Función pura (sin dependencias de servidor/BD) para compartir entre el
// cliente (formularios de horas y corrección) y el servidor (lib/db/registro.js).
// Así el cálculo es idéntico en ambos lados y no se repite lógica.
export function calcularHoras(horaInicio, horaFin) {
  if (!horaInicio || !horaFin) return 0;

  const [startH, startM] = horaInicio.split(':').map(Number);
  const [endH, endM] = horaFin.split(':').map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  const diff = endMinutes - startMinutes;
  if (diff <= 0) return 0;

  return Math.round((diff / 60) * 10) / 10;
}