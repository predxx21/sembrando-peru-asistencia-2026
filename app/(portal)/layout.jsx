import Topbar from "@/components/layout/Topbar";
import Sidebar from "@/components/layout/Sidebar";
import PortalAuthProvider from "@/components/layout/PortalAuthProvider";
import styles from "./layout.module.css";

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