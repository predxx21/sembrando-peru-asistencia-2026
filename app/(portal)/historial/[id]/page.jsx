import { notFound } from "next/navigation";
import EvidenceViewer from "@/components/history/EvidenceViewer";
import { getActivityById } from "@/components/history/historyData";

export default async function HistorialEvidenciaPage({ params }) {
  const { id } = await params;

  const activity = getActivityById(id);

  if (!activity) {
    notFound();
  }

  return <EvidenceViewer activity={activity} />;
}