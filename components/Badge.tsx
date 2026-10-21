import { StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/colors';
import type { AttendanceStatus } from '@/lib/attendance';
import type { EventStatus } from '@/lib/events';

const TONES: Record<string, string> = {
  open: COLORS.success,
  closed: COLORS.textSecondary,
  present: COLORS.success,
  late: COLORS.warning,
  absent: COLORS.danger,
  excused: '#58A6FF',
};

export default function Badge({ value }: { value?: EventStatus | AttendanceStatus | string | null }) {
  const label = String(value ?? 'unknown');
  const tone = TONES[label] ?? COLORS.textSecondary;
  return (
    <View style={[styles.badge, { borderColor: tone }]}>
      <Text style={[styles.text, { color: tone }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  text: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
});
