import StaffAttendance from '@/components/StaffAttendance';
import StudentHistory from '@/components/StudentHistory';
import { useAuth } from '@/lib/auth';

export default function HistoryScreen() {
  const { role } = useAuth();
  return role === 'student' ? <StudentHistory /> : <StaffAttendance />;
}
