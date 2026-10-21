-- ============================================================
-- QR-ATT — Supabase schema (Final Project, Part I)
--
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> paste ALL -> Run.
-- IDEMPOTENT: safe to run on a fresh DB or on top of the midterm schema.
--
-- FIRST ADMIN (run once, after you registered that account in the app):
--   update public.profiles set role = 'admin' where email = 'you@school.edu';
-- ============================================================

-- ------------------------------------------------------------
-- 1. TABLES
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'student',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles add column if not exists id_number text;
alter table public.profiles add column if not exists section text;      -- student: course/section, teacher: department
alter table public.profiles add column if not exists is_active boolean not null default true;
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('student', 'teacher', 'admin'));

-- Backfill profiles for accounts created before the trigger existed
insert into public.profiles (id, email)
select id, coalesce(email, '') from auth.users
on conflict (id) do nothing;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  event_code text not null unique,
  title text not null,
  start_time timestamptz,
  end_time timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.events add column if not exists venue text;
alter table public.events add column if not exists description text;
alter table public.events add column if not exists status text not null default 'open';
alter table public.events drop constraint if exists events_status_check;
alter table public.events add constraint events_status_check check (status in ('open', 'closed'));
-- QR codes use a random server-generated code (not typed by hand)
alter table public.events alter column event_code
  set default ('EVT-' || upper(substr(md5(gen_random_uuid()::text), 1, 8)));
-- Relationship used by the app to show the organizer/student names
alter table public.events drop constraint if exists events_created_by_profile_fkey;
alter table public.events add constraint events_created_by_profile_fkey
  foreign key (created_by) references public.profiles (id) on delete set null;

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  scanned_at timestamptz not null default now(),
  unique (student_id, event_id)                       -- duplicate attendance prevention
);
alter table public.attendance add column if not exists status text not null default 'present';
alter table public.attendance drop constraint if exists attendance_status_check;
alter table public.attendance add constraint attendance_status_check
  check (status in ('present', 'late', 'absent', 'excused'));
alter table public.attendance drop constraint if exists attendance_student_profile_fkey;
alter table public.attendance add constraint attendance_student_profile_fkey
  foreign key (student_id) references public.profiles (id) on delete cascade;

-- System records (who did what). Filled by triggers, readable by admins only.
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  table_name text not null,
  record_id uuid,
  summary text,
  created_at timestamptz not null default now()
);

create index if not exists attendance_event_idx on public.attendance (event_id);
create index if not exists attendance_student_idx on public.attendance (student_id);
create index if not exists events_created_by_idx on public.events (created_by);

alter table public.profiles   enable row level security;
alter table public.events     enable row level security;
alter table public.attendance enable row level security;
alter table public.audit_log  enable row level security;

-- ------------------------------------------------------------
-- 2. ROLE HELPERS (security definer => no RLS recursion)
-- ------------------------------------------------------------
create or replace function public.get_my_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and is_active
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.get_my_role() = 'admin', false)
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.get_my_role() in ('teacher', 'admin'), false)
$$;

-- ------------------------------------------------------------
-- 3. ROW LEVEL SECURITY POLICIES
-- ------------------------------------------------------------
-- profiles
drop policy if exists "Profiles are viewable by owner" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Teachers can view profiles of their attendees" on public.profiles;
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_select_admin" on public.profiles;
drop policy if exists "profiles_select_teacher_attendees" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_update_admin" on public.profiles;

create policy "profiles_select_own" on public.profiles for select
  using (auth.uid() = id);
create policy "profiles_select_admin" on public.profiles for select
  using (public.is_admin());
create policy "profiles_select_teacher_attendees" on public.profiles for select
  using (exists (
    select 1 from public.attendance a
    join public.events e on e.id = a.event_id
    where a.student_id = profiles.id and e.created_by = auth.uid()
  ) and public.is_staff());
create policy "profiles_insert_own" on public.profiles for insert
  with check (auth.uid() = id and role = 'student');
create policy "profiles_update_own" on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_update_admin" on public.profiles for update
  using (public.is_admin()) with check (public.is_admin());

-- events
drop policy if exists "Events are readable by any authenticated user" on public.events;
drop policy if exists "Users can insert events" on public.events;
drop policy if exists "Users can update their own events" on public.events;
drop policy if exists "events_select_authenticated" on public.events;
drop policy if exists "events_insert_staff" on public.events;
drop policy if exists "events_update_owner" on public.events;
drop policy if exists "events_update_admin" on public.events;
drop policy if exists "events_delete_admin" on public.events;

create policy "events_select_authenticated" on public.events for select
  using (auth.role() = 'authenticated');
create policy "events_insert_staff" on public.events for insert
  with check (public.is_staff() and created_by = auth.uid());
create policy "events_update_owner" on public.events for update
  using (public.is_staff() and created_by = auth.uid())
  with check (public.is_staff() and created_by = auth.uid());
create policy "events_update_admin" on public.events for update
  using (public.is_admin()) with check (public.is_admin());
create policy "events_delete_admin" on public.events for delete
  using (public.is_admin());

-- attendance (students can NOT insert directly: they must call record_attendance())
drop policy if exists "Students can view their own attendance" on public.attendance;
drop policy if exists "Students can insert their own attendance" on public.attendance;
drop policy if exists "Teachers can view attendance for their events" on public.attendance;
drop policy if exists "attendance_select_own" on public.attendance;
drop policy if exists "attendance_select_teacher" on public.attendance;
drop policy if exists "attendance_select_admin" on public.attendance;
drop policy if exists "attendance_update_admin" on public.attendance;
drop policy if exists "attendance_delete_admin" on public.attendance;

create policy "attendance_select_own" on public.attendance for select
  using (auth.uid() = student_id);
create policy "attendance_select_teacher" on public.attendance for select
  using (public.is_staff() and exists (
    select 1 from public.events e
    where e.id = attendance.event_id and e.created_by = auth.uid()
  ));
create policy "attendance_select_admin" on public.attendance for select
  using (public.is_admin());
create policy "attendance_update_admin" on public.attendance for update
  using (public.is_admin()) with check (public.is_admin());
create policy "attendance_delete_admin" on public.attendance for delete
  using (public.is_admin());

-- audit_log
drop policy if exists "audit_select_admin" on public.audit_log;
create policy "audit_select_admin" on public.audit_log for select
  using (public.is_admin());

-- ------------------------------------------------------------
-- 4. TRIGGERS
-- ------------------------------------------------------------
-- 4a. Auto-create profile on sign-up (role whitelisted: admin can never self-register)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role, id_number, section)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    case when new.raw_user_meta_data ->> 'role' = 'teacher' then 'teacher' else 'student' end,
    nullif(trim(new.raw_user_meta_data ->> 'id_number'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'section'), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 4b. Block privilege escalation: only admins may change role / is_active.
--     (auth.uid() is null inside the SQL editor, so you can still promote the first admin there.)
create or replace function public.protect_profile_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role then
      raise exception 'Only an administrator can change roles.';
    end if;
    if new.is_active is distinct from old.is_active then
      raise exception 'Only an administrator can activate or deactivate accounts.';
    end if;
    new.email := old.email;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists protect_profile_columns on public.profiles;
create trigger protect_profile_columns
  before update on public.profiles
  for each row execute procedure public.protect_profile_columns();

-- 4c. System records
create or replace function public.log_activity()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  rec jsonb;
  info text;
begin
  if tg_op = 'DELETE' then rec := to_jsonb(old); else rec := to_jsonb(new); end if;
  info := case tg_table_name
    when 'events'     then coalesce(rec ->> 'title', '') || ' [' || coalesce(rec ->> 'status', '') || ']'
    when 'attendance' then 'status=' || coalesce(rec ->> 'status', '')
    when 'profiles'   then coalesce(rec ->> 'full_name', rec ->> 'email', '') || ' (' || coalesce(rec ->> 'role', '') ||
                           case when (rec ->> 'is_active') = 'false' then ', deactivated)' else ')' end
    else ''
  end;
  insert into public.audit_log (actor_id, action, table_name, record_id, summary)
  values (auth.uid(), tg_op, tg_table_name, (rec ->> 'id')::uuid, info);
  return null;
end;
$$;

drop trigger if exists audit_events on public.events;
create trigger audit_events after insert or update or delete on public.events
  for each row execute procedure public.log_activity();

drop trigger if exists audit_attendance on public.attendance;
create trigger audit_attendance after insert or update or delete on public.attendance
  for each row execute procedure public.log_activity();

drop trigger if exists audit_profiles_ins on public.profiles;
create trigger audit_profiles_ins after insert on public.profiles
  for each row execute procedure public.log_activity();

drop trigger if exists audit_profiles_upd on public.profiles;
create trigger audit_profiles_upd after update on public.profiles
  for each row when (old.role is distinct from new.role or old.is_active is distinct from new.is_active)
  execute procedure public.log_activity();

-- ------------------------------------------------------------
-- 5. record_attendance(): the ONLY way to record attendance.
--    Server-side validation: caller, role, QR/event, closed, time window, duplicate.
-- ------------------------------------------------------------
create or replace function public.record_attendance(p_event_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  my_role text;
  ev public.events%rowtype;
  new_id uuid;
  code text := trim(coalesce(p_event_code, ''));
begin
  if uid is null then
    return jsonb_build_object('success', false, 'code', 'unauthorized', 'message', 'Please sign in first.');
  end if;

  select role into my_role from public.profiles where id = uid and is_active;
  if my_role is null then
    return jsonb_build_object('success', false, 'code', 'unauthorized', 'message', 'Your account is not active.');
  end if;
  if my_role <> 'student' then
    return jsonb_build_object('success', false, 'code', 'forbidden', 'message', 'Only student accounts can record attendance.');
  end if;

  if code = '' or length(code) > 40 then
    return jsonb_build_object('success', false, 'code', 'invalid_qr', 'message', 'Invalid QR code.');
  end if;

  select * into ev from public.events where event_code = code;
  if not found then
    return jsonb_build_object('success', false, 'code', 'invalid_qr', 'message', 'Invalid QR code: event not found.');
  end if;

  if ev.status <> 'open' then
    return jsonb_build_object('success', false, 'code', 'closed', 'message', 'This event is closed.', 'event_title', ev.title);
  end if;
  if ev.start_time is not null and now() < ev.start_time then
    return jsonb_build_object('success', false, 'code', 'not_started', 'message', 'This event has not started yet.', 'event_title', ev.title);
  end if;
  if ev.end_time is not null and now() > ev.end_time then
    return jsonb_build_object('success', false, 'code', 'ended', 'message', 'This event has already ended.', 'event_title', ev.title);
  end if;

  insert into public.attendance (student_id, event_id, status)
  values (uid, ev.id, 'present')
  on conflict (student_id, event_id) do nothing
  returning id into new_id;

  if new_id is null then
    return jsonb_build_object('success', false, 'code', 'duplicate',
      'message', 'You already recorded attendance for this event.', 'event_title', ev.title);
  end if;

  return jsonb_build_object('success', true, 'code', 'ok', 'message', 'Attendance recorded!',
    'event_title', ev.title, 'scanned_at', now());
end;
$$;

revoke all on function public.record_attendance(text) from public, anon;
grant execute on function public.record_attendance(text) to authenticated;

-- refresh PostgREST schema cache
notify pgrst, 'reload schema';
