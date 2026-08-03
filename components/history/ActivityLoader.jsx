'use client';

import { useEffect, useState } from 'react';
import { getActivityById } from './historyData';

export default function ActivityLoader({ id, children }) {
  const [activity, setActivity] = useState(undefined);
  const [error, setError] = useState('');

  useEffect(() => {
    getActivityById(id).then((result) => {
      if (!result) setError('No se encontró el registro solicitado.');
      else setActivity(result);
    }).catch((loadError) => setError(loadError.message || 'No se pudo cargar el registro.'));
  }, [id]);

  if (error) return <p>{error}</p>;
  if (!activity) return <p>Cargando registro...</p>;
  return children(activity);
}
