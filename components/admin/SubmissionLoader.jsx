'use client';

import { useEffect, useState } from 'react';
import { getSubmissionById } from './adminData';

export default function SubmissionLoader({ id, children }) {
  const [submission, setSubmission] = useState(undefined);
  const [error, setError] = useState('');

  useEffect(() => {
    getSubmissionById(id).then((result) => {
      if (!result) setError('No se encontró la evidencia solicitada.');
      else setSubmission(result);
    }).catch((loadError) => setError(loadError.message || 'No se pudo cargar la evidencia.'));
  }, [id]);

  if (error) return <p>{error}</p>;
  if (!submission) return <p>Cargando evidencia...</p>;
  return children(submission);
}
