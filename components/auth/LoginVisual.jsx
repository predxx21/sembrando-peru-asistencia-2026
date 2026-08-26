import styles from './LoginScreen.module.css';

export default function LoginVisual() {
  return (
    <aside className={styles['visual-panel']}>
      {/* Fondo completo sin cortes ni costuras de múltiples imágenes */}
      <div className={styles['visual-hero-bg']} aria-label="Bosques y conservación ambiental en Perú" />
      <div className={styles['visual-overlay']} />
      
      {/* Texto de Marca y Propósito */}
      <div className={styles['brand-copy']}>
        
        <h1>Sistemas de Asistencia - Sembrando Perú</h1>
        <p>Transparencia, gestión de horas y trazabilidad para comunidades con propósito ambiental.</p>
      </div>

      {/* Tarjeta de Impacto Social en la parte inferior */}
      <div className={styles['impact-card']}>
        <div className={styles['impact-icon']}>🌱</div>
        <div>
          <strong>Compromiso con el Perú</strong>
          <span>Digitalizando el voluntariado e impacto ambiental en cada región.</span>
        </div>
      </div>
    </aside>
  );
}