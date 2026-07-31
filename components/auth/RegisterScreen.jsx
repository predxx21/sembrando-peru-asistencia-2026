'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function RegisterScreen() {
  const [profile, setProfile] = useState('voluntario');
  const [message, setMessage] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    setMessage('Cuenta creada correctamente. Revisa tu correo para continuar.');
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

          <button className="register-google" type="button"><strong>G</strong> Registrarse con Google</button>
          <div className="register-divider"><span /><b>o usa tu correo</b><span /></div>

          <fieldset>
            <legend>Tipo de perfil</legend>
            <div className="profile-options">
              <button type="button" className={profile === 'voluntario' ? 'profile-option active' : 'profile-option'} onClick={() => setProfile('voluntario')}><span>♧</span>Voluntario</button>
              <button type="button" className={profile === 'coordinador' ? 'profile-option active' : 'profile-option'} onClick={() => setProfile('coordinador')}><span>♟</span>Coordinador</button>
            </div>
          </fieldset>

          <label htmlFor="name">Nombre completo</label>
          <input id="name" required placeholder="Ej. Juan Pérez" />
          <label htmlFor="register-email">Correo electrónico</label>
          <input id="register-email" type="email" required placeholder="nombre@ejemplo.com" />
          <div className="password-grid">
            <div><label htmlFor="new-password">Contraseña</label><input id="new-password" type="password" required placeholder="••••••••" /></div>
            <div><label htmlFor="confirm-password">Confirmar contraseña</label><input id="confirm-password" type="password" required placeholder="••••••••" /></div>
          </div>

          <label className="terms"><input type="checkbox" required />Acepto los <a href="#terms">Términos y condiciones</a> y la <a href="#privacy">Política de privacidad</a> de Sembrando Perú.</label>
          <button className="create-account" type="submit">Crear cuenta</button>
          {message && <p className="register-message" role="status">{message}</p>}
        </form>
      </section>

      <footer className="register-footer">© 2026 Sembrando Perú. Todos los derechos reservados.</footer>
    </main>
  );
}
