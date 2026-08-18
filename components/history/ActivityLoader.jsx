'use client';

import { useEffect, useState } from 'react';
import { getActivityById } from './historyData';
import styles from './Loaders.module.css';

export default function ActivityLoader({ id, children }) {
  const [activity, setActivity] = useState(undefined);
  const [error, setError] = useState('');

  useEffect(() => {
    getActivityById(id).then((result) => {
      if (!result) setError('No se encontró el registro solicitado.');
      else setActivity(result);
    }).catch((loadError) => setError(loadError.message || 'No se pudo cargar el registro.'));
  }, [id]);

  if (error) return <div className={styles.errorContainer}>{error}</div>;
  if (!activity) return (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingSpinner} aria-hidden="true"></div>
      <p className={styles.loadingText}>Cargando registro...</p>
    </div>
  );
  return children(activity);
}
