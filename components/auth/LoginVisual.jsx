function GardenImage() {
  return <div className="photo-tile" aria-label="Voluntarios trabajando en un huerto comunitario"><div className="photo-wash" /></div>;
}

export default function LoginVisual() {
  return (
    <aside className="visual-panel">
      <div className="image-grid">{Array.from({ length: 8 }, (_, index) => <GardenImage key={index} />)}</div>
      <div className="brand-copy">
        <h1>Sistemas de Asistencia - Sembrando Perú</h1>
        <p>Gestión de asistencia y transparencia, para comunidades con propósito.</p>
      </div>
    </aside>
  );
}
