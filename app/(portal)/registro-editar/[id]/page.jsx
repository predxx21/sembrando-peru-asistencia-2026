import { notFound } from "next/navigation";
import CorrectionForm from "@/components/history/CorregirActividad";
import { getActivityById } from "@/components/history/historyData";

export default async function RegistroEditarPage({ params }) {
  const { id } = await params;

  const activity = getActivityById(id);

  if (!activity) {
    notFound();
  }

  return <CorrectionForm activity={activity} />;
}