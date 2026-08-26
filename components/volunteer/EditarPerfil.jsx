"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { fetchConToken } from "@/lib/api/client";
import styles from "./EditarPerfil.module.css";

export default function EditarPerfil() {
  const router = useRouter();
  const [form, setForm] = useState(null);
  const [areas, setAreas] = useState([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState("");

  // Carga el perfil real (nombre/apellido) y áreas disponibles.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No hay sesión activa.");

        const [perfilRes, areasRes] = await Promise.all([
          fetchConToken("/api/auth/perfil"),
          fetchConToken("/api/areas"),
        ]);

        const perfilBody = await perfilRes.json().catch(() => null);
        const areasBody = await areasRes.json().catch(() => null);

        if (cancelled) return;

        if (!perfilBody?.profile) throw new Error("No se encontró tu perfil.");

        setForm({
          nombre: perfilBody.profile.nombre || "",
          apellido: perfilBody.profile.apellido || "",
          rol: perfilBody.profile.rol || "voluntario",
          areaId: perfilBody.profile.areaId || "",
        });
        setAreas(areasBody?.areas || []);
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

    if (!form.areaId) {
      setMensaje("El área de voluntariado es obligatoria.");
      return;
    }

    setSaving(true);
    setMensaje("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("No hay sesión activa.");

      const payload = {
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        areaId: form.areaId || null,
      };

      const res = await fetch("/api/auth/perfil", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "No se pudo actualizar el perfil.");
      }

      setMensaje("Perfil actualizado correctamente.");
      setTimeout(() => router.push("/formulario-horas"), 1500);
    } catch (err) {
      setMensaje("" + (err.message || "No se pudo actualizar el perfil."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner} aria-hidden="true"></div>
        <p className={styles.loadingText}>Cargando perfil...</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <h1>Editar Perfil</h1>
        <p>Actualiza tu información personal y área de voluntariado.</p>
      </header>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="nombre">Nombres *</label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            value={form?.nombre || ""}
            onChange={handleChange}
            required
            autoComplete="given-name"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="apellido">Apellidos *</label>
          <input
            id="apellido"
            name="apellido"
            type="text"
            value={form?.apellido || ""}
            onChange={handleChange}
            required
            autoComplete="family-name"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="areaId">Área de Voluntariado *</label>
          <select
            id="areaId"
            name="areaId"
            value={form?.areaId || ""}
            onChange={handleChange}
            required
          >
            <option value="">Seleccionar área</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            readOnly
            disabled
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="rol">Rol</label>
          <input
            id="rol"
            type="text"
            value={form?.rol || ""}
            readOnly
            disabled
          />
        </div>

        {mensaje && <p className={styles.mensaje}>{mensaje}</p>}

        <button type="submit" className={styles.saveButton} disabled={saving}>
          {saving ? "Guardando..." : "Guardar Cambios"}
        </button>
      </form>
    </div>
  );
}