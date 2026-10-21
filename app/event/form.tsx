import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import AppButton from '@/components/AppButton';
import RoleGate from '@/components/RoleGate';
import { ErrorView, LoadingView, UnauthorizedView } from '@/components/StateViews';
import TextField from '@/components/TextField';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { createEvent, getEvent, updateEvent, type EventRow } from '@/lib/events';
import { validateEvent } from '@/lib/validation';

function formatDateTime(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' });
  return `${month} ${pad(date.getDate())}, ${date.getFullYear()} at ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const QUICK_END_OPTIONS = [
  { label: '+30 min', ms: 30 * 60 * 1000 },
  { label: '+1 hour', ms: 60 * 60 * 1000 },
  { label: '+2 hours', ms: 2 * 60 * 60 * 1000 },
];

type EditTarget = 'start' | 'end';

function FormInner() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user, role } = useAuth();
  const isEdit = !!id;

  const [loadingEvent, setLoadingEvent] = useState(isEdit);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [existing, setExisting] = useState<EventRow | null>(null);

  const [title, setTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(() => new Date());
  const [endDate, setEndDate] = useState(() => new Date(Date.now() + 60 * 60 * 1000));
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [editingPart, setEditingPart] = useState<'date' | 'time'>('date');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isAndroid = Platform.OS === 'android';

  useEffect(() => {
    if (!id) return;
    let active = true;
    getEvent(String(id)).then(({ data, error: err }) => {
      if (!active) return;
      if (data) {
        setExisting(data);
        setTitle(data.title);
        setVenue(data.venue ?? '');
        setDescription(data.description ?? '');
        if (data.start_time) setStartDate(new Date(data.start_time));
        if (data.end_time) setEndDate(new Date(data.end_time));
      }
      setLoadError(err);
      setLoadingEvent(false);
    });
    return () => {
      active = false;
    };
  }, [id]);

  const openPicker = (target: EditTarget) => {
    setError(null);
    setEditTarget(target);
    setEditingPart('date');
  };

  // EVENT: the date/time picker returns a value
  const onPickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (!editTarget) return;
    if (event.type === 'dismissed' || !selected) {
      setEditTarget(null);
      setEditingPart('date');
      return;
    }
    const current = editTarget === 'start' ? startDate : endDate;
    const next = new Date(current);
    next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
    next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);

    if (editTarget === 'start') setStartDate(next);
    else setEndDate(next);

    if (isAndroid && editingPart === 'date') {
      setEditingPart('time');
    } else {
      setEditTarget(null);
      setEditingPart('date');
    }
  };

  // EVENT: user presses "Create Event" / "Save Changes"
  const handleSave = async () => {
    setError(null);
    const values = { title, venue, description, start: startDate, end: endDate };
    const validation = validateEvent(values);
    if (validation) return setError(validation);
    if (!user) return setError('You are not signed in.');

    setSaving(true);
    if (isEdit && existing) {
      const { error: err } = await updateEvent(existing.id, values);
      setSaving(false);
      if (err) return setError(`Could not save event: ${err}`);
      router.back();
    } else {
      const { id: newId, error: err } = await createEvent(values, user.id);
      setSaving(false);
      if (err || !newId) return setError(`Could not create event: ${err ?? 'unknown error'}`);
      router.replace(`/event/${newId}`); // go straight to the generated QR code
    }
  };

  if (loadingEvent) return <LoadingView label="Loading event..." />;
  if (loadError) return <ErrorView message={loadError} />;
  if (isEdit && existing && role !== 'admin' && existing.created_by !== user?.id) {
    return <UnauthorizedView message="You can only edit events you created." />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>{isEdit ? 'Edit Event' : 'Create Event'}</Text>
      <Text style={styles.subtitle}>
        {isEdit
          ? 'Update the event details. The QR code stays the same.'
          : 'Fill in the details. A QR code is generated automatically after saving.'}
      </Text>

      <TextField
        label="Event Name"
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Founders Day Assembly"
        maxLength={100}
      />
      <TextField label="Venue" value={venue} onChangeText={setVenue} placeholder="e.g. School Gymnasium" maxLength={100} />
      <TextField
        label="Description (optional)"
        value={description}
        onChangeText={setDescription}
        placeholder="What is this event about?"
        multiline
        numberOfLines={3}
        maxLength={500}
        style={{ minHeight: 80, textAlignVertical: 'top' }}
      />

      <Text style={styles.label}>Starts</Text>
      <PickerField value={formatDateTime(startDate)} icon="sunny-outline" onPress={() => openPicker('start')} />

      <Text style={styles.label}>Ends</Text>
      <PickerField value={formatDateTime(endDate)} icon="moon-outline" onPress={() => openPicker('end')} />
      <View style={styles.chipRow}>
        {QUICK_END_OPTIONS.map((option) => (
          <Pressable
            key={option.label}
            style={styles.chip}
            onPress={() => setEndDate(new Date(startDate.getTime() + option.ms))}
          >
            <Text style={styles.chipText}>{option.label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.hint}>Tap a chip to set the end time from the start.</Text>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <View style={{ marginTop: 18 }}>
        <AppButton
          theme="primary"
          title={isEdit ? 'Save Changes' : 'Create Event'}
          icon={isEdit ? 'save-outline' : 'add-circle-outline'}
          onPress={handleSave}
          loading={saving}
        />
      </View>

      {editTarget && (
        <View style={styles.pickerContainer}>
          <DateTimePicker
            value={editTarget === 'start' ? startDate : endDate}
            mode={isAndroid ? editingPart : 'datetime'}
            display={isAndroid ? 'default' : 'spinner'}
            onChange={onPickerChange}
          />
        </View>
      )}
    </ScrollView>
  );
}

export default function EventFormScreen() {
  return (
    <RoleGate allow={['teacher', 'admin']}>
      <FormInner />
    </RoleGate>
  );
}

function PickerField({
  value,
  icon,
  onPress,
}: {
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.pickerField, pressed && { backgroundColor: COLORS.surface }]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={20} color={COLORS.primary} />
      <Text style={styles.pickerValue}>{value}</Text>
      <Ionicons name="calendar-outline" size={18} color={COLORS.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 6, marginTop: 10 },
  pickerField: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerValue: { flex: 1, fontSize: 15, fontWeight: '500', color: COLORS.textPrimary, marginHorizontal: 10 },
  chipRow: { flexDirection: 'row', marginTop: 8 },
  chip: {
    backgroundColor: COLORS.surface,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  hint: { fontSize: 12, color: COLORS.textSecondary, marginTop: 6 },
  pickerContainer: { marginTop: 12, alignItems: 'center' },
  error: { fontSize: 14, color: COLORS.danger, marginTop: 14 },
});
