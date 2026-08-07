import Topbar from "@/components/layout/Topbar";
import Sidebar from "@/components/layout/Sidebar";
import PortalAuthProvider from "@/components/layout/PortalAuthProvider";
import styles from "./layout.module.css";

// Guard de autenticación + rol del portal. PortalAuthProvider (cliente) valida
// la sesión, redirige a / si no hay usuario y expone el rol (useRol) para que
// el Sidebar oculte/muestre Administración y Reportes según el perfil.
export default function PortalLayout({ children }) {
  return (
    <PortalAuthProvider>
      <div className={styles.portal}>
        <Topbar />

        <Sidebar />

        <main className={styles.content}>
          {children}
        </main>
      </div>
    </PortalAuthProvider>
  );
}