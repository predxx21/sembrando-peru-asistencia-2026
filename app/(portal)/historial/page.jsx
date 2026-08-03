import HistoryDashboard from "@/components/history/ListadoHistorial";
import { historyActivities } from "@/components/history/historyData";

export default function HistorialPage() {
  // Aquí luego reemplazarás con datos reales desde Supabase
  const activities = historyActivities;

  return <HistoryDashboard activities={activities} />;
}