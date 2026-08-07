'use client';

import EvidenceReview from '@/components/admin/EvidenceReview';

// La vista de revisión se autogestiona: busca el registro con su propio
// fetch a /api/registros/[id] (con la signed URL de la evidencia), así que
// no necesita un wrapper que precargue los datos.
export default function EvidenceReviewPage() {
  return <EvidenceReview />;
}
