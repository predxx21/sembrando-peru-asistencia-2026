"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { fetchConToken } from "@/lib/api/client";
import styles from "./EditarPerfil.module.css";

export default function EditarPerfil() {
  const router = useRouter();
  const [form, setForm] = useState(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState("");

  // Carga el perfil real (nombre/apellido) desde /api/auth/perfil.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No hay sesión activa.");

        const res = await fetchConToken("/api/auth/perfil");
        const body = await res.json().catch(() => null);

        if (cancelled) return;

        if (!body?.profile) throw new Error("No se encontró tu perfil.");

        setForm({
          nombre: body.profile.nombre || "",
          apellido: body.profile.apellido || "",
          rol: body.profile.rol || "voluntario",
        });
        setEmail(user.email || "");
      } catch (err) {
        if (!cancelled) {
          setMensaje("Error: " + (err.message || "No se pudo cargar el perfil."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.nombre.trim() || !form.apellido.trim()) {
      setMensaje("Los nombres y los apellidos son obligatorios.");
      return;
    }

    setSaving(true);
    setMensaje("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("No hay sesión activa.");

      const res = await fetch("/api/auth/perfil", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          apellido: form.apellido.trim(),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "No se pudo actualizar el perfil.");
      }

      // Redirige a /principal tras mostrar confirmación breve.
      setMensaje("Perfil actualizado correctamente.");
      setTimeout(() => router.push("/principal"), 1200);
    } catch (err) {
      console.error("Error al actualizar perfil:", err);
      setMensaje("Error: " + (err.message || "No se pudo actualizar el perfil."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingSpinner} aria-hidden="true"></div>
      <p className={styles.loadingText}>Cargando perfil...</p>
    </div>
  );
  if (!form) return <p className={styles.errorContainer}>No hay datos para mostrar.</p>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Editar Perfil</h1>
      <p className={styles.subtitle}>Actualiza tu información personal</p>

      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.grid}>
          <div className={styles.field}>
            <label htmlFor="nombre">Nombres</label>
            <input
              id="nombre"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              disabled={saving}
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="apellido">Apellidos</label>
            <input
              id="apellido"
              name="apellido"
              value={form.apellido}
              onChange={handleChange}
              disabled={saving}
              required
            />
          </div>

          <div className={styles.fieldFull}>
            <label>Correo Electrónico</label>
            <span className={`${styles.rolBadge} ${styles.emailInput}`}>
              {email}
            </span>
            <span className={styles.hint}> El correo no se puede modificar</span>
          </div>

          <div className={styles.fieldFull}>
            <label>Rol</label>
            <span className={styles.rolBadge}>{form.rol}</span>
            <span className={styles.hint}> El rol lo gestiona un administrador</span>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancel}
            onClick={() => router.push("/principal")}
            disabled={saving}
          >
            Cancelar
          </button>

          <button type="submit" className={styles.save} disabled={saving}>
            {saving ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>

        {mensaje && <p className={styles.mensaje}>{mensaje}</p>}
      </form>
    </div>
  );
}
