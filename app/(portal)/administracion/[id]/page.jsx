'use client';

import { useParams } from 'next/navigation';
import EvidenceReview from '@/components/admin/EvidenceReview';
import SubmissionLoader from '@/components/admin/SubmissionLoader';

export default function EvidenceReviewPage() {
  const { id } = useParams();
  return <SubmissionLoader id={id}>{(submission) => <EvidenceReview submission={submission} />}</SubmissionLoader>;
}
