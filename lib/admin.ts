import { supabase } from './supabase';

export type Overview = {
  students: number;
  teachers: number;
  admins: number;
  openEvents: number;
  closedEvents: number;
  attendanceRecords: number;
};

async function count(table: string, filter?: (q: any) => any): Promise<number> {
  let q: any = supabase.from(table).select('*', { count: 'exact', head: true });
  if (filter) q = filter(q);
  const { count: c } = await q;
  return c ?? 0;
}

export async function getOverview(): Promise<Overview> {
  const [students, teachers, admins, openEvents, closedEvents, attendanceRecords] = await Promise.all([
    count('profiles', (q) => q.eq('role', 'student')),
    count('profiles', (q) => q.eq('role', 'teacher')),
    count('profiles', (q) => q.eq('role', 'admin')),
    count('events', (q) => q.eq('status', 'open')),
    count('events', (q) => q.eq('status', 'closed')),
    count('attendance'),
  ]);
  return { students, teachers, admins, openEvents, closedEvents, attendanceRecords };
}

export type AuditEntry = {
  id: string;
  action: string;
  tableName: string;
  summary: string;
  actor: string;
  createdAt: string;
};

export async function getAuditLog(limit = 30): Promise<AuditEntry[]> {
  const { data, error } = await supabase
    .from('audit_log')
    .select('id, action, table_name, summary, created_at, actor:profiles ( full_name, email )')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id,
    action: r.action,
    tableName: r.table_name,
    summary: r.summary ?? '',
    actor: r.actor?.full_name || r.actor?.email || 'System',
    createdAt: r.created_at,
  }));
}
