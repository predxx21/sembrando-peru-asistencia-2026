"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useRol, useSidebar } from "./PortalAuthProvider";
import styles from "./Sidebar.module.css";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const rol = useRol();
  const { sidebarOpen, closeSidebar } = useSidebar();
  const [cerrando, setCerrando] = useState(false);
  const sidebarRef = useRef(null);

  const isFormularioHoras = pathname === "/formulario-horas";

  // Cerrar al navegar (cambio de ruta) en móvil
  useEffect(() => {
    closeSidebar();
  }, [pathname, closeSidebar]);

  // Body scroll lock + ESC key + focus management
  useEffect(() => {
    if (!sidebarOpen) return;

    // Bloquear scroll del body
    document.body.style.overflow = 'hidden';

    // Mover foco al primer enlace del sidebar
    const timer = setTimeout(() => {
      const firstLink = sidebarRef.current?.querySelector('a, button');
      firstLink?.focus();
    }, 50);

    // Cerrar con tecla Escape
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeSidebar();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
      // Devolver foco al botón hamburguesa
      document.getElementById('sidebar-menu-button')?.focus();
    };
  }, [sidebarOpen, closeSidebar]);

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

  // Administración y Reportes son exclusivos de coordinadores (admin).
  const navItems = [
    { label: "▦　Panel", href: "/principal" },
    { label: "◴　Historial", href: "/historial" },
    ...(rol === "admin"
      ? [
          { label: "◉　Administración", href: "/administracion" },
          { label: "◐　Auditoría", href: "/administracion/auditoria" },
          { label: "▥　Reportes", href: "/reportes" },
        ]
      : []),
  ];

  return (
    <>
      {/* Overlay (solo móvil) */}
      <div
        className={`${styles.overlay} ${sidebarOpen ? styles.overlayVisible : ''}`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      {/* Drawer móvil: contenedor con animación slide */}
      <div
        id="sidebar-drawer"
        className={`${styles.drawer} ${sidebarOpen ? styles.open : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
      >
        <aside
          ref={sidebarRef}
          className={styles.sidebar}
        >
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
                  onClick={closeSidebar}
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
              onClick={closeSidebar}
            >
              ＋ Registrar Horas
            </Link>
          )}

          <div className={styles.sidebarBottom}>
            <Link href="/editar-perfil" onClick={closeSidebar}>⚙　Configuración</Link>

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
      </div>
    </>
  );
}