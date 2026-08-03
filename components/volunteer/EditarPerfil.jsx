"use client";

import { useEffect, useState } from "react";
import styles from "./EditarPerfil.module.css";

/* ================= MOCK DATA ================= */
const mockUser = {
  id: 1,
  nombre: "Pedro Rojas ",
  email: "pedroelmagnifico@gmail.com",
  telefono: "+51 929 300 160",
  habilidades: ["Liderazgo", "Sostenibilidad", "Gestión"],
  bio: "Apasionado por el impacto social y la gestión de proyectos comunitarios",
  avatar: "/avatar.png",
};

/* ================= VALIDACIÓN ================= */
const validateProfile = (form) => {
  if (!form.nombre) return "El nombre es obligatorio";
  if (!form.telefono) return "El teléfono es obligatorio";
  if (!form.bio || form.bio.length < 10)
    return "La biografía debe tener al menos 10 caracteres";

  return null;
};

export default function EditarPerfil() {
  const [form, setForm] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* ================= LOAD (SIMULA API) ================= */
  useEffect(() => {
    const loadData = async () => {
      await new Promise((res) => setTimeout(res, 800));

      setForm({
        ...mockUser,
        habilidades: mockUser.habilidades.join(", "),
      });

      setPreview(mockUser.avatar);
      setLoading(false);
    };

    loadData();
  }, []);

  /* ================= HANDLERS ================= */
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (file) setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const error = validateProfile(form);
    if (error) return alert(error);

    setSaving(true);

    // 🔥 Aquí luego irá tu API real
    const payload = {
      ...form,
      habilidades: form.habilidades.split(",").map((h) => h.trim()),
    };

    console.log("📦 Enviando datos:", payload);

    await new Promise((res) => setTimeout(res, 1000));

    setSaving(false);
    alert("Perfil actualizado correctamente ✅");
  };

  if (loading || !form) return <p>Cargando perfil...</p>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Editar Perfil</h1>
      <p className={styles.subtitle}>
        Actualiza tu información personal y profesional
      </p>

      <form className={styles.card} onSubmit={handleSubmit}>
        {/* FOTO */}
        <div className={styles.sectionTop}>
          <img src={preview} className={styles.avatar} />

          <div>
            <h3>Foto de Perfil</h3>
            <p className={styles.desc}>
              Imagen cuadrada mínimo 400x400px
            </p>

            <div className={styles.photoActions}>
              <label className={styles.btnSecondary}>
                Cambiar Imagen
                <input type="file" hidden onChange={handleImage} />
              </label>

              <button type="button" className={styles.delete}>
                Eliminar
              </button>
            </div>
          </div>
        </div>

        <div className={styles.divider}></div>

        {/* FORM */}
        <div className={styles.grid}>
          <div className={styles.field}>
            <label>Nombre Completo</label>
            <input
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              disabled={saving}
            />
          </div>

          <div className={styles.field}>
            <label>Correo Electrónico</label>
            <input value={form.email} disabled className={styles.disabled} />
            <span className={styles.hint}>
              El correo no se puede modificar
            </span>
          </div>

          <div className={styles.field}>
            <label>Teléfono</label>
            <input
              name="telefono"
              value={form.telefono}
              onChange={handleChange}
              disabled={saving}
            />
          </div>

          <div className={styles.field}>
            <label>Habilidades</label>
            <input
              name="habilidades"
              value={form.habilidades}
              onChange={handleChange}
              disabled={saving}
            />
          </div>
        </div>

        <div className={styles.fieldFull}>
          <label>Biografía</label>
          <textarea
            name="bio"
            value={form.bio}
            onChange={handleChange}
            disabled={saving}
          />
        </div>

        <div className={styles.divider}></div>

        {/* SEGURIDAD */}
        <div className={styles.security}>
          <div>
            <h4>Seguridad de la Cuenta</h4>
            <p>Mínimo 12 caracteres</p>
          </div>

          <button type="button" className={styles.btnPrimary}>
            Actualizar Password
          </button>
        </div>

        {/* BOTONES */}
        <div className={styles.actions}>
          <button type="button" className={styles.cancel}>
            Cancelar
          </button>

          <button type="submit" className={styles.save} disabled={saving}>
            {saving ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}