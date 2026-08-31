import { describe, it, expect } from 'vitest';
import { buildCsv } from './exportar';

const COLUMNAS = [
  { key: 'nombre', label: 'Voluntario' },
  { key: 'horas', label: 'Total de Horas' },
];

describe('buildCsv', () => {
  it('genera cabecera y filas separadas por coma', () => {
    const csv = buildCsv(
      [
        { nombre: 'Ana', horas: 5 },
        { nombre: 'Luis', horas: 3 },
      ],
      COLUMNAS
    );

    expect(csv).toContain('Voluntario,Total de Horas');
    expect(csv).toContain('Ana,5');
    expect(csv).toContain('Luis,3');
  });

  it('escapa campos que contienen comas', () => {
    const csv = buildCsv([{ nombre: 'García, José', horas: 2 }], COLUMNAS);
    expect(csv).toContain('"García, José",2');
  });

  it('escapa comillas dobles duplicándolas', () => {
    const csv = buildCsv([{ nombre: 'Juan "El Grande"', horas: 1 }], COLUMNAS);
    expect(csv).toContain('"Juan ""El Grande""",1');
  });

  it('con filas vacías solo devuelve la cabecera', () => {
    const csv = buildCsv([], COLUMNAS);
    expect(csv).toContain('Voluntario,Total de Horas');
    expect(csv.trim().split('\r\n')).toHaveLength(1);
  });

  // ✅ Nueva prueba para CSV injection
  it('sanitiza valores que empiezan con =, +, -, @', () => {
    const csv = buildCsv([
      { nombre: '=SUM(A1:A10)', horas: 5 },
      { nombre: '+cmd', horas: 3 },
      { nombre: '-malicioso', horas: 2 },
      { nombre: '@comando', horas: 1 },
    ], COLUMNAS);

    expect(csv).toContain("'=SUM(A1:A10),5");
    expect(csv).toContain("'+cmd,3");
    expect(csv).toContain("'-malicioso,2");
    expect(csv).toContain("'@comando,1");
  });
});