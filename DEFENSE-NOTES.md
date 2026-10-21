# QR-ATT — Defense Notes (Individual Final Project)

## 1. Purpose
School event attendance using QR codes. Teachers/admins create events and show a QR code; students scan it with their phone and the system validates and records attendance.

## 2. Event-driven programming — Event → Handler → Action → Result
| # | Event | Handler (file) | Action | Result |
|---|---|---|---|---|
| 1 | User presses **Sign In** | `handleLogin` — `app/login.tsx` | validate input → `supabase.auth.signInWithPassword` | session stored securely, redirected to tabs; wrong login shows error |
| 2 | **App starts / auth state changes** (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED) | `initAuth` + `onAuthStateChange` — `lib/auth.ts` | restore session, load profile/role | role-based tabs appear; guard redirects to login if no session |
| 3 | User presses **Sign Up** | `handleRegister` — `app/register.tsx` | validate → `auth.signUp` with metadata → DB trigger `handle_new_user` creates profile | account + profile created |
| 4 | **Event is created** (Create Event pressed) | `handleSave` — `app/event/form.tsx` | validate → insert into `events` (DB generates `event_code`) | event saved, QR screen opens |
| 5 | **Event status changes** (Close / Reopen pressed) | `toggleStatus` — `app/event/[id].tsx` | `update events set status` | QR disabled; scans now return “Event closed” |
| 6 | **QR scanner detects a QR code** | `handleBarcodeScanned` — `app/(tabs)/scan.tsx` | lock scanner → `recordAttendance` → RPC `record_attendance` | success / duplicate / closed / invalid result card |
| 7 | **Invalid QR detected** | `parseQRPayload` (`lib/qr.ts`) + RPC | reject before/after DB check | “Invalid QR code” feedback |
| 8 | **Duplicate attendance detected** | RPC `record_attendance` (`unique(student_id,event_id)` + `on conflict do nothing`) | no new row | “You already recorded attendance” |
| 9 | **Database record inserted** | trigger `log_activity` (DB) | write to `audit_log` | admin sees it under *System Records* |
| 10 | Admin taps a **status chip** | `changeStatus` — `components/StaffAttendance.tsx` | `update attendance set status` | record corrected |
| 11 | Admin changes **role / deactivates** | `changeRole`, `toggleActive` — `app/(tabs)/users.tsx` | `update profiles` (trigger allows admins only) | role/access changes; deactivated user is signed out at next login |
| 12 | **Screen focused / pull-to-refresh** | `useLoader` — `lib/useLoader.ts` | refetch | data refreshed |
| 13 | User presses **Sign Out** | `handleSignOut` — `app/(tabs)/profile.tsx` | `signOut({scope:'local'})`, clear secure storage | back to login |

## 3. Database (Supabase / PostgreSQL)
- `profiles` (1:1 with `auth.users`): full_name, role (`student|teacher|admin`), id_number, section, is_active
- `events`: event_code (unique, DB-generated), title, venue, description, start_time, end_time, **status** (`open|closed`), `created_by → profiles`
- `attendance`: `student_id → profiles`, `event_id → events`, scanned_at, **status** (`present|late|absent|excused`), **unique(student_id, event_id)**
- `audit_log`: actor, action, table, summary (written by triggers, admin-read only)

Relationships: profiles 1—N events (creator) · profiles 1—N attendance · events 1—N attendance (cascade delete).

## 4. Authentication & authorization
- Auth: Supabase Auth (email + password, hashed server-side). Session stored in **SecureStore** (chunked), auto-refresh only while app is active, proper logout.
- Authorization is enforced **in the database** with RLS, not only in the UI:
  - Students: read own attendance only; **cannot insert attendance directly** (only via `record_attendance()`).
  - Teachers: create/update **their own** events; read attendance of their events.
  - Admins: full read/update/delete (users, events, attendance, audit log).
  - Trigger `protect_profile_columns` blocks anyone but an admin from changing `role` / `is_active` (prevents self-promotion).
  - `handle_new_user` whitelists role → `admin` can never be chosen at registration.
- UI guards: `RoleGate`, role-based tabs, route guard in `app/_layout.tsx` (also covers `/event/*`).

## 5. Validation (what is blocked and where)
| Case | Where |
|---|---|
| Duplicate attendance | DB unique constraint + RPC |
| Closed event | RPC (`status <> 'open'`) |
| Event not started / already ended | RPC (time window) |
| Invalid / forged QR | `parseQRPayload` + RPC (`event_code` must exist) |
| Unauthorized recording (teacher/admin/inactive/not signed in) | RPC role check |
| Input validation (email, password ≥8 letters+digits, names, event dates) | `lib/validation.ts` |

## 6. Possible “modify during defense” questions
- Add a field to events → `schema.sql` (alter table), `lib/events.ts`, `app/event/form.tsx`, `app/event/[id].tsx`.
- Change the allowed scan window → function `record_attendance` in `schema.sql`.
- Change the status list → `attendance_status_check` + `ATTENDANCE_STATUSES` in `lib/attendance.ts`.
