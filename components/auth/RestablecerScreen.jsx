'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { restablecerContrasena } from '@/lib/auth/restablecer';
import LoginVisual from './LoginVisual';
import styles from './RestablecerScreen.module.css';

export default function RestablecerScreen() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [tokenValido, setTokenValido] = useState(true);

  useEffect(() => {
    async function inicializarSesion() {
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      const type = params.get('type');

      if (!access_token || !refresh_token || type !== 'recovery') {
        setMessage('El enlace ha expirado o ya fue utilizado. Solicita uno nuevo.');
        setTokenValido(false);
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (error) {
        setMessage('El enlace ha expirado o ya fue utilizado. Solicita uno nuevo.');
        setTokenValido(false);
        return;
      }

      window.history.replaceState(null, '', window.location.pathname);
    }

    inicializarSesion();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!tokenValido) return;

    if (!password) {
      setMessage('Por favor, ingresa una contraseña.');
      return;
    }

    if (password.length < 6) {
      setMessage('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Las contraseñas no coinciden.');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      const { error } = await restablecerContrasena(password);

      if (error) {
        setMessage(error.message);
        return;
      }

      router.push('/?reset=success');
    } catch {
      setMessage('No se pudo conectar con Supabase. Inténtalo nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!tokenValido) {
    return (
      <main className={styles['page-shell']}>
        <section className={styles['login-card']}>
          <LoginVisual />

          <section className={styles['form-panel']} aria-labelledby="welcome-title">
            <div className={styles['form-content']}>
              <header>
                <img
                  className={styles['login-brand-logo']}
                  src="/images/sembrando-peru-logo.jfif"
                  alt="Logo de Sembrando Perú"
                />
                <h2 id="welcome-title">Restablecer contraseña</h2>
                <p>Ingresa tu nueva contraseña.</p>
              </header>

              <p className={styles['message']} role="status" style={{ color: '#c00' }}>
                {message}
              </p>

              <p className={styles['register']}>
                <a href="/olvide-contrasena" style={{ color: '#176c43', fontWeight: 700 }}>
                  Solicitar nuevo enlace
                </a>
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

  return (
    <main className={styles['page-shell']}>
      <section className={styles['login-card']}>
        <LoginVisual />

        <section className={styles['form-panel']} aria-labelledby="welcome-title">
          <div className={styles['form-content']}>
            <header>
              <img
                className={styles['login-brand-logo']}
                src="/images/sembrando-peru-logo.jfif"
                alt="Logo de Sembrando Perú"
              />
              <h2 id="welcome-title">Restablecer contraseña</h2>
              <p>Ingresa tu nueva contraseña.</p>
            </header>

            <form onSubmit={handleSubmit}>
              <div className={styles['password-grid']}>
                <div>
                  <label htmlFor="password">Nueva contraseña</label>
                  <div className={styles['input-wrap']}>
                    <span className={`${styles['input-icon']} ${styles['lock']}`} aria-hidden="true">♙</span>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="••••••••"
                      minLength="6"
                      required
                      autoComplete="new-password"
                    />
                    <button
                      className={styles['eye']}
                      type="button"
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      ◉
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="confirmPassword">Confirmar contraseña</label>
                  <div className={styles['input-wrap']}>
                    <span className={`${styles['input-icon']} ${styles['lock']}`} aria-hidden="true">♙</span>
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="••••••••"
                      minLength="6"
                      required
                      autoComplete="new-password"
                    />
                    <button
                      className={styles['eye']}
                      type="button"
                      aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      ◉
                    </button>
                  </div>
                </div>
              </div>

              <button
                className={styles['primary-button']}
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Actualizando...' : 'Actualizar contraseña'}
              </button>

              {message && <p className={styles['message']} role="status">{message}</p>}
            </form>

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