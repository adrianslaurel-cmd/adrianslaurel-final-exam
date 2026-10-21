import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';

type IconName = keyof typeof Ionicons.glyphMap;

function icon(active: IconName, inactive: IconName) {
  return ({ color, focused }: { color: string; focused: boolean }) => (
    <Ionicons name={focused ? active : inactive} color={color} size={24} />
  );
}

export default function TabLayout() {
  const { role } = useAuth();
  const isStudent = role === 'student';
  const isStaff = role === 'teacher' || role === 'admin';
  const isAdmin = role === 'admin';

  // Role-based navigation: `href: null` hides a tab for that role.
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        headerStyle: { backgroundColor: COLORS.background },
        headerShadowVisible: false,
        headerTintColor: COLORS.textPrimary,
        tabBarStyle: { backgroundColor: COLORS.card, borderTopColor: COLORS.border },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: isStudent ? 'Events' : 'Dashboard',
          tabBarIcon: isStudent ? icon('calendar', 'calendar-outline') : icon('grid', 'grid-outline'),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Manage Events',
          tabBarLabel: 'Events',
          href: isStaff ? undefined : null,
          tabBarIcon: icon('clipboard', 'clipboard-outline'),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          href: isStudent ? undefined : null,
          tabBarIcon: icon('qr-code', 'qr-code-outline'),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: isStudent ? 'My Attendance' : isAdmin ? 'All Attendance' : 'Attendance Records',
          tabBarLabel: isStudent ? 'History' : isAdmin ? 'Attendance' : 'Records',
          tabBarIcon: icon('time', 'time-outline'),
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: 'Manage Users',
          tabBarLabel: 'Users',
          href: isAdmin ? undefined : null,
          tabBarIcon: icon('people', 'people-outline'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'My Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: icon('person', 'person-outline'),
        }}
      />
    </Tabs>
  );
}
