import { notFound } from "next/navigation";
import CorrectionForm from "@/components/history/CorrectionForm";
import { getActivityById } from "@/components/history/historyData";

export default function RegistroEditarPage({ params }) {
  const activity = getActivityById(params.id);

  if (!activity) {
    notFound();
  }

  return <CorrectionForm activity={activity} />;
}
