import { supabase } from './supabase';

export type EventStatus = 'open' | 'closed';

export type EventRow = {
  id: string;
  event_code: string;
  title: string;
  description: string | null;
  venue: string | null;
  start_time: string | null;
  end_time: string | null;
  status: EventStatus;
  created_by: string | null;
  created_at: string;
  attendee_count: number;
};

export type EventFormValues = {
  title: string;
  venue: string;
  description: string;
  start: Date;
  end: Date;
};

const SELECT = '*, attendance(count)';

function mapRow(row: any): EventRow {
  const { attendance, ...rest } = row;
  return {
    ...rest,
    status: rest.status === 'closed' ? 'closed' : 'open',
    attendee_count: attendance?.[0]?.count ?? 0,
  } as EventRow;
}

export type ListResult = { data: EventRow[]; error: string | null };

/** scope 'open' = events students can attend, 'mine' = created by user, 'all' = everything (admin). */
export async function listEvents(scope: 'open' | 'mine' | 'all', userId?: string): Promise<ListResult> {
  let query = supabase.from('events').select(SELECT).order('start_time', { ascending: false });
  if (scope === 'open') query = query.eq('status', 'open');
  if (scope === 'mine' && userId) query = query.eq('created_by', userId);

  const { data, error } = await query;
  if (error) return { data: [], error: error.message };
  return { data: (data ?? []).map(mapRow), error: null };
}

export async function getEvent(id: string): Promise<{ data: EventRow | null; error: string | null }> {
  const { data, error } = await supabase.from('events').select(SELECT).eq('id', id).maybeSingle();
  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: 'Event not found.' };
  return { data: mapRow(data), error: null };
}

export async function createEvent(
  values: EventFormValues,
  userId: string
): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from('events')
    .insert({
      title: values.title.trim(),
      venue: values.venue.trim(),
      description: values.description.trim() || null,
      start_time: values.start.toISOString(),
      end_time: values.end.toISOString(),
      status: 'open',
      created_by: userId,
    })
    .select('id')
    .single();
  return { id: data?.id ?? null, error: error?.message ?? null };
}

export async function updateEvent(
  id: string,
  values: EventFormValues
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('events')
    .update({
      title: values.title.trim(),
      venue: values.venue.trim(),
      description: values.description.trim() || null,
      start_time: values.start.toISOString(),
      end_time: values.end.toISOString(),
    })
    .eq('id', id);
  return { error: error?.message ?? null };
}

export async function setEventStatus(id: string, status: EventStatus): Promise<{ error: string | null }> {
  const { error } = await supabase.from('events').update({ status }).eq('id', id);
  return { error: error?.message ?? null };
}

export async function deleteEvent(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('events').delete().eq('id', id);
  return { error: error?.message ?? null };
}
