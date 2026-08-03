'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { isOrganizationEmail } from '@/lib/auth/email';
import { supabase } from '@/lib/supabase/client';

export default function RegisterScreen() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get('password'));
    const confirmPassword = String(formData.get('confirmPassword'));

    if (password !== confirmPassword) {
      setMessage('Las contraseñas no coinciden.');
      return;
    }

    if (!isOrganizationEmail(formData.get('email'))) {
      setMessage('Usa un correo institucional que termine en @sembrandoperu.org.');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      const { data, error } = await supabase.auth.signUp({
        email: String(formData.get('email')).trim(),
        password,
        options: {
          data: {
            full_name: String(formData.get('fullName')).trim(),
            profile_type: 'voluntario', // Siempre voluntario
          },
        },
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      event.currentTarget.reset();
      setMessage(data.session 
        ? 'Cuenta creada correctamente. Ya puedes iniciar sesión.' 
        : 'Cuenta creada. Revisa tu correo para confirmar tu registro.');
      
      setTimeout(() => {
        router.push('/');
      }, 3000);
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
          <img src="/images/sembrando-peru-logo.jfif" alt="Logo de Sembrando Perú" />
          <span>Sembrando Perú</span>
        </Link>
        <p>¿Ya tienes cuenta? <Link href="/">Inicia sesión</Link></p>
      </header>

      <section className="register-content">
        <form className="register-card" onSubmit={handleSubmit}>
          <img className="register-logo" src="/images/sembrando-peru-logo.jfif" alt="Sembrando Perú" />
          <h1>Crea tu cuenta</h1>
          <p className="register-subtitle">Únete a la plataforma de gestión ambiental y asistencia comunitaria.</p>

          {/* Eliminado el botón de Google */}

          <fieldset>
            <legend>Tipo de perfil</legend>
            <div className="profile-options">
              {/* Solo Voluntario, siempre activo y seleccionado */}
              <button 
                type="button" 
                className="profile-option active" 
                disabled
                style={{ opacity: 1, cursor: 'default' }}
              >
                <span>♧</span>
                Voluntario
              </button>
              {/* Eliminado el botón de Coordinador */}
            </div>
          </fieldset>

          <label htmlFor="name">Nombre completo</label>
          <input 
            id="name" 
            name="fullName" 
            required 
            placeholder="Ej. Juan Pérez" 
            disabled={isSubmitting}
          />

          <label htmlFor="register-email">Correo electrónico</label>
          <input 
            id="register-email" 
            name="email" 
            type="email" 
            required 
            pattern=".+@sembrandoperu\.org" 
            title="Usa un correo @sembrandoperu.org" 
            placeholder="nombre@sembrandoperu.org" 
            disabled={isSubmitting}
          />

          <div className="password-grid">
            <div>
              <label htmlFor="new-password">Contraseña</label>
              <input 
                id="new-password" 
                name="password" 
                type="password" 
                minLength="6" 
                required 
                placeholder="••••••••" 
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label htmlFor="confirm-password">Confirmar contraseña</label>
              <input 
                id="confirm-password" 
                name="confirmPassword" 
                type="password" 
                minLength="6" 
                required 
                placeholder="••••••••" 
                disabled={isSubmitting}
              />
            </div>
          </div>

          <label className="terms">
            <input type="checkbox" required disabled={isSubmitting} />
            Acepto los <a href="#terms">Términos y condiciones</a> y la <a href="#privacy">Política de privacidad</a> de Sembrando Perú.
          </label>

          <button className="create-account" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>

          {message && <p className="register-message" role="status">{message}</p>}
        </form>
      </section>

      <footer className="register-footer">
        © 2026 Sembrando Perú. Todos los derechos reservados.
      </footer>
    </main>
  );
}