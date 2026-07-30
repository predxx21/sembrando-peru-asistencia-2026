import styles from "./Sidebar.module.css";

export default function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarBrand}>
        <strong>Portal del Voluntario</strong>
        <span>Sistema de Gestión</span>
      </div>

      <nav className={styles.sidebarNav}>
        <span className={styles.active}>
          ▦　Panel
        </span>

        <span>
          ◴　Historial
        </span>

        <span>
          ◉　Panel de Administración
        </span>

        <span>
          ▥　Reportes
        </span>
      </nav>

      <button
        type="button"
        className={styles.primaryButton}
      >
        ＋ Registrar Horas
      </button>

      <div className={styles.sidebarBottom}>
        <span>⚙　Configuración</span>
        <span>⇥　Cerrar Sesión</span>
      </div>
    </aside>
  );
}