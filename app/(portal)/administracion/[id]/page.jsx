import { notFound } from "next/navigation";
import EvidenceReview from "@/components/admin/EvidenceReview";
import { getSubmissionById } from "@/components/admin/adminData";

export default async function EvidenceReviewPage({ params }) {
  const { id } = await params;

  const submission = getSubmissionById(id);

  if (!submission) {
    notFound();
  }

  return <EvidenceReview submission={submission} />;
}