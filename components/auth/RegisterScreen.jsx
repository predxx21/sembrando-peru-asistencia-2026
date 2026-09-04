'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { isOrganizationEmail } from '@/lib/auth/email';
import { registerUser } from '@/lib/auth/register';
import { obtenerRolActual, rutaPorRol } from '@/lib/auth/sesion';
import styles from './RegisterScreen.module.css';

export default function RegisterScreen() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [areas, setAreas] = useState([]);
  const [loadingAreas, setLoadingAreas] = useState(true);

  // Cargar áreas al montar
  useEffect(() => {
    async function cargarAreas() {
      try {
        const res = await fetch('/api/areas');
        if (!res.ok) throw new Error('Error al cargar áreas');
        const data = await res.json();
        setAreas(data.areas || []);
      } catch (error) {
        console.error('Error cargando áreas:', error);
      } finally {
        setLoadingAreas(false);
      }
    }
    cargarAreas();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);

    const nombre = String(formData.get('nombre')).trim();
    const apellido = String(formData.get('apellido')).trim();
    const email = String(formData.get('email')).trim();
    const password = String(formData.get('password'));
    const confirmPassword = String(formData.get('confirmPassword'));
    const areaId = String(formData.get('areaId'));

    if (!nombre || !apellido) {
      setMessage('Por favor, ingresa tu nombre y apellido.');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Las contraseñas no coinciden.');
      return;
    }

    if (!isOrganizationEmail(email)) {
      setMessage('Usa un correo institucional que termine en @sembrandoperu.org.');
      return;
    }

    if (!areaId) {
      setMessage('Por favor, selecciona un área de voluntariado.');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      const { data, error } = await registerUser({
        nombre,
        apellido,
        email,
        password,
        areaId,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      if (data?.session) {
        const rol = await obtenerRolActual();
        router.push(rutaPorRol(rol));
        return;
      }

      setMessage('Cuenta creada. Revisa tu correo electrónico para confirmar tu registro.');
      form.reset();
    } catch (err) {
      console.error('Error en registro:', err);
      setMessage('No se pudo conectar con Supabase. Inténtalo nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles['register-page']}>
      <header className={styles['register-navbar']}>
        <Link className={styles['nav-brand']} href="/" aria-label="Ir al inicio">
          <img
            src="/images/sembrando-peru-logo.jfif"
            alt="Logo de Sembrando Perú"
          />
          <span>Sembrando Perú</span>
        </Link>
        <p>
          ¿Ya tienes cuenta? <Link href="/">Inicia sesión</Link>
        </p>
      </header>

      <section className={styles['register-content']}>
        <form className={styles['register-card']} onSubmit={handleSubmit}>
          <img
            className={styles['register-logo']}
            src="/images/sembrando-peru-logo.jfif"
            alt="Sembrando Perú"
          />
          <h1>Crea tu cuenta</h1>
          <p className={styles['register-subtitle']}>
            Únete a la plataforma de gestión ambiental y asistencia comunitaria.
          </p>

          <div className={styles['register-name-row']}>
            <div>
              <label htmlFor="nombre">Nombre</label>
              <input
                id="nombre"
                name="nombre"
                type="text"
                required
                placeholder="Ej. Juan"
              />
            </div>
            <div>
              <label htmlFor="apellido">Apellido</label>
              <input
                id="apellido"
                name="apellido"
                type="text"
                required
                placeholder="Ej. Pérez"
              />
            </div>
          </div>

          <label htmlFor="email">Correo electrónico</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            pattern=".+@sembrandoperu\.org"
            title="Usa un correo @sembrandoperu.org"
            placeholder="nombre@sembrandoperu.org"
          />

          <div className={styles['password-grid']}>
            <div>
              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                name="password"
                type="password"
                minLength="6"
                required
                placeholder="••••••••"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword">Confirmar contraseña</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                minLength="6"
                required
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* ✅ Área de Voluntariado */}
          <label htmlFor="areaId">Área de Voluntariado</label>
          <select
            id="areaId"
            name="areaId"
            required
            className={styles['register-select']}
            defaultValue=""
          >
            <option value="" disabled>Selecciona un área</option>
            {loadingAreas ? (
              <option value="" disabled>Cargando áreas...</option>
            ) : (
              areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.nombre}
                </option>
              ))
            )}
          </select>

          {/* <label className={styles['terms']}>
            <input type="checkbox" required />
            Acepto los <a href="#terms">Términos y condiciones</a> y la{' '}
            <a href="#privacy">Política de privacidad</a> de Sembrando Perú.
          </label> */}

          <button className={styles['create-account']} type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>

          {message && (
            <p className={styles['register-message']} role="status">
              {message}
            </p>
          )}
        </form>
      </section>

      <footer className={styles['register-footer']}>
        © 2026 Sembrando Perú. Todos los derechos reservados.
      </footer>
    </main>
  );
}