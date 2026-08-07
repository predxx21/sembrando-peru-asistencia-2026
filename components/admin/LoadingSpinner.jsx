"use client";

import styles from "./AdminDashboard.module.css";

// Spinner de carga usado en las tarjetas de estadísticas.
export default function LoadingSpinner() {
  return <span className={styles.loadingSpinner}>⏳</span>;
}