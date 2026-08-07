'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { getUsuarioActual, isAdminRoute } from '@/lib/auth/sesion';

// Provee el rol del usuario al portal y protege las rutas:
//   - Sin sesión          → redirige a / (login).
//   - No admin en /admin* o /reportes → redirige a /principal.
// Se monta una sola vez en el layout del portal y expone el rol vía
// useRol() para que el Sidebar oculte/muestre secciones según el perfil.
const PortalAuthContext = createContext({ rol: null });

export function useRol() {
  return useContext(PortalAuthContext).rol;
}

export default function PortalAuthProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [rol, setRol] = useState(null);
  const [loading, setLoading] = useState(true);

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
    <PortalAuthContext.Provider value={{ rol }}>
      {children}
    </PortalAuthContext.Provider>
  );
}