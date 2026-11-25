import { ActivityIndicator, View } from 'react-native';
import { Redirect, useSegments } from 'expo-router';
import type { ReactNode } from 'react';
import { useAppSelector } from '@/presentation/store';
import { routeForRole } from './roleRoutes';

const publicAuthScreens = new Set(['login', 'recover-password', 'callback']);
const authenticatedAuthScreens = new Set([
  'change-password',
  'register-subordinate',
  'callback',
]);

interface AuthGroupGuardProps {
  children: ReactNode;
}

export function AuthGroupGuard({ children }: AuthGroupGuardProps) {
  const { inicializando, perfil } = useAppSelector((state) => state.auth);
  const segments = useSegments();
  const screen = segments[segments.length - 1] ?? '';

  if (inicializando) {
    return (
      <View className="flex-1 items-center justify-center bg-malva">
        <ActivityIndicator size="large" color="#6F2C91" />
      </View>
    );
  }

  if (!perfil) {
    return publicAuthScreens.has(screen) ? (
      children
    ) : (
      <Redirect href="/(auth)/login" />
    );
  }

  if (perfil.mustChangePassword && screen !== 'change-password') {
    return <Redirect href="/(auth)/change-password" />;
  }

  if (
    screen === 'change-password' ||
    (!perfil.mustChangePassword && authenticatedAuthScreens.has(screen))
  ) {
    return children;
  }

  return <Redirect href={routeForRole(perfil.rol)} />;
}
