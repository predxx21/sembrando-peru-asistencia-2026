// Utilidades de exportación con exceljs
import ExcelJS from 'exceljs';

// Escapa un campo CSV
function escaparCsv(valor) {
  const texto = String(valor ?? '');
  if (/[",\n\r]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

// Construye el contenido CSV a partir de filas (objetos) y columnas
export function buildCsv(filas, columnas) {
  const cabecera = columnas.map((c) => escaparCsv(c.label)).join(',');
  const lineas = filas.map((fila) =>
    columnas.map((c) => escaparCsv(fila[c.key])).join(',')
  );
  return '﻿' + [cabecera, ...lineas].join('\r\n');
}

// Construye un archivo Excel con formato (bordes, celdas combinadas, colores)
export async function buildExcelXLSX(filas, columnas, sheetName = 'Reporte') {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  // Definir estilos
  const headerStyle = {
    font: { bold: true, color: { argb: 'FFFFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    }
  };

  const titleStyle = {
    font: { bold: true, size: 12 },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    }
  };

  const subtotalStyle = {
    font: { bold: true, italic: true },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4F8' } },
    alignment: { vertical: 'middle' },
    border: {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    }
  };

  const normalStyle = {
    alignment: { vertical: 'middle' },
    border: {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    }
  };

  const zeroStyle = {
    font: { color: { argb: 'FFFF0000' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    }
  };

  // Definir columnas (8 columnas: A a H) — SIN header
  worksheet.columns = [
    { key: 'Voluntario', width: 25 },
    { key: 'Area', width: 15 },
    { key: 'FechaRegistro', width: 18 },
    { key: 'FechaAprobacion', width: 18 },
    { key: 'Dia', width: 10 },
    { key: 'HoraInicio', width: 15 },
    { key: 'HoraFin', width: 15 },
    { key: 'Horas', width: 18 }
  ];

  let currentRow = 1;

  for (const fila of filas) {
    const row = worksheet.addRow([
      fila.Voluntario || '',
      fila.Area || '',
      fila.FechaRegistro || '',
      fila.FechaAprobacion || '',
      fila.Dia || '',
      fila.HoraInicio || '',
      fila.HoraFin || '',
      fila.Horas || ''
    ]);

    if (fila.esTitulo) {
      // Título de semana: combinar A-H, centrar
      worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
      const cell = row.getCell(1);
      cell.value = fila.Horas; // El título está en Horas
      cell.style = titleStyle;
      row.height = 28;
    } else if (fila.esHeader) {
      // Encabezado de columnas
      row.eachCell((cell) => {
        cell.style = headerStyle;
      });
      row.height = 22;
    } else if (fila.esSubtotal) {
      // Subtotal por voluntario: nombre en A, total en H, sin combinar
      row.eachCell((cell) => {
        cell.style = subtotalStyle;
      });
      // Alinear nombre a la izquierda, total a la derecha
      row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
      row.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
      row.height = 24;
    } else {
      // Fila normal de datos
      const horas = parseFloat(fila.Horas);
      const isZero = horas === 0 && fila.Horas !== '';
      row.eachCell((cell) => {
        if (isZero && cell.col === 8) {
          cell.style = zeroStyle;
          cell.value = '0.00 ⚠️';
        } else {
          cell.style = normalStyle;
        }
      });
      row.height = 20;
    }

    currentRow++;
  }

  // El buffer se genera
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

// Dispara la descarga en el navegador.
export function descargar(nombre, contenido, tipoMime) {
  if (typeof window === 'undefined') return false;
  const blob = new Blob([contenido], { type: tipoMime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nombre;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return true;
}

// Descarga un archivo Excel a partir de un buffer
export function descargarExcel(nombre, buffer) {
  if (typeof window === 'undefined') return false;
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nombre;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return true;
}