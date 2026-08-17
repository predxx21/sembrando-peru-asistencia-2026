"use client";

import { useEffect, useRef, useState } from "react";
import { getUsuariosLista } from "./adminData";
import styles from "./AdminDashboard.module.css";

const USERS_PER_PAGE = 10;

export default function ListaUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const isFirstRender = useRef(true);

  const totalPages = Math.max(1, Math.ceil(total / USERS_PER_PAGE));

  async function cargarUsuarios(pagina = page) {
    try {
      setLoading(true);
      setError("");
      const { usuarios: lista, total: nuevoTotal } = await getUsuariosLista({
        page: pagina,
        limit: USERS_PER_PAGE,
        busqueda: search.trim() || undefined,
      });
      setUsuarios(lista);
      setTotal(nuevoTotal);
      const maxPage = Math.max(1, Math.ceil(nuevoTotal / USERS_PER_PAGE));
      setPage(pagina > maxPage ? maxPage : pagina);
    } catch (err) {
      setError(err.message || "No se pudieron cargar los usuarios.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarUsuarios(1);
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(() => cargarUsuarios(1), 300);
    return () => clearTimeout(timer);
  }, [search]);

  if (loading && usuarios.length === 0) {
    return (
      <div className={styles.adminPage}>
        <header className={styles.pageHeader}>
          <div>
            <h1>Gestión de Usuarios</h1>
            <p>Listado de todos los voluntarios y administradores del sistema.</p>
          </div>
        </header>
        <div className={styles.tableCard}>
          <p style={{ padding: "20px", textAlign: "center", color: "#667281" }}>
            Cargando usuarios...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.adminPage}>
      <header className={styles.pageHeader}>
        <div>
          <h1>Gestión de Usuarios</h1>
          <p>Listado de todos los voluntarios y administradores del sistema.</p>
        </div>
      </header>

      <div className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <h2>Usuarios Registrados</h2>

          <div className={styles.searchField}>
            <span>⌕</span>
            <input
              type="text"
              placeholder="Buscar por nombre o correo..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        <div className={`${styles.tableRow} ${styles.tableRowHead}`}>
          <span>Voluntario</span>
          <span>Correo</span>
          <span>Rol</span>
        </div>

        {error && <p className={styles.errorMessage}>{error}</p>}
        {!loading && !error && usuarios.length === 0 && (
          <p style={{ padding: "20px", textAlign: "center", color: "#667281" }}>
            No hay usuarios para mostrar.
          </p>
        )}

        {usuarios.map((u) => (
          <div className={styles.tableRow} key={u.id}>
            <span className={styles.volunteerCell}>
              <strong>{`${u.nombre} ${u.apellido}`}</strong>
            </span>
            <span>{u.email}</span>
            <span className={styles.rolBadge}>{u.rol}</span>
          </div>
        ))}

        {!loading && !error && total > 0 && (
          <div className={styles.pagination}>
            <span>
              Mostrando{" "}
              {((page - 1) * USERS_PER_PAGE) + 1} a{" "}
              {Math.min(page * USERS_PER_PAGE, total)} de {total} usuarios
            </span>
            <div className={styles.pageControls}>
              <button
                type="button"
                disabled={page === 1}
                onClick={() => cargarUsuarios(page - 1)}
              >
                Anterior
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pagina) => (
                <button
                  type="button"
                  key={pagina}
                  className={pagina === page ? styles.pageActive : ""}
                  onClick={() => cargarUsuarios(pagina)}
                >
                  {pagina}
                </button>
              ))}
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => cargarUsuarios(page + 1)}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}