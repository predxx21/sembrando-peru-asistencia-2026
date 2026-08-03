import styles from "./PanelVoluntario.module.css";

const activities = [
  {
    id: 1,
    date: "Oct 24, 2023",
    title: "Apoyo en Comedor Comunitario",
    type: "Trabajo de Campo",
    hours: 4.5,
    status: "Aprobado",
  },
  {
    id: 2,
    date: "Oct 22, 2023",
    title: "Gestión de Inventario",
    type: "Administración",
    hours: 3,
    status: "Pendiente",
  },
  {
    id: 3,
    date: "Oct 20, 2023",
    title: "Sesión de Mentoría Juvenil",
    type: "Trabajo de Campo",
    hours: 5,
    status: "Aprobado",
  },
];

export default function VolunteerDashboard() {
  const totalHours = activities.reduce(
    (total, activity) => total + activity.hours,
    0
  );

  const approvedHours = activities
    .filter((activity) => activity.status === "Aprobado")
    .reduce((total, activity) => total + activity.hours, 0);

  const pendingHours = activities
    .filter((activity) => activity.status === "Pendiente")
    .reduce((total, activity) => total + activity.hours, 0);

  return (
    <div className={styles.dashboard}>
      {/* Bienvenida */}
      <header className={styles.welcome}>
        <div>
          <h1>Bienvenido de nuevo, Alex</h1>

          <p>
            Aquí tienes un resumen de tus contribuciones de
            voluntariado este mes.
          </p>
        </div>

      </header>

      {/* Estadísticas */}
      <section className={styles.stats}>
        <article className={styles.statCard}>
          <div className={styles.statCardHead}>
            <span>Total de horas</span>
            <b>◷</b>
          </div>

          <h2>{totalHours.toFixed(1)}</h2>

          <p>Total registrado desde el ingreso</p>
        </article>

        <article className={styles.statCard}>
          <div className={styles.statCardHead}>
            <span>Aprobadas</span>
            <b>✿</b>
          </div>

          <h2>{approvedHours.toFixed(1)}</h2>

          <p>Horas de voluntariado verificadas</p>
        </article>

        <article className={styles.statCard}>
          <div className={styles.statCardHead}>
            <span>Pendientes</span>
            <b>⌛</b>
          </div>

          <h2>{pendingHours.toFixed(1)}</h2>

          <p>Esperando revisión del coordinador</p>
        </article>
      </section>

      {/* Actividades y guía */}
      <section className={styles.portalGrid}>
        <div>
          <div className={styles.sectionTitle}>
            <h2>Actividad Reciente</h2>

            <span>Ver Todo ›</span>
          </div>

          <div className={styles.tableCard}>
            {/* Encabezado */}
            <div
              className={`${styles.activityRow} ${styles.activityRowHead}`}
            >
              <span>Fecha</span>
              <span>Tipo de actividad</span>
              <span>Horas</span>
              <span>Estado</span>
              <span>Acción</span>
            </div>

            {/* Actividades */}
            {activities.map((activity) => (
              <div
                className={styles.activityRow}
                key={activity.id}
              >
                <span>{activity.date}</span>

                <span>
                  <strong>{activity.title}</strong>
                  <small>{activity.type}</small>
                </span>

                <span>
                  {activity.hours.toFixed(1)} hrs
                </span>

                <span>
                  <i
                    className={`${styles.badge} ${
                      activity.status === "Aprobado"
                        ? styles.badgeSuccess
                        : styles.badgePending
                    }`}
                  >
                    {activity.status}
                  </i>
                </span>

                <span>◉</span>
              </div>
            ))}
          </div>
        </div>

        {/* Guía de evidencia */}
        <aside className={styles.evidenceColumn}>
          <h2>Guía de Evidencia</h2>

          <article className={styles.guideCard}>
            <div className={styles.guideCardImage} />

            <div className={styles.guideCardBody}>
              <h3>Consejo de Registro</h3>

              <p>
                Adjunta siempre una foto de tu planilla o una
                firma de tu supervisor para una aprobación más
                rápida.
              </p>

              <button type="button">
                Saber más
              </button>
            </div>
          </article>

          <article className={styles.tagsCard}>
            <span>Etiquetas de actividad</span>

            <div>
              <i>Trabajo de Campo</i>
              <i>Administración</i>
              <i>Mentoría</i>
              <i>Evento</i>
            </div>
          </article>
        </aside>
      </section>
    </div>
  );
}