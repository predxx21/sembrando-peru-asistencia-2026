// Utilidades de exportación. Funciones puras (CSV y SpreadsheetML/Excel-compatible)
// y descargas de navegador. Sin dependencias externas: el Excel .xlsx de auditoría
// se genera en el servidor (`lib/utils/excelServer.js`), no aquí.

// Escapa un campo CSV y protege contra CSV injection.
// Se exporta para reutilizarlo en el servidor (excelServer) sin duplicar lógica.
export function escaparCsv(valor) {
  const texto = String(valor ?? '');
  // Si el valor comienza con =, +, -, @, anteponemos un apóstrofe para evitar fórmulas
  const sanitizado = /^[=+\-@]/.test(texto) ? `'${texto}` : texto;
  if (/[",\n\r]/.test(sanitizado)) {
    return `"${sanitizado.replace(/"/g, '""')}"`;
  }
  return sanitizado;
}

// Construye el contenido CSV a partir de filas (objetos) y columnas
export function buildCsv(filas, columnas) {
  const cabecera = columnas.map((c) => escaparCsv(c.label)).join(',');
  const lineas = filas.map((fila) =>
    columnas.map((c) => escaparCsv(fila[c.key])).join(',')
  );
  return '﻿' + [cabecera, ...lineas].join('\r\n');
}

// Escapa texto para XML (usado por buildExcelHtml).
function escaparXml(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Construye un documento SpreadsheetML que Excel abre como .xls (sin dependencias).
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

// Descarga un archivo Excel a partir de un buffer (ArrayBuffer del fetch).
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