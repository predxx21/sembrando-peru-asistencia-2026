'use client';

import { useEffect, useState } from 'react';
import { getHistoryActivities } from './historyData';
import HistoryDashboard from './ListadoHistorial';
import styles from './Loaders.module.css';

export default function HistoryLoader() {
  const [activities, setActivities] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getHistoryActivities()
      .then(setActivities)
      .catch((loadError) => setError(loadError.message || 'No se pudo cargar el historial.'))
      .finally(() => setLoaded(true));
  }, []);

  if (error) return <div className={styles.errorContainer}>{error}</div>;
  if (!loaded) return (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingSpinner} aria-hidden="true"></div>
      <p className={styles.loadingText}>Cargando historial...</p>
    </div>
  );
  return <HistoryDashboard activities={activities} />;
}
