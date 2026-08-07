// Utilidades de exportación. Las dos primeras son puras (CSV y
// SpreadsheetML/Excel-compatible) y se testean con Vitest; `descargar` es la
// única que toca el navegador. Sin dependencias nuevas.

// Escapa un campo CSV: envuelve entre comillas si contiene separadores.
function escaparCsv(valor) {
  const texto = String(valor ?? '');
  if (/[",\n\r]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

// Construye el contenido CSV a partir de filas (objetos) y columnas
// [{ key, label }]. Incluye BOM UTF-8 para que Excel muestre bien los acentos.
export function buildCsv(filas, columnas) {
  const cabecera = columnas.map((c) => escaparCsv(c.label)).join(',');
  const lineas = filas.map((fila) =>
    columnas.map((c) => escaparCsv(fila[c.key])).join(',')
  );
  // BOM UTF-8 para que Excel interprete correctamente los acentos.
  return '﻿' + [cabecera, ...lineas].join('\r\n');
}

function escaparXml(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Construye un documento SpreadsheetML que Excel abre como .xls/.xlsx.
export function buildExcelHtml(filas, columnas) {
  const filaXml = (celdas) =>
    `<Row>${celdas
      .map(
        (celda) =>
          `<Cell><Data ss:Type="String">${escaparXml(celda)}</Data></Cell>`
      )
      .join('')}</Row>`;

  const cabecera = filaXml(columnas.map((c) => c.label));
  const cuerpo = filas
    .map((fila) => filaXml(columnas.map((c) => fila[c.key])))
    .join('');

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Reporte">
  <Table>
${cabecera}
${cuerpo}
  </Table>
 </Worksheet>
</Workbook>`;
}

// Dispara la descarga en el navegador. Devuelve true si se pudo iniciar.
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
