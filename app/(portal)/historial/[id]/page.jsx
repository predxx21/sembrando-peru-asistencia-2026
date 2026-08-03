'use client';

import { useParams } from 'next/navigation';
import EvidenceViewer from '@/components/history/VerEvidencia';
import ActivityLoader from '@/components/history/ActivityLoader';

export default function HistorialEvidenciaPage() {
  const { id } = useParams();
  return <ActivityLoader id={id}>{(activity) => <EvidenceViewer activity={activity} />}</ActivityLoader>;
}
