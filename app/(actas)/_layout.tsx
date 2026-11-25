import { router } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { InstitutionalHeader } from '@/presentation/components/ui/InstitutionalHeader';
import { useNetworkStatus } from '@/presentation/hooks/useNetworkStatus';
import { routeForRole } from '@/presentation/navigation/roleRoutes';
import { useAppSelector } from '@/presentation/store';

function ActasHeader({
  title,
  routeName,
  onBack,
  canGoBack,
}: {
  title: string;
  routeName: string;
  onBack: () => void;
  canGoBack: boolean;
}) {
  const rol = useAppSelector((state) => state.auth.perfil?.rol ?? null);
  const { isOffline } = useNetworkStatus();
  const puedeVolver = canGoBack || routeName === 'verificacion' || rol !== null;

  const handleBack = () => {
    if (canGoBack) {
      onBack();
      return;
    }
    if (routeName === 'verificacion') {
      router.replace('/(actas)/historial');
      return;
    }
    if (rol) {
      router.replace(routeForRole(rol));
    }
  };

  return (
    <InstitutionalHeader
      role={rol}
      title={title}
      showBack={puedeVolver}
      onBack={handleBack}
      offline={isOffline}
    />
  );
}

export default function ActasLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        header: ({ options, navigation, route }) => (
          <ActasHeader
            title={typeof options.title === 'string' ? options.title : 'Actas'}
            routeName={route.name}
            canGoBack={navigation.canGoBack()}
            onBack={() => navigation.goBack()}
          />
        ),
      }}
    >
      <Stack.Screen name="historial" options={{ title: 'Historial' }} />
      <Stack.Screen name="verificacion" options={{ title: 'Verificación' }} />
    </Stack>
  );
}