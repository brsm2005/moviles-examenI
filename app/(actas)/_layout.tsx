import { Stack } from 'expo-router/stack';
import { InstitutionalHeader } from '@/presentation/components/ui/InstitutionalHeader';
import { useNetworkStatus } from '@/presentation/hooks/useNetworkStatus';
import { useAppSelector } from '@/presentation/store';

function ActasHeader({
  title,
  onBack,
  canGoBack,
}: {
  title: string;
  onBack: () => void;
  canGoBack: boolean;
}) {
  const rol = useAppSelector((state) => state.auth.perfil?.rol ?? null);
  const { isOffline } = useNetworkStatus();
  return (
    <InstitutionalHeader
      role={rol}
      title={title}
      showBack={canGoBack}
      onBack={onBack}
      offline={isOffline}
    />
  );
}

export default function ActasLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        header: ({ options, navigation }) => (
          <ActasHeader
            title={typeof options.title === 'string' ? options.title : 'Actas'}
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
