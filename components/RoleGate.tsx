import type { ReactNode } from 'react';
import { View } from 'react-native';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import type { Role } from '@/lib/profiles';

import { LoadingView, UnauthorizedView } from './StateViews';

/** Client-side guard. (The database RLS policies are the real protection.) */
export default function RoleGate({ allow, children }: { allow: Role[]; children: ReactNode }) {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <LoadingView />
      </View>
    );
  }
  if (!allow.includes(role)) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <UnauthorizedView message={`This page is only available to: ${allow.join(', ')}.`} />
      </View>
    );
  }
  return <>{children}</>;
}
