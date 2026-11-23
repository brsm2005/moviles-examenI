import { RoleGuard } from '@/presentation/navigation/RoleGuard';

export default function VeedorLayout() {
  return <RoleGuard role="VEEDOR" />;
}
