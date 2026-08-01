import { notFound } from "next/navigation";
import EvidenceViewer from "@/components/history/EvidenceViewer";
import { getActivityById } from "@/components/history/historyData";

export default function HistorialEvidenciaPage({ params }) {
  const activity = getActivityById(params.id);

  if (!activity) {
    notFound();
  }

  return <EvidenceViewer activity={activity} />;
}
