"use client";

import { useMemo, useState } from "react";
import { buildCsv, buildExcelHtml, descargar } from "@/lib/utils/exportar";
import styles from "./ExportarReporte.module.css";

// Rango de fecha aplicado sobre la última actividad de cada voluntario.
const RANGOS = [
  { id: "mes", label: "Mes Actual" },
  { id: "3m", label: "Últimos 3 Meses" },
  { id: "6m", label: "Últimos 6 Meses" },
  { id: "anio", label: "Año Completo" },
];

// Columnas del archivo exportado (coinciden con la tabla del dashboard).
const COLUMNAS = [
  { key: "nombre", label: "Voluntario" },
  { key: "registros", label: "Nº de Registros" },
  { key: "horas", label: "Total de Horas" },
  { key: "ultimaActividad", label: "Última Actividad" },
];

// Fecha límite (inclusive) para cada rango, respecto a "ahora".
function limiteInferior(rango, ahora) {
  const limite = new Date(ahora);

  switch (rango) {
    case "mes":
      limite.setDate(1);
      limite.setHours(0, 0, 0, 0);
      return limite;
    case "3m":
      limite.setMonth(limite.getMonth() - 3);
      return limite;
    case "6m":
      limite.setMonth(limite.getMonth() - 6);
      return limite;
    default: // "anio"
      limite.setMonth(0, 1);
      limite.setHours(0, 0, 0, 0);
      return limite;
  }
}

export default function ExportReportModal({ isOpen, onClose, data }) {
  const [format, setFormat] = useState("excel");
  const [rango, setRango] = useState(RANGOS[0].id);
  const [mensaje, setMensaje] = useState("");

  const filas = data || [];

  // Filtra las filas (voluntarios) según el rango de fecha elegido.
  // Voluntarios sin última actividad (ultimaActividadISO === null) NO se incluyen
  // en ningún rango temporal — quedan fuera del reporte.
  const filasFiltradas = useMemo(() => {
    const limite = limiteInferior(rango, new Date());
    return filas.filter((fila) => {
      if (!fila.ultimaActividadISO) return false;
      return new Date(fila.ultimaActividadISO) >= limite;
    });
  }, [filas, rango]);

  if (!isOpen) return null;

  function handleGenerate(event) {
    event.preventDefault();
    setMensaje("");

    if (filasFiltradas.length === 0) {
      setMensaje("No hay voluntarios con actividad en el rango seleccionado.");
      return;
    }

    const esExcel = format === "excel";
    const contenido = esExcel
      ? buildExcelHtml(filasFiltradas, COLUMNAS)
      : buildCsv(filasFiltradas, COLUMNAS);
    const tipoMime = esExcel
      ? "application/vnd.ms-excel"
      : "text/csv;charset=utf-8";

    const hoy = new Date();
    const fecha =
      `${hoy.getFullYear()}-` +
      `${String(hoy.getMonth() + 1).padStart(2, "0")}-` +
      `${String(hoy.getDate()).padStart(2, "0")}`;
    const extension = esExcel ? "xls" : "csv";

    descargar(`reporte-voluntarios-${fecha}.${extension}`, contenido, tipoMime);
    setMensaje("✅ Reporte generado correctamente.");
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="exportReportTitle"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Cerrar"
        >
          ✕
        </button>

        <h2 id="exportReportTitle">Exportar Información Consolidada</h2>
        <p className={styles.subtitle}>
          Configure los parámetros para la generación de su archivo.
        </p>

        <form onSubmit={handleGenerate}>
          <div className={styles.section}>
            <label className={styles.sectionLabel}>📄 Formato de Archivo</label>

            <div className={styles.formatGrid}>
              <button
                type="button"
                className={`${styles.formatOption} ${
                  format === "excel" ? styles.formatOptionActive : ""
                }`}
                onClick={() => setFormat("excel")}
              >
                <span className={styles.formatIcon}>▦</span>
                <strong>Excel</strong>
              </button>

              <button
                type="button"
                className={`${styles.formatOption} ${
                  format === "csv" ? styles.formatOptionActive : ""
                }`}
                onClick={() => setFormat("csv")}
              >
                <span className={styles.formatIcon}>▤</span>
                <strong>CSV</strong>
              </button>
            </div>
          </div>

          <div className={styles.section}>
            <label className={styles.sectionLabel} htmlFor="dateRange">
              📅 Rango de Fecha
            </label>

            <select
              id="dateRange"
              className={styles.dateSelect}
              value={rango}
              onChange={(event) => setRango(event.target.value)}
            >
              {RANGOS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className={styles.generateButton}>
            ⬇ Generar Reporte
          </button>
        </form>

        {mensaje && <p className={styles.mensaje}>{mensaje}</p>}

        <button
          type="button"
          className={styles.backLink}
          onClick={onClose}
        >
          Regresar al Panel
        </button>
      </div>
    </div>
  );
}
