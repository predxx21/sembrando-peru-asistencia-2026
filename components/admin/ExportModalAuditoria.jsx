"use client";

import { useState } from "react";
import { buildCsv, buildExcelXLSX, descargar, descargarExcel } from "@/lib/utils/exportar";
import { supabase } from "@/lib/supabase/client";
import styles from "./ExportModalAuditoria.module.css";

export default function ExportModal({
  isOpen,
  onClose,
  initialDesde = "",
  initialHasta = "",
  initialEstado = "aprobado",
}) {
  const [formato, setFormato] = useState("excel");
  const [desde, setDesde] = useState(initialDesde);
  const [hasta, setHasta] = useState(initialHasta);
  const [agruparPor, setAgruparPor] = useState("semana");
  const [incluirOtrosEstados, setIncluirOtrosEstados] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fechasValidas, setFechasValidas] = useState(true);

  if (!isOpen) return null;

  const validarFechas = (desdeVal, hastaVal) => {
    if (desdeVal && hastaVal && desdeVal > hastaVal) {
      setFechasValidas(false);
      return false;
    }
    setFechasValidas(true);
    return true;
  };

  const handleDesdeChange = (e) => {
    const val = e.target.value;
    setDesde(val);
    validarFechas(val, hasta);
  };

  const handleHastaChange = (e) => {
    const val = e.target.value;
    setHasta(val);
    validarFechas(desde, val);
  };

  const setRango = (dias) => {
    const hoy = new Date();
    const isoHoy = hoy.toISOString().split("T")[0];
    if (dias === 0) {
      setDesde(isoHoy);
      setHasta(isoHoy);
    } else {
      const past = new Date();
      past.setDate(hoy.getDate() - dias);
      setDesde(past.toISOString().split("T")[0]);
      setHasta(isoHoy);
    }
  };

  const exportar = async () => {
    if (!fechasValidas) {
      alert("La fecha 'Desde' debe ser anterior o igual a la fecha 'Hasta'.");
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("No autenticado");

      const params = new URLSearchParams();
      if (desde) params.append("desde", desde);
      if (hasta) params.append("hasta", hasta);
      if (agruparPor) params.append("agruparPor", agruparPor);

      // Estado: si "incluir otros" está activo, no pasamos filtro de estado
      if (!incluirOtrosEstados) {
        params.append("estado", "aprobado");
      }
      // Si está activo, no pasamos estado → devuelve todos (pendientes, aprobados, rechazados)

      const url = `/api/admin/auditoria/reporte${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Error al obtener los datos");
      const body = await res.json();
      const data = body.data || [];

      if (data.length === 0) {
        alert("No hay datos en el rango seleccionado.");
        setLoading(false);
        return;
      }

      const fechaActual = new Date().toISOString().split("T")[0];
      const columnas = [
        { key: "Voluntario", label: "Voluntario" },
        { key: "Area", label: "Área" },
        { key: "FechaRegistro", label: "Fecha de Registro" },
        { key: "FechaAprobacion", label: "Fecha de Aprobación" },
        { key: "Dia", label: "Día" },
        { key: "HoraInicio", label: "Hora de inicio" },
        { key: "HoraFin", label: "Hora de fin" },
        { key: "Horas", label: "Horas realizadas" },
      ];

      if (formato === "csv") {
        const contenido = buildCsv(data, columnas);
        descargar(`auditoria_reporte_${fechaActual}.csv`, contenido, "text/csv");
      } else {
        const buffer = await buildExcelXLSX(data, columnas);
        descargarExcel(`auditoria_reporte_${fechaActual}.xlsx`, buffer);
      }

      onClose();
    } catch (err) {
      console.error("Error al exportar:", err);
      alert("Error al exportar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>Exportar Reporte de Auditoría</h3>
        <p className={styles.subtitle}>Selecciona el formato y el rango de fechas</p>

        {/* Atajos de fechas */}
        <div className={styles.quickDates}>
          <button type="button" className={styles.quickDateBtn} onClick={() => setRango(0)}>Hoy</button>
          <button type="button" className={styles.quickDateBtn} onClick={() => setRango(7)}>Últimos 7d</button>
          <button type="button" className={styles.quickDateBtn} onClick={() => setRango(30)}>Últimos 30d</button>
        </div>

        <div className={styles.dateGroup}>
          <div className={styles.dateField}>
            <label htmlFor="export-desde">Desde (fecha de registro)</label>
            <input
              id="export-desde"
              type="date"
              className={styles.dateInput}
              value={desde}
              onChange={handleDesdeChange}
            />
          </div>
          <div className={styles.dateField}>
            <label htmlFor="export-hasta">Hasta (fecha de registro)</label>
            <input
              id="export-hasta"
              type="date"
              className={styles.dateInput}
              value={hasta}
              onChange={handleHastaChange}
            />
          </div>
        </div>
        {!fechasValidas && (
          <p className={styles.errorText}>La fecha "Desde" debe ser anterior a "Hasta".</p>
        )}

        {/* Opciones de agrupación */}
        <div className={styles.optionGroup}>
          <label className={styles.optionLabel}>Agrupar por</label>
          <div className={styles.optionButtons}>
            <button
              type="button"
              className={`${styles.optionBtn} ${agruparPor === "semana" ? styles.optionBtnActive : ""}`}
              onClick={() => setAgruparPor("semana")}
            >
              Semana
            </button>
            <button
              type="button"
              className={`${styles.optionBtn} ${agruparPor === "mes" ? styles.optionBtnActive : ""}`}
              onClick={() => setAgruparPor("mes")}
            >
              Mes
            </button>
          </div>
        </div>

        {/* Incluir otros estados */}
        <div className={styles.checkboxGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={incluirOtrosEstados}
              onChange={(e) => setIncluirOtrosEstados(e.target.checked)}
            />
            Incluir registros pendientes y rechazados
          </label>
        </div>

        {/* Formato */}
        <div className={styles.formatGroup}>
          <button
            className={`${styles.formatBtn} ${formato === "excel" ? styles.formatBtnActive : ""}`}
            onClick={() => setFormato("excel")}
            type="button"
          >
            <span className={styles.formatIcon}>📄</span>
            Excel
          </button>
          <button
            className={`${styles.formatBtn} ${formato === "csv" ? styles.formatBtnActive : ""}`}
            onClick={() => setFormato("csv")}
            type="button"
          >
            <span className={styles.formatIcon}>📊</span>
            CSV
          </button>
        </div>

        {loading && <p className={styles.loadingText}>Generando reporte...</p>}

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className={styles.confirmBtn}
            onClick={exportar}
            disabled={loading || !fechasValidas}
          >
            Descargar
          </button>
        </div>
      </div>
    </div>
  );
}