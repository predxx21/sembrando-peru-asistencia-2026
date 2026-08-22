'use client';

import { useParams } from 'next/navigation';
import VerDetalle from '@/components/history/VerDetalle';
import ActivityLoader from '@/components/history/ActivityLoader';

export default function HistorialDetallePage() {
  const { id } = useParams();
  return <ActivityLoader id={id}>{(activity) => <VerDetalle activity={activity} />}</ActivityLoader>;
}