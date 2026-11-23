import { ActivityIndicator, View } from 'react-native';
import { Redirect, Slot } from 'expo-router';
import type { RolPerfil } from '@/domain/entities/Perfil';
import { useAppSelector } from '@/presentation/store';
import { routeForRole } from './roleRoutes';

interface RoleGuardProps {
  role: RolPerfil;
}

export function RoleGuard({ role }: RoleGuardProps) {
  const { inicializando, perfil } = useAppSelector((state) => state.auth);

  if (inicializando) {
    return (
      <View className="flex-1 items-center justify-center bg-fondo">
        <ActivityIndicator size="large" color="#1B365D" />
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

  return <Slot />;
}
