'use client';

import { useParams } from 'next/navigation';
import CorrectionForm from '@/components/history/CorregirActividad';
import ActivityLoader from '@/components/history/ActivityLoader';

export default function RegistroEditarPage() {
  const { id } = useParams();
  return <ActivityLoader id={id}>{(activity) => <CorrectionForm activity={activity} />}</ActivityLoader>;
}
