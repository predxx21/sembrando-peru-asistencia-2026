import { describe, it, expect } from 'vitest';
import { mapReportes } from './reportesFormato';

// Payload simula la respuesta de /api/admin/reportes. La fecha de última
// actividad se construye desde hora local para que el test no dependa de la
// zona horaria de la máquina donde corra.
const PAYLOAD = {
  stats: {
    pendientes: 7,
    horasAprobadas: 9000,
    totalHoras: 12482,
    voluntariosActivos: 42,
  },
  porSemana: [
    { fecha: '2026-08-03', dia: 'Lun', value: 0 },
    { fecha: '2026-08-04', dia: 'Mar', value: 1200 },
  ],
  contribuyentes: [
    { profileId: 'u1', nombre: 'Ana', apellido: 'Pérez', horas: 248, porcentaje: 2 },
    { profileId: 'u2', nombre: 'Luis', apellido: 'Gómez', horas: 212, porcentaje: 2 },
  ],
  voluntarios: [
    {
      profileId: 'u1',
      nombre: 'Ana',
      apellido: 'Pérez',
      registros: 6,
      horas: 248.5,
      ultimaActividad: new Date(2026, 7, 5, 12, 0, 0).toISOString(),
    },
  ],
};

describe('mapReportes', () => {
  it('mapea stats y porSemana al contrato de la UI', () => {
    const res = mapReportes(PAYLOAD);

    expect(res.stats.totalHoras).toBe(12482);
    expect(res.stats.pendientes).toBe(7);
    expect(res.stats.horasAprobadas).toBe(9000);
    expect(res.porSemana[1]).toMatchObject({
      dia: 'Mar',
      fecha: '2026-08-04',
      value: 1200,
    });
  });

  it('construye iniciales, nombre completo y horas formateadas', () => {
    const res = mapReportes(PAYLOAD);

    expect(res.contribuyentes[0]).toMatchObject({
      id: 'u1',
      name: 'Ana Pérez',
      iniciales: 'AP',
      horas: '248h',
      context: '2% del total',
    });
  });

  it('formatea la última actividad y conserva la fecha ISO para filtrar', () => {
    const res = mapReportes(PAYLOAD);

    expect(res.voluntarios[0].ultimaActividad).toBe('5 Ago 2026');
    expect(res.voluntarios[0].ultimaActividadISO).toBe(
      PAYLOAD.voluntarios[0].ultimaActividad
    );
  });

  it('responde con valores por defecto ante un payload vacío', () => {
    const res = mapReportes(null);

    expect(res).toEqual({
      stats: {
        pendientes: 0,
        horasAprobadas: 0,
        totalHoras: 0,
        voluntariosActivos: 0,
      },
      porSemana: [],
      contribuyentes: [],
      voluntarios: [],
    });
  });
});
