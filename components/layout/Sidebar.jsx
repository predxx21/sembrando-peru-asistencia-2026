"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Sidebar.module.css";

export default function Sidebar() {
  const pathname = usePathname();

  const isFormularioHoras = pathname === "/formulario-horas";

  const navItems = [
    {
      label: "▦　Panel",
      href: "/principal",
    },
    {
      label: "◴　Historial",
      href: "/historial",
    },
    {
      label: "◉　Administración",
      href: "/administracion",
    },
    {
      label: "▥　Reportes",
      href: "/reportes",
    },
  ];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarBrand}>
        <strong>Portal del Voluntario</strong>
        <span>Sistema de Gestión</span>
      </div>

      <nav className={styles.sidebarNav}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${
                isActive ? styles.active : ""
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {!isFormularioHoras && (
        <Link
          href="/formulario-horas"
          className={styles.primaryButton}
        >
          ＋ Registrar Horas
        </Link>
      )}

      <div className={styles.sidebarBottom}>
        <Link href="/editar-perfil">⚙　Configuración</Link>
        <span>⇥　Cerrar Sesión</span>
      </div>
    </aside>
  );
}