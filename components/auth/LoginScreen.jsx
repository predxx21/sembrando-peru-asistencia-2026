'use client';

import { useState } from 'react';
import Link from 'next/link';
import LoginVisual from './LoginVisual';

export default function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    setMessage(
      email && password
        ? 'Credenciales recibidas. Bienvenido/a.'
        : 'Completa tu correo y contraseña para continuar.'
    );
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
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="ejemplo@organizacion.org"
                />
              </div>

              <div className="password-label">
                <label htmlFor="password">Contraseña</label>
                <a href="#recover">¿Olvidaste tu contraseña?</a>
              </div>
              <div className="input-wrap">
                <span className="input-icon lock" aria-hidden="true">♙</span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                />
                <button className="eye" type="button" aria-label="Mostrar contraseña" onClick={() => setShowPassword(!showPassword)}>◉</button>
              </div>

              <label className="remember"><input type="checkbox" /><span>Recordar sesión</span></label>
              <button className="primary-button" type="submit">Iniciar sesión</button>
              {message && <p className="message" role="status">{message}</p>}
            </form>

            <div className="divider"><span /><b>o</b><span /></div>
            <button className="google-button" type="button"><strong>G</strong> Continuar con Google</button>
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
