import { describe, it, expect } from 'vitest';
import { esEnteroPositivo, esFechaValida, esHoraValida, esEvidenciaPropia } from './validar';

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

describe('esEvidenciaPropia', () => {
  it('acepta una ruta en la carpeta del usuario', () => {
    expect(esEvidenciaPropia('u-123/foto.jpg', 'u-123')).toBe(true);
    expect(esEvidenciaPropia('u-123/2026-08-05_planilla.png', 'u-123')).toBe(true);
  });

  it('rechaza rutas de otros usuarios o sin carpeta', () => {
    expect(esEvidenciaPropia('u-999/foto.jpg', 'u-123')).toBe(false);
    expect(esEvidenciaPropia('foto.jpg', 'u-123')).toBe(false);
    expect(esEvidenciaPropia('/foto.jpg', 'u-123')).toBe(false);
    expect(esEvidenciaPropia('u-1234/foto.jpg', 'u-123')).toBe(false); // prefijo, no carpeta
  });

  it('rechaza valores no string', () => {
    expect(esEvidenciaPropia(null, 'u-123')).toBe(false);
    expect(esEvidenciaPropia(undefined, 'u-123')).toBe(false);
    expect(esEvidenciaPropia(42, 'u-123')).toBe(false);
  });
});