import { supabase } from './supabase';

export type Role = 'student' | 'teacher' | 'admin';

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  id_number: string | null;
  section: string | null;
  is_active: boolean;
  created_at: string;
};

const COLUMNS = 'id, email, full_name, role, id_number, section, is_active, created_at';

function normalize(p: any): Profile {
  return {
    ...p,
    role: ['student', 'teacher', 'admin'].includes(p?.role) ? p.role : 'student',
    is_active: p?.is_active ?? true,
    id_number: p?.id_number ?? null,
    section: p?.section ?? null,
  } as Profile;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(COLUMNS)
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return normalize(data);
}

/** Users can edit only their own name / ID number / section (role is protected by a DB trigger). */
export async function updateProfile(
  userId: string,
  updates: { full_name?: string; id_number?: string | null; section?: string | null }
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
  return { error: error?.message ?? null };
}

// ---------------- Administrator: user management ----------------

export async function listProfiles(): Promise<{ data: Profile[]; error: string | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .select(COLUMNS)
    .order('created_at', { ascending: false });
  if (error) return { data: [], error: error.message };
  return { data: (data ?? []).map(normalize), error: null };
}

export async function setUserRole(userId: string, role: Role): Promise<{ error: string | null }> {
  const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
  return { error: error?.message ?? null };
}

export async function setUserActive(userId: string, active: boolean): Promise<{ error: string | null }> {
  const { error } = await supabase.from('profiles').update({ is_active: active }).eq('id', userId);
  return { error: error?.message ?? null };
}
