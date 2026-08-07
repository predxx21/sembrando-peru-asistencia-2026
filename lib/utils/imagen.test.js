import { describe, it, expect } from 'vitest';
import { esImagen, superaBytes, dimensionesEscaladas } from './imagen';

describe('esImagen', () => {
  it('reconoce JPG, PNG y WebP', () => {
    expect(esImagen({ type: 'image/jpeg' })).toBe(true);
    expect(esImagen({ type: 'image/png' })).toBe(true);
    expect(esImagen({ type: 'image/webp' })).toBe(true);
  });

  it('no reconoce PDF u otros tipos', () => {
    expect(esImagen({ type: 'application/pdf' })).toBe(false);
    expect(esImagen({ type: 'text/plain' })).toBe(false);
    expect(esImagen(null)).toBe(false);
    expect(esImagen({})).toBe(false);
  });
});

describe('superaBytes', () => {
  it('devuelve true si el archivo pasa del tope', () => {
    expect(superaBytes(6 * 1024 * 1024, 5 * 1024 * 1024)).toBe(true);
  });

  it('devuelve false si está en el límite o por debajo', () => {
    expect(superaBytes(5 * 1024 * 1024, 5 * 1024 * 1024)).toBe(false);
    expect(superaBytes(1024, 5 * 1024 * 1024)).toBe(false);
  });
});

describe('dimensionesEscaladas', () => {
  it('escala manteniendo la proporción cuando el lado mayor excede el máximo', () => {
    const r = dimensionesEscaladas(4000, 2000, 1600);
    expect(r.ancho).toBe(1600);
    expect(r.alto).toBe(800);
  });

  it('devuelve null si la imagen ya cabe', () => {
    expect(dimensionesEscaladas(1200, 900, 1600)).toBe(null);
  });

  it('devuelve null si exactamente en el límite', () => {
    expect(dimensionesEscaladas(1600, 1600, 1600)).toBe(null);
  });

  it('devuelve null con argumentos inválidos', () => {
    expect(dimensionesEscaladas(0, 10, 1600)).toBe(null);
    expect(dimensionesEscaladas(-5, 10, 1600)).toBe(null);
    expect(dimensionesEscaladas(null, 10, 1600)).toBe(null);
    expect(dimensionesEscaladas(undefined, undefined, 1600)).toBe(null);
  });

  it('nunca devuelve dimensión 0 al re-escalar', () => {
    const r = dimensionesEscaladas(3200, 1, 1600);
    expect(r.ancho).toBe(1600);
    expect(r.alto).toBe(1);
  });
});
