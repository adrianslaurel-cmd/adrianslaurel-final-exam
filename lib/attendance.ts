import { supabase } from './supabase';
import { parseQRPayload } from './qr';

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused';
export const ATTENDANCE_STATUSES: AttendanceStatus[] = ['present', 'late', 'absent', 'excused'];

export type RegisterCode =
  | 'ok'
  | 'invalid_qr'
  | 'duplicate'
  | 'closed'
  | 'not_started'
  | 'ended'
  | 'unauthorized'
  | 'forbidden'
  | 'error';

export type RegisterResult = {
  success: boolean;
  code: RegisterCode;
  message: string;
  eventTitle?: string;
  scannedAt?: string;
};

/** Validates the scanned text locally, then asks the database to validate + record. */
export async function recordAttendance(rawPayload: string): Promise<RegisterResult> {
  const parsed = parseQRPayload(rawPayload);
  if (!parsed.ok) {
    return { success: false, code: 'invalid_qr', message: parsed.message };
  }

  const { data, error } = await supabase.rpc('record_attendance', {
    p_event_code: parsed.payload.event,
  });

  if (error || !data) {
    return {
      success: false,
      code: 'error',
      message: error?.message ?? 'Could not record attendance. Check your connection and try again.',
    };
  }

  return {
    success: !!data.success,
    code: (data.code ?? 'error') as RegisterCode,
    message: data.message ?? '',
    eventTitle: data.event_title ?? undefined,
    scannedAt: data.scanned_at ?? undefined,
  };
}

// ---------------- Student: own history ----------------

export type MyAttendance = {
  id: string;
  status: AttendanceStatus;
  scannedAt: string;
  eventId: string;
  eventTitle: string;
  eventCode: string;
  venue: string | null;
};

export async function getMyAttendance(
  studentId: string
): Promise<{ data: MyAttendance[]; error: string | null }> {
  const { data, error } = await supabase
    .from('attendance')
    .select('id, status, scanned_at, events ( id, event_code, title, venue )')
    .eq('student_id', studentId)
    .order('scanned_at', { ascending: false });

  if (error) return { data: [], error: error.message };
  return {
    data: (data ?? []).map((row: any) => ({
      id: row.id,
      status: row.status ?? 'present',
      scannedAt: row.scanned_at,
      eventId: row.events?.id ?? '',
      eventTitle: row.events?.title ?? 'Deleted event',
      eventCode: row.events?.event_code ?? '',
      venue: row.events?.venue ?? null,
    })),
    error: null,
  };
}

// ---------------- Teacher / Admin: records ----------------

export type StaffAttendance = {
  id: string;
  status: AttendanceStatus;
  scannedAt: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  idNumber: string | null;
  section: string | null;
  eventId: string;
  eventTitle: string;
};

const STUDENT_EMBED =
  'student:profiles!attendance_student_profile_fkey ( id, full_name, email, id_number, section )';

function mapStaffRow(row: any): StaffAttendance {
  return {
    id: row.id,
    status: row.status ?? 'present',
    scannedAt: row.scanned_at,
    studentId: row.student_id,
    studentName: row.student?.full_name || row.student?.email || 'Unknown student',
    studentEmail: row.student?.email ?? '',
    idNumber: row.student?.id_number ?? null,
    section: row.student?.section ?? null,
    eventId: row.event_id,
    eventTitle: row.events?.title ?? '',
  };
}

/** RLS decides what comes back: teachers get their own events, admins get everything. */
export async function getStaffAttendance(
  limit = 300
): Promise<{ data: StaffAttendance[]; error: string | null }> {
  const { data, error } = await supabase
    .from('attendance')
    .select(`id, status, scanned_at, student_id, event_id, events ( title ), ${STUDENT_EMBED}`)
    .order('scanned_at', { ascending: false })
    .limit(limit);

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []).map(mapStaffRow), error: null };
}

export async function getEventAttendance(
  eventId: string
): Promise<{ data: StaffAttendance[]; error: string | null }> {
  const { data, error } = await supabase
    .from('attendance')
    .select(`id, status, scanned_at, student_id, event_id, ${STUDENT_EMBED}`)
    .eq('event_id', eventId)
    .order('scanned_at', { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []).map(mapStaffRow), error: null };
}

/** Did this student already attend this event? (used on the student event screen) */
export async function getMyAttendanceForEvent(
  studentId: string,
  eventId: string
): Promise<{ status: AttendanceStatus; scannedAt: string } | null> {
  const { data } = await supabase
    .from('attendance')
    .select('status, scanned_at')
    .eq('student_id', studentId)
    .eq('event_id', eventId)
    .maybeSingle();
  return data ? { status: data.status ?? 'present', scannedAt: data.scanned_at } : null;
}

// ---------------- Admin: correct records ----------------

export async function updateAttendanceStatus(
  id: string,
  status: AttendanceStatus
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('attendance').update({ status }).eq('id', id);
  return { error: error?.message ?? null };
}

export async function deleteAttendance(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('attendance').delete().eq('id', id);
  return { error: error?.message ?? null };
}
