'use client';

import Link from 'next/link';
import { useState } from 'react';
import { isOrganizationEmail } from '@/lib/auth/email';
import { solicitarRecuperacion } from '@/lib/auth/recuperar';
import LoginVisual from './LoginVisual';

export default function RecuperarScreen() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!isOrganizationEmail(email)) {
      setMessage('Usa un correo institucional que termine en @sembrandoperu.org.');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      const { error } = await solicitarRecuperacion(email);

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage('Si el correo existe, recibirás un enlace para restablecer tu contraseña.');
      event.target.reset();
    } catch {
      setMessage('No se pudo conectar con Supabase. Inténtalo nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="login-card">
        <LoginVisual />

        <section className="form-panel" aria-labelledby="welcome-title">
          <div className="form-content">
            <header>
              <img
                className="login-brand-logo"
                src="/images/sembrando-peru-logo.jfif"
                alt="Logo de Sembrando Perú"
              />
              <h2 id="welcome-title">Recuperar contraseña</h2>
              <p>Ingresa tu correo institucional para recibir un enlace de restablecimiento.</p>
            </header>

            <form onSubmit={handleSubmit}>
              <label htmlFor="email">Correo electrónico</label>
              <div className="input-wrap">
                <span className="input-icon" aria-hidden="true">���</span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  pattern=".+@sembrandoperu\.org"
                  title="Usa un correo @sembrandoperu.org"
                  placeholder="nombre@sembrandoperu.org"
                  required
                  autoComplete="email"
                />
              </div>

              <button
                className="primary-button"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Enviando...' : 'Enviar enlace'}
              </button>

              {message && <p className="message" role="status">{message}</p>}
            </form>

            <p className="register">
              <Link href="/">Volver al inicio de sesión</Link>
            </p>

            <footer>
              <a href="#terms">Términos</a>
              <a href="#privacy">Privacidad</a>
              <a href="#help">Ayuda</a>
            </footer>
          </div>
        </section>
      </section>
    </main>
  );
}