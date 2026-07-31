"use client";

import { useState } from "react";
import styles from "./ExportReportModal.module.css";

const DATE_RANGE_OPTIONS = [
  "Mes Actual (Octubre 2023)",
  "Últimos 3 Meses",
  "Últimos 6 Meses",
  "Año Completo (2023)",
];

export default function ExportReportModal({ isOpen, onClose }) {
  const [format, setFormat] = useState("excel");
  const [dateRange, setDateRange] = useState(DATE_RANGE_OPTIONS[0]);
  const [scope, setScope] = useState("todos");

  if (!isOpen) return null;

  function handleGenerate(event) {
    event.preventDefault();
    // TODO: conectar con el backend para generar y descargar el reporte.
    console.log("Generar reporte", { format, dateRange, scope });
    onClose();
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
            <label className={styles.sectionLabel}>
              📄 Formato de Archivo
            </label>

            <div className={styles.formatGrid}>
              <button
                type="button"
                className={`${styles.formatOption} ${
                  format === "excel" ? styles.formatOptionActive : ""
                }`}
                onClick={() => setFormat("excel")}
              >
                <span className={styles.formatIcon}>▦</span>
                <strong>Excel (.xlsx)</strong>
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
              value={dateRange}
              onChange={(event) => setDateRange(event.target.value)}
            >
              {DATE_RANGE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.section}>
            <label className={styles.sectionLabel}>▽ Filtros de Datos</label>

            <div className={styles.filtersRow}>
              <label className={styles.checkboxOption}>
                <input
                  type="checkbox"
                  checked={scope === "todos"}
                  onChange={() => setScope("todos")}
                />
                Todos
              </label>

              <label className={styles.checkboxOption}>
                <input
                  type="checkbox"
                  checked={scope === "departamento"}
                  onChange={() => setScope("departamento")}
                />
                Por Departamento
              </label>
            </div>
          </div>

          <button type="submit" className={styles.generateButton}>
            ⬇ Generar Reporte
          </button>
        </form>

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
