import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/colors';
import type { EventRow } from '@/lib/events';
import { formatDate, formatTimeRange } from '@/lib/format';

import Badge from './Badge';

type Props = {
  event: EventRow;
  showCount?: boolean;
  onPress: () => void;
};

export default function EventCard({ event, showCount, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { backgroundColor: COLORS.surface }]}
    >
      <View style={styles.row}>
        <Text style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>
        <Badge value={event.status} />
      </View>
      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
        <Text style={styles.meta}>
          {formatDate(event.start_time)} · {formatTimeRange(event.start_time, event.end_time)}
        </Text>
      </View>
      <View style={styles.metaRow}>
        <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
        <Text style={styles.meta} numberOfLines={1}>
          {event.venue || 'No venue'}
        </Text>
      </View>
      {showCount && (
        <View style={styles.metaRow}>
          <Ionicons name="people-outline" size={14} color={COLORS.primary} />
          <Text style={[styles.meta, { color: COLORS.primary, fontWeight: '700' }]}>
            {event.attendee_count} attendee{event.attendee_count === 1 ? '' : 's'}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 12,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  title: { flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginRight: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  meta: { fontSize: 13, color: COLORS.textSecondary, marginLeft: 6, flexShrink: 1 },
});
