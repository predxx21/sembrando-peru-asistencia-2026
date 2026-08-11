import { describe, it, expect } from 'vitest';
import { getEtiquetaMes, formatFechaEs, formatFechaCorta } from './fecha';

describe('getEtiquetaMes', () => {
  it('devuelve la etiqueta corta en español', () => {
    expect(getEtiquetaMes(new Date(2026, 0, 15))).toBe('Ene');
    expect(getEtiquetaMes(new Date(2026, 7, 1))).toBe('Ago');
    expect(getEtiquetaMes(new Date(2026, 11, 31))).toBe('Dic');
  });
});

describe('formatFechaEs', () => {
  it('formatea una fecha ISO a día mes año', () => {
    // Se construye con la fecha local para que el test no dependa de la zona
    // horaria de la máquina donde corra.
    const iso = new Date(2026, 7, 5, 12, 0, 0).toISOString();
    expect(formatFechaEs(iso)).toBe('5 Ago 2026');
  });

  it('acepta un objeto Date', () => {
    expect(formatFechaEs(new Date(2026, 0, 5))).toBe('5 Ene 2026');
  });
});

describe('formatFechaCorta', () => {
  it('formatea una fecha ISO a día mes (sin año)', () => {
    expect(formatFechaCorta('2026-08-04')).toBe('4 Ago');
    expect(formatFechaCorta('2026-01-05')).toBe('5 Ene');
  });

  it('acepta un objeto Date', () => {
    expect(formatFechaCorta(new Date(2026, 7, 4))).toBe('4 Ago');
  });
});
