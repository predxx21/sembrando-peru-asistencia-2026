'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { isOrganizationEmail } from '@/lib/auth/email';
import { supabase } from '@/lib/supabase/client';

export default function RegisterScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState('voluntario');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleUser, setGoogleUser] = useState(null);

  useEffect(() => {
    async function loadGoogleUser() {
      const isGoogleRegistration = new URLSearchParams(window.location.search).get('google') === '1';
      if (!isGoogleRegistration) return;

      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!user || !isOrganizationEmail(user.email)) {
        setMessage('No se encontró una cuenta de Google institucional para completar el registro.');
        return;
      }

      setGoogleUser({
        email: user.email,
        fullName: user.user_metadata.full_name || user.user_metadata.name || user.email.split('@')[0],
      });
    }

    loadGoogleUser();
  }, []);

  async function handleGoogleRegistration() {
    setIsSubmitting(true);
    setMessage('');

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?mode=registro`,
        queryParams: { hd: 'sembrandoperu.org' },
        data: { profile_type: profile },
      },
    });

    if (error) {
      setMessage(error.message);
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get('password'));
    const confirmPassword = String(formData.get('confirmPassword'));

    if (!googleUser && password !== confirmPassword) {
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
      if (googleUser) {
        const { error } = await supabase.auth.updateUser({
          data: {
            full_name: googleUser.fullName,
            profile_type: profile,
          },
        });

        if (error) {
          setMessage(error.message);
          return;
        }

        router.push('/principal');
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: String(formData.get('email')).trim(),
        password,
        options: {
          data: {
            full_name: String(formData.get('fullName')).trim(),
            profile_type: profile,
          },
        },
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      event.currentTarget.reset();
      setMessage(data.session ? 'Cuenta creada correctamente. Ya puedes iniciar sesión.' : 'Cuenta creada. Revisa tu correo para confirmar tu registro.');
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

          <button className="register-google" type="button" onClick={handleGoogleRegistration} disabled={isSubmitting}><strong>G</strong> Registrarse con Google</button>
          <div className="register-divider"><span /><b>o usa tu correo</b><span /></div>

          <fieldset>
            <legend>Tipo de perfil</legend>
            <div className="profile-options">
              <button type="button" className={profile === 'voluntario' ? 'profile-option active' : 'profile-option'} onClick={() => setProfile('voluntario')}><span>♧</span>Voluntario</button>
              <button type="button" className={profile === 'coordinador' ? 'profile-option active' : 'profile-option'} onClick={() => setProfile('coordinador')}><span>♟</span>Coordinador</button>
            </div>
          </fieldset>

          <label htmlFor="name">Nombre completo</label>
          {googleUser ? <input id="name" name="fullName" required value={googleUser.fullName} readOnly /> : <input id="name" name="fullName" required placeholder="Ej. Juan Pérez" />}
          <label htmlFor="register-email">Correo electrónico</label>
          {googleUser ? <input id="register-email" name="email" type="email" required value={googleUser.email} readOnly /> : <input id="register-email" name="email" type="email" required pattern=".+@sembrandoperu\.org" title="Usa un correo @sembrandoperu.org" placeholder="nombre@sembrandoperu.org" />}
          {!googleUser && <div className="password-grid">
            <div><label htmlFor="new-password">Contraseña</label><input id="new-password" name="password" type="password" minLength="6" required placeholder="••••••••" /></div>
            <div><label htmlFor="confirm-password">Confirmar contraseña</label><input id="confirm-password" name="confirmPassword" type="password" minLength="6" required placeholder="••••••••" /></div>
          </div>}

          <label className="terms"><input type="checkbox" required />Acepto los <a href="#terms">Términos y condiciones</a> y la <a href="#privacy">Política de privacidad</a> de Sembrando Perú.</label>
          <button className="create-account" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creando cuenta...' : googleUser ? 'Completar registro' : 'Crear cuenta'}</button>
          {message && <p className="register-message" role="status">{message}</p>}
        </form>
      </section>

      <footer className="register-footer">© 2026 Sembrando Perú. Todos los derechos reservados.</footer>
    </main>
  );
}
