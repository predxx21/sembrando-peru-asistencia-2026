import Topbar from "@/components/layout/Topbar";
import Sidebar from "@/components/layout/Sidebar";
import PortalAuthProvider from "@/components/layout/PortalAuthProvider";
import CheckProfile from "@/components/layout/CheckProfile";
import styles from "./layout.module.css";

export default function PortalLayout({ children }) {
  return (
    <PortalAuthProvider>
      <CheckProfile>
        <div className={styles.portal}>
          <Topbar />
          <Sidebar />
          <main className={styles.content}>
            {children}
          </main>
        </div>
      </CheckProfile>
    </PortalAuthProvider>
  );
}