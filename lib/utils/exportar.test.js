import { describe, it, expect } from 'vitest';
import { buildCsv, buildExcelHtml } from './exportar';

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
});

describe('buildExcelHtml', () => {
  it('incluye declaración XML, cabecera y filas como <Row>', () => {
    const html = buildExcelHtml([{ nombre: 'Ana', horas: 5 }], COLUMNAS);

    expect(html).toContain('<?xml version="1.0"?>');
    expect(html).toContain('<Row>');
    expect(html).toContain('Voluntario');
    expect(html).toContain('Ana');
    expect(html).toContain('5');
  });

  it('escapa caracteres especiales de XML', () => {
    const html = buildExcelHtml([{ nombre: 'A & B <C>', horas: 1 }], COLUMNAS);

    expect(html).toContain('A &amp; B &lt;C&gt;');
    expect(html).not.toContain('A & B <C>');
  });
});
