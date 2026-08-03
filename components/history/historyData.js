import { supabase } from '@/lib/supabaseClient';

function formatDate(date) {
  return new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(new Date(`${date}T00:00:00`));
}

function hours(startTime, endTime) {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  return Math.max(0, Math.round(((endHour * 60 + endMinute - startHour * 60 - startMinute) / 60) * 10) / 10);
}

function mapActivity(row) {
  const evidencePhoto = row.evidence_path
    ? supabase.storage.from('activity-evidence').getPublicUrl(row.evidence_path).data.publicUrl
    : null;

  return {
    id: row.id,
    title: row.activity_type,
    description: row.description,
    date: formatDate(row.activity_date),
    isoDate: row.activity_date,
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
    hours: hours(row.start_time, row.end_time),
    type: row.activity_type,
    status: row.status,
    evidencePhoto,
    evidenceFileName: row.evidence_file_name || 'Sin evidencia adjunta',
    location: row.location || 'Sin ubicación registrada',
    coordinatorComment: row.coordinator_comment || '',
    reviewedBy: '',
  };
}

export async function getHistoryActivities() {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) return [];

  const { data, error } = await supabase
    .from('activity_registrations')
    .select('*')
    .eq('user_id', userData.user.id)
    .order('activity_date', { ascending: false });

  if (error) throw error;
  return data.map(mapActivity);
}

export async function getActivityById(id) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return null;

  const { data, error } = await supabase
    .from('activity_registrations')
    .select('*')
    .eq('id', id)
    .eq('user_id', userData.user.id)
    .single();

  if (error) return null;
  return mapActivity(data);
}
