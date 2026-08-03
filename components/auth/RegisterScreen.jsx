'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { isOrganizationEmail } from '@/lib/auth/email';
import { registerUser } from '@/lib/auth/register';

export default function RegisterScreen() {

  const router = useRouter();
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const nombre = String(formData.get('nombre')).trim();
    const apellido = String(formData.get('apellido')).trim();
    const email = String(formData.get('email')).trim();
    const password = String(formData.get('password'));
    const confirmPassword = String(formData.get('confirmPassword'));

    // Validaciones
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

    setIsSubmitting(true);
    setMessage('');

    try {
      console.log("Enviando registro...");

      const { data, error } = await registerUser({
        nombre,
        apellido,
        email,
        password,
      });

      console.log("DATA:", data);
      console.log("ERROR:", error);


      if (error) {
        setMessage(error.message);
        return;
      }

      // Si el usuario ya tiene sesión (confirmación automática), redirigir
      if (data.session) {
        router.push('/principal');
        return;
      }

      // Si no hay sesión, significa que requiere confirmación de correo
      setMessage(
        'Cuenta creada. Revisa tu correo electrónico para confirmar tu registro.'
      );
      event.currentTarget.reset();
    } catch {
      setMessage('No se pudo conectar con Supabase. Inténtalo nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="register-page">
      <header className="register-navbar">
        <Link className="nav-brand" href="/" aria-label="Ir al inicio">
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

      <section className="register-content">
        <form className="register-card" onSubmit={handleSubmit}>
          <img
            className="register-logo"
            src="/images/sembrando-peru-logo.jfif"
            alt="Sembrando Perú"
          />
          <h1>Crea tu cuenta</h1>
          <p className="register-subtitle">
            Únete a la plataforma de gestión ambiental y asistencia comunitaria.
          </p>

          <div className="register-name-row">
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

          <div className="password-grid">
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

          <label className="terms">
            <input type="checkbox" required />
            Acepto los <a href="#terms">Términos y condiciones</a> y la{' '}
            <a href="#privacy">Política de privacidad</a> de Sembrando Perú.
          </label>

          <button className="create-account" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>

          {message && (
            <p className="register-message" role="status">
              {message}
            </p>
          )}
        </form>
      </section>

      <footer className="register-footer">
        © 2026 Sembrando Perú. Todos los derechos reservados.
      </footer>
    </main>
  );
}