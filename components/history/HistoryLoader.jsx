'use client';

import { useEffect, useState } from 'react';
import { getHistoryActivities } from './historyData';
import HistoryDashboard from './ListadoHistorial';

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

  if (error) return <p>{error}</p>;
  if (!loaded) return <p>Cargando historial...</p>;
  return <HistoryDashboard activities={activities} />;
}
