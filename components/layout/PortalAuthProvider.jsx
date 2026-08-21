'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { getUsuarioActual, isAdminRoute } from '@/lib/auth/sesion';

// Provee el rol del usuario al portal y protege las rutas:
//   - Sin sesión          → redirige a / (login).
//   - No admin en /admin* o /reportes → redirige a /principal.
// Se monta una sola vez en el layout del portal y expone el rol vía
// useRol() para que el Sidebar oculte/muestre secciones según el perfil.
//
// También expone estado de UI del sidebar (drawer móvil) vía useSidebar().
const PortalAuthContext = createContext({ rol: null, sidebarOpen: false, toggleSidebar: () => {}, closeSidebar: () => {} });

export function useRol() {
  return useContext(PortalAuthContext).rol;
}

export function useSidebar() {
  const { sidebarOpen, toggleSidebar, closeSidebar } = useContext(PortalAuthContext);
  return { sidebarOpen, toggleSidebar, closeSidebar };
}

export default function PortalAuthProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [rol, setRol] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auto-cerrar sidebar al redimensionar a desktop (≥769px) para evitar overlay residual
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 769 && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen]);

  const toggleSidebar = useCallback(() => setSidebarOpen((prev) => !prev), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  useEffect(() => {
    let active = true;

    async function verificar() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!active) return;
      if (!session?.user) {
        setLoading(false);
        router.replace('/');
        return;
      }

      try {
        const usuario = await getUsuarioActual();
        if (!active) return;
        setRol(usuario.rol);
      } catch {
        if (!active) return;
        setRol(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    verificar();
    return () => {
      active = false;
    };
  }, [router]);

  // Guard por ruta: se re-evalúa cuando cambia la ruta y cuando dejamos de
  // cargar (ya con el rol resuelto).
  useEffect(() => {
    if (loading) return;

    if (!rol) {
      router.replace('/');
      return;
    }

    if (rol !== 'admin' && isAdminRoute(pathname)) {
      router.replace('/principal');
    }
  }, [loading, rol, pathname, router]);

  if (loading || !rol) return null;

  return (
    <PortalAuthContext.Provider value={{ rol, sidebarOpen, toggleSidebar, closeSidebar }}>
      {children}
    </PortalAuthContext.Provider>
  );
}