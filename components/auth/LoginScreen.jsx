'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { isOrganizationEmail } from '@/lib/auth/email';
import { loginUser } from '@/lib/auth/login';
import { obtenerRolActual, rutaPorRol } from '@/lib/auth/sesion';
import LoginVisual from './LoginVisual';
import styles from './LoginScreen.module.css';

export default function LoginScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (searchParams?.get('reset') === 'success') {
      setMessage('Contraseña actualizada correctamente. Inicia sesión con tu nueva contraseña.');
    }
  }, [searchParams]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!isOrganizationEmail(email)) {
      setMessage('Usa un correo institucional que termine en @sembrandoperu.org.');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      const { error } = await loginUser(email, password);

      if (error) {
        setMessage(error.message);
        return;
      }

      const rol = await obtenerRolActual();
      router.push(rutaPorRol(rol));
    } catch {
      setMessage('No se pudo conectar con el servidor. Inténtalo nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles['page-shell']}>
      <section className={styles['login-card']}>
        <LoginVisual />

        <section className={styles['form-panel']} aria-labelledby="welcome-title">
          <div className={styles['form-content']}>
            <header className={styles['form-header']}>
              <div className={styles['logo-wrapper']}>
                <img
                  className={styles['login-brand-logo']}
                  src="/images/sembrando-peru-logo.jfif"
                  alt="Logo de Sembrando Perú"
                />
              </div>
              <h2 id="welcome-title">Bienvenido a Sembrando Perú</h2>
              <p>Ingresa tus credenciales para gestionar tus actividades de voluntariado.</p>
            </header>

            <form onSubmit={handleSubmit} className={styles['login-form']}>
              <div className={styles['field-group']}>
                <label htmlFor="email">Correo electrónico institucional</label>
                <div className={styles['input-wrap']}>
                  <span className={styles['input-icon']} aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </span>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    pattern=".+@sembrandoperu\.org"
                    title="Usa un correo @sembrandoperu.org"
                    placeholder="nombre@sembrandoperu.org"
                    required
                  />
                </div>
              </div>

              <div className={styles['field-group']}>
                <div className={styles['password-label']}>
                  <label htmlFor="password">Contraseña</label>
                  <a href="/olvide-contrasena" className={styles['forgot-link']}>¿Olvidaste tu contraseña?</a>
                </div>
                <div className={styles['input-wrap']}>
                  <span className={styles['input-icon']} aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    className={styles['eye']}
                    type="button"
                    aria-label="Mostrar u ocultar contraseña"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      {showPassword ? (
                        <>
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </>
                      ) : (
                        <>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </>
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              <button
                className={styles['primary-button']}
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Ingresando...' : 'Iniciar sesión'}
              </button>

              {message && <p className={styles['message']} role="status">{message}</p>}
            </form>

            <div className={styles['register-box']}>
              <p className={styles['register']}>
                ¿No tienes una cuenta? <Link href="/registro">Regístrate aquí</Link>
              </p>
            </div>
          </div>

          <footer className={styles['form-footer']}>
            <a href="#terms">Términos</a>
            <a href="#privacy">Privacidad</a>
            <a href="#help">Ayuda</a>
          </footer>
        </section>
      </section>
    </main>
  );
}