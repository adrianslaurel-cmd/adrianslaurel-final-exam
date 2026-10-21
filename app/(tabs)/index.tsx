import StaffHome from '@/components/StaffHome';
import StudentHome from '@/components/StudentHome';
import { useAuth } from '@/lib/auth';

export default function Index() {
  const { role } = useAuth();
  return role === 'student' ? <StudentHome /> : <StaffHome />;
}
