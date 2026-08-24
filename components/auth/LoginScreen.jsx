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
      const { data, error } = await loginUser(email, password);

      if (error) {
        setMessage(error.message);
        return;
      }

      const rol = await obtenerRolActual();
      router.push(rutaPorRol(rol));
    } catch {
      setMessage('No se pudo conectar con Supabase. Inténtalo nuevamente.');
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
            <header>
              <img
                className={styles['login-brand-logo']}
                src="/images/sembrando-peru-logo.jfif"
                alt="Logo de Sembrando Perú"
              />
              <h2 id="welcome-title">Bienvenido a Sembrando Perú - Asistencia</h2>
              <p>Ingresa tus credenciales para gestionar tus actividades de voluntariado.</p>
            </header>

            <form onSubmit={handleSubmit}>
              <label htmlFor="email">Correo electrónico</label>
              <div className={styles['input-wrap']}>
                <span className={styles['input-icon']} aria-hidden="true">✉</span>
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

              <div className={styles['password-label']}>
                <label htmlFor="password">Contraseña</label>
                <a href="/olvide-contrasena">¿Olvidaste tu contraseña?</a>
              </div>
              <div className={styles['input-wrap']}>
                <span className={`${styles['input-icon']} ${styles['lock']}`} aria-hidden="true">♙</span>
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
                  aria-label="Mostrar contraseña"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  ◉
                </button>
              </div>

              <label className={styles['remember']}>
                <input type="checkbox" />
                <span>Recordar sesión</span>
              </label>

              <button
                className={styles['primary-button']}
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Ingresando...' : 'Iniciar sesión'}
              </button>

              {message && <p className={styles['message']} role="status">{message}</p>}
            </form>

            <p className={styles['register']}>
              ¿No tienes una cuenta? <Link href="/registro">Regístrate aquí</Link>
            </p>

            <button className={styles['access-button']} type="button">
              <span>♧</span> Solicitar acceso
            </button>
            <p className={styles['request-note']}>
              Para nuevas organizaciones que desean digitalizar su impacto social.
            </p>
          </div>

          <footer>
            <a href="#terms">Términos</a>
            <a href="#privacy">Privacidad</a>
            <a href="#help">Ayuda</a>
          </footer>
        </section>
      </section>
    </main>
  );
}