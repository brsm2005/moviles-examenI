import { RoleGuard } from '@/presentation/navigation/RoleGuard';

export default function ProvincialLayout() {
  return <RoleGuard role="COORDINADOR_PROVINCIAL" />;
}
