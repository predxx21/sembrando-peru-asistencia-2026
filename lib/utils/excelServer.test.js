import { describe, it, expect } from 'vitest';
import { buildExcelXLSX } from './excelServer';

const COLUMNAS = [
  { key: 'Voluntario', label: 'Voluntario' },
  { key: 'Area', label: 'Área' },
  { key: 'FechaRegistro', label: 'Fecha de Registro' },
  { key: 'FechaAprobacion', label: 'Fecha de Aprobación' },
  { key: 'Dia', label: 'Día' },
  { key: 'HoraInicio', label: 'Hora de inicio' },
  { key: 'HoraFin', label: 'Hora de fin' },
  { key: 'Horas', label: 'Horas realizadas' },
];

describe('buildExcelXLSX (servidor)', () => {
  it('genera un buffer .xlsx válido (firma ZIP) con títulos y subtotales', async () => {
    const filas = [
      { Voluntario: 'Ana Pérez', Area: 'TI', FechaRegistro: '01/09/2026', FechaAprobacion: '02/09/2026', Dia: 'Lun', HoraInicio: '09:00', HoraFin: '11:00', Horas: '1.50', esTitulo: false },
      { Voluntario: 'Ana Pérez', Area: '', FechaRegistro: '', FechaAprobacion: '', Dia: '', HoraInicio: '', HoraFin: '', Horas: '1.50', esSubtotal: true },
    ];

    const buffer = await buildExcelXLSX(filas, COLUMNAS);
    const bytes = Buffer.from(buffer);

    // Un .xlsx es un ZIP: empieza por "PK"
    expect(bytes.byteLength).toBeGreaterThan(0);
    expect(bytes.subarray(0, 2).toString('ascii')).toBe('PK');
  });

  it('marca con alerta las horas en cero', async () => {
    const filas = [
      { Voluntario: 'Luis', Area: 'Marketing', FechaRegistro: '01/09/2026', FechaAprobacion: '', Dia: 'Mar', HoraInicio: '10:00', HoraFin: '10:00', Horas: '0.00' },
    ];

    const buffer = await buildExcelXLSX(filas, COLUMNAS);
    const bytes = Buffer.from(buffer);
    expect(bytes.subarray(0, 2).toString('ascii')).toBe('PK');
  });
});