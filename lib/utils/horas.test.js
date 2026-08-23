import { describe, it, expect } from 'vitest';
import { calcularHoras } from './horas';

describe('calcularHoras', () => {
  it('calcula horas normales entre inicio y fin', () => {
    expect(calcularHoras('09:00', '12:00')).toBe(3);
  });

  it('redondea a 1 decimal', () => {
    expect(calcularHoras('09:00', '12:30')).toBe(3.5);
    expect(calcularHoras('08:15', '09:45')).toBe(1.5);
  });

  it('soporta cruce de medianoche (ej. 22:00 → 06:00 = 8h)', () => {
    expect(calcularHoras('22:00', '06:00')).toBe(8);
    expect(calcularHoras('23:30', '00:30')).toBe(1);
  });

  it('devuelve 0 si la hora de fin es igual a la de inicio (mismo día)', () => {
    expect(calcularHoras('09:00', '09:00')).toBe(0);
  });

  it('devuelve 0 si falta el inicio o el fin', () => {
    expect(calcularHoras(null, '12:00')).toBe(0);
    expect(calcularHoras('09:00', '')).toBe(0);
    expect(calcularHoras(undefined, undefined)).toBe(0);
  });

  it('devuelve 0 si formato inválido', () => {
    expect(calcularHoras('abc', '12:00')).toBe(0);
    expect(calcularHoras('09:00', '25:00')).toBe(0);
  });
});