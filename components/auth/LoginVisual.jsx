import styles from './LoginScreen.module.css';

export default function LoginVisual() {
  return (
    <aside className={styles['visual-panel']}>
      <div className={styles['visual-collage']} aria-label="Bosques y conservación ambiental en Perú">
        <div className={styles['forest-image']} />
        <div className={styles['reforestation-image']} />
        <div className={styles['collage-shade']} />
      </div>
      <div className={styles['brand-copy']}>
        <h1>Sistemas de Asistencia - Sembrando Perú</h1>
        <p>Gestión de asistencia y transparencia, para comunidades con propósito.</p>
      </div>
    </aside>
  );
}