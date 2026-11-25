import { ActivityIndicator, View } from 'react-native';
import { Redirect, Slot } from 'expo-router';
import { colors } from '@theme/tokens';
import type { RolPerfil } from '@/domain/entities/Perfil';
import { InstitutionalHeader } from '@/presentation/components/ui/InstitutionalHeader';
import { useNetworkStatus } from '@/presentation/hooks/useNetworkStatus';
import { useAppSelector } from '@/presentation/store';
import { routeForRole } from './roleRoutes';

interface RoleGuardProps {
  role: RolPerfil;
}

export function RoleGuard({ role }: RoleGuardProps) {
  const { inicializando, perfil } = useAppSelector((state) => state.auth);
  const { isOffline } = useNetworkStatus();

  if (inicializando) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: colors.malvaPalido }}
      >
        <ActivityIndicator size="large" color={colors.moradoPrincipal} />
      </View>
    );
  }

  if (!perfil) {
    return <Redirect href="/(auth)/login" />;
  }

  if (perfil.mustChangePassword) {
    return <Redirect href="/(auth)/change-password" />;
  }

  if (perfil.rol !== role) {
    return <Redirect href={routeForRole(perfil.rol)} />;
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.malvaPalido }}>
      <InstitutionalHeader role={perfil.rol} offline={isOffline} />
      <View className="flex-1">
        <Slot />
      </View>
    </View>
  );
}
