import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';

import { getProfile, type Profile, type Role } from './profiles';
import { supabase } from './supabase';

type AuthState = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: Role;
  loading: boolean;
  notice: string | null;
};

// Tiny global store (no extra dependency). Components re-render through `listeners`.
let globalSession: Session | null = null;
let globalProfile: Profile | null = null;
let authLoading = true; // true until the stored session has been read
let profileLoading = false;
let globalNotice: string | null = null;
let currentProfileUserId: string | null = null;
let initialized = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

async function loadProfileFor(userId: string) {
  profileLoading = true;
  notify();
  const profile = await getProfile(userId);
  // user may have changed/logged out while we were waiting
  if (currentProfileUserId !== userId) return;

  if (profile && profile.is_active === false) {
    globalNotice = 'Your account has been deactivated. Please contact an administrator.';
    await signOut();
    return;
  }
  globalProfile = profile;
  profileLoading = false;
  notify();
}

function applySession(session: Session | null) {
  globalSession = session;
  authLoading = false;
  const userId = session?.user?.id ?? null;

  if (!userId) {
    currentProfileUserId = null;
    globalProfile = null;
    profileLoading = false;
    notify();
    return;
  }
  if (userId !== currentProfileUserId) {
    currentProfileUserId = userId;
    globalProfile = null;
    loadProfileFor(userId);
  }
  notify();
}

/** Call once at app start: restores the saved session and listens for auth events. */
export function initAuth() {
  if (initialized) return;
  initialized = true;
  supabase.auth
    .getSession()
    .then(({ data }) => applySession(data.session))
    .catch(() => applySession(null));
  // EVENT: Supabase fires SIGNED_IN / SIGNED_OUT / TOKEN_REFRESHED
  supabase.auth.onAuthStateChange((_event, session) => {
    applySession(session);
  });
}

export async function refreshProfile() {
  if (!currentProfileUserId) return;
  await loadProfileFor(currentProfileUserId);
}

export function clearNotice() {
  globalNotice = null;
  notify();
}

export function useAuth(): AuthState {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const listener = () => forceRender((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const loading = authLoading || (!!globalSession && profileLoading && !globalProfile);
  return {
    session: globalSession,
    user: globalSession?.user ?? null,
    profile: globalProfile,
    role: globalProfile?.role ?? 'student', // least privilege fallback (server enforces anyway)
    loading,
    notice: globalNotice,
  };
}

export type SignUpProfile = {
  full_name: string;
  role: 'student' | 'teacher';
  id_number?: string;
  section?: string;
};

export async function signUp(email: string, password: string, profile: SignUpProfile) {
  // The profile row is created by the DB trigger handle_new_user() from this metadata.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { ...profile } },
  });
  return { data, error };
}

export async function signIn(email: string, password: string) {
  globalNotice = null;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function signOut() {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // even if the network call fails we still clear the local session below
  }
  applySession(null);
  return { error: null };
}
