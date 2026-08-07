"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import styles from "./Sidebar.module.css";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [cerrando, setCerrando] = useState(false);

  const isFormularioHoras = pathname === "/formulario-horas";

  // Cierra la sesión en Supabase Auth y vuelve a la pantalla de login (/).
  async function handleCerrarSesion() {
    if (cerrando) return;
    setCerrando(true);

    try {
      await supabase.auth.signOut();
      router.push("/");
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
      setCerrando(false);
    }
  }

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

        <button
          type="button"
          className={styles.logoutButton}
          onClick={handleCerrarSesion}
          disabled={cerrando}
        >
          {cerrando ? "⏳　Cerrando..." : "⇥　Cerrar Sesión"}
        </button>
      </div>
    </aside>
  );
}