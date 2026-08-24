import { describe, it, expect } from 'vitest';
import {
  esEnteroPositivo,
  esFechaValida,
  esHoraValida,
  esHoraFinMayorAInicio,
  esUUIDValido,
} from './validar';

describe('esEnteroPositivo', () => {
  it('acepta enteros positivos (string o número)', () => {
    expect(esEnteroPositivo('12')).toBe(true);
    expect(esEnteroPositivo(5)).toBe(true);
  });

  it('rechaza cero, negativos, textos y vacíos', () => {
    expect(esEnteroPositivo('0')).toBe(false);
    expect(esEnteroPositivo('-3')).toBe(false);
    expect(esEnteroPositivo('abc')).toBe(false);
    expect(esEnteroPositivo('')).toBe(false);
    expect(esEnteroPositivo(null)).toBe(false);
    expect(esEnteroPositivo(undefined)).toBe(false);
  });
});

describe('esFechaValida', () => {
  it('acepta fechas reales "YYYY-MM-DD"', () => {
    expect(esFechaValida('2026-08-05')).toBe(true);
    expect(esFechaValida('2024-02-29')).toBe(true); // 2024 es bisiesto
    expect(esFechaValida('2026-02-29')).toBe(false); // 2026 no es bisiesto
  });

  it('rechaza formatos inválidos', () => {
    expect(esFechaValida('05-08-2026')).toBe(false);
    expect(esFechaValida('2026-13-01')).toBe(false);
    expect(esFechaValida('2026-08-32')).toBe(false);
    expect(esFechaValida('basura')).toBe(false);
    expect(esFechaValida(undefined)).toBe(false);
  });
});

describe('esHoraValida', () => {
  it('acepta horas 24h con o sin cero inicial', () => {
    expect(esHoraValida('08:30')).toBe(true);
    expect(esHoraValida('8:30')).toBe(true);
    expect(esHoraValida('23:59')).toBe(true);
  });

  it('rechaza horas inválidas', () => {
    expect(esHoraValida('24:00')).toBe(false);
    expect(esHoraValida('12:60')).toBe(false);
    expect(esHoraValida('abc')).toBe(false);
    expect(esHoraValida('')).toBe(false);
    expect(esHoraValida(null)).toBe(false);
  });
});

describe('esHoraFinMayorAInicio', () => {
  it('acepta hora fin posterior a inicio (mismo día)', () => {
    expect(esHoraFinMayorAInicio('08:00', '17:00')).toBe(true);
    expect(esHoraFinMayorAInicio('22:00', '23:30')).toBe(true);
  });

  it('acepta cruce de medianoche', () => {
    expect(esHoraFinMayorAInicio('22:00', '06:00')).toBe(true);
    expect(esHoraFinMayorAInicio('23:30', '00:30')).toBe(true);
  });

  it('rechaza hora fin igual a la de inicio (mismo día)', () => {
    expect(esHoraFinMayorAInicio('17:00', '17:00')).toBe(false);
  });

  it('acepta cruce de medianoche explícito (fin anterior = día siguiente)', () => {
    // 17:00 → 08:00 = 15h (se asume día siguiente)
    expect(esHoraFinMayorAInicio('17:00', '08:00')).toBe(true);
  });

  it('rechaza horas inválidas', () => {
    expect(esHoraFinMayorAInicio('abc', '17:00')).toBe(false);
    expect(esHoraFinMayorAInicio('08:00', '25:00')).toBe(false);
    expect(esHoraFinMayorAInicio(null, '17:00')).toBe(false);
  });
});

describe('esUUIDValido', () => {
  it('acepta UUID v4 válido', () => {
    expect(esUUIDValido('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')).toBe(true);
  });

  it('rechaza UUID inválido', () => {
    expect(esUUIDValido('no-es-uuid')).toBe(false);
    expect(esUUIDValido('12345')).toBe(false);
    expect(esUUIDValido('')).toBe(false);
    expect(esUUIDValido(null)).toBe(false);
  });
});
