'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { isOrganizationEmail } from '@/lib/auth/email';
import { supabase } from '@/lib/supabase/client';
import LoginVisual from './LoginVisual';

export default function LoginScreen() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleGoogleLogin() {
    setIsSubmitting(true);
    setMessage('');

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { hd: 'sembrandoperu.org' },
      },
    });

    if (error) {
      setMessage(error.message);
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!isOrganizationEmail(email)) {
      setMessage('Usa un correo institucional que termine en @sembrandoperu.org.');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setMessage(error.message);
        return;
      }

      router.push('/principal');
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
              <img className="login-brand-logo" src="/images/sembrando-peru-logo.jfif" alt="Logo de Sembrando Perú" />
              <h2 id="welcome-title">Bienvenido a Sembrando Perú - Asistencia</h2>
              <p>Ingresa tus credenciales para gestionar tus actividades de voluntariado.</p>
            </header>

            <form onSubmit={handleSubmit}>
              <label htmlFor="email">Correo electrónico</label>
              <div className="input-wrap">
                <span className="input-icon" aria-hidden="true">✉</span>
                <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} pattern=".+@sembrandoperu\.org" title="Usa un correo @sembrandoperu.org" placeholder="nombre@sembrandoperu.org" required />
              </div>

              <div className="password-label">
                <label htmlFor="password">Contraseña</label>
                <a href="#recover">¿Olvidaste tu contraseña?</a>
              </div>
              <div className="input-wrap">
                <span className="input-icon lock" aria-hidden="true">♙</span>
                <input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" required />
                <button className="eye" type="button" aria-label="Mostrar contraseña" onClick={() => setShowPassword(!showPassword)}>◉</button>
              </div>

              <label className="remember"><input type="checkbox" /><span>Recordar sesión</span></label>
              <button className="primary-button" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Ingresando...' : 'Iniciar sesión'}</button>
              {message && <p className="message" role="status">{message}</p>}
            </form>

            <div className="divider"><span /><b>o</b><span /></div>
            <button className="google-button" type="button" onClick={handleGoogleLogin} disabled={isSubmitting}><strong>G</strong> Continuar con Google</button>
            <p className="register">¿No tienes una cuenta? <Link href="/registro">Regístrate aquí</Link></p>
            <button className="access-button" type="button"><span>♧</span> Solicitar acceso</button>
            <p className="request-note">Para nuevas organizaciones que desean digitalizar su impacto social.</p>
          </div>

          <footer><a href="#terms">Términos</a><a href="#privacy">Privacidad</a><a href="#help">Ayuda</a></footer>
        </section>
      </section>
    </main>
  );
}
