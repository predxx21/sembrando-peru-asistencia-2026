import { supabase } from '@/lib/supabaseClient';

function formatDate(date) {
  return new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(new Date(`${date}T00:00:00`));
}

function duration(startTime, endTime) {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  return Math.max(0, (endHour * 60 + endMinute - startHour * 60 - startMinute) / 60);
}

function initials(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function mapSubmission(row) {
  const name = row.profiles?.full_name || 'Voluntario';
  const evidencePhoto = row.evidence_path
    ? supabase.storage.from('activity-evidence').getPublicUrl(row.evidence_path).data.publicUrl
    : null;

  return {
    id: row.id,
    name,
    initials: initials(name),
    avatarColor: '#287a49',
    date: formatDate(row.activity_date),
    type: row.activity_type,
    duration: `${duration(row.start_time, row.end_time)} hrs`,
    status: row.status,
    description: row.description,
    location: row.location || 'Sin ubicación registrada',
    evidencePhoto,
    evidenceFileName: row.evidence_file_name || 'Sin evidencia adjunta',
    evidenceFileSize: row.evidence_file_size ? `${(row.evidence_file_size / 1024 / 1024).toFixed(1)} MB` : '',
    coordinatorComment: row.coordinator_comment || '',
  };
}

export async function getPendingSubmissions() {
  const { data, error } = await supabase
    .from('activity_registrations')
    .select('*, profiles(full_name)')
    .eq('status', 'pendiente')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(mapSubmission);
}

export async function getSubmissionById(id) {
  const { data, error } = await supabase
    .from('activity_registrations')
    .select('*, profiles(full_name)')
    .eq('id', id)
    .single();

  if (error) return null;
  return mapSubmission(data);
}

export async function reviewSubmission(id, status, coordinatorComment) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;

  const { error } = await supabase
    .from('activity_registrations')
    .update({ status, coordinator_comment: coordinatorComment, reviewed_by: userData.user.id, reviewed_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}
