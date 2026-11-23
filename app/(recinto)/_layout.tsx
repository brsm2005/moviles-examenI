import { RoleGuard } from '@/presentation/navigation/RoleGuard';

export default function RecintoLayout() {
  return <RoleGuard role="COORDINADOR_RECINTO" />;
}
