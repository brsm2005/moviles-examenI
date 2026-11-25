import '../global.css';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
} from '@expo-google-fonts/montserrat';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useFonts } from 'expo-font';
import { router } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { ActaOcrNotification } from '@/presentation/components/actas/ActaOcrNotification';
import { InstitutionalHeader } from '@/presentation/components/ui/InstitutionalHeader';
import { useNetworkStatus } from '@/presentation/hooks/useNetworkStatus';
import { useAppDispatch, useAppSelector } from '@/presentation/store';
import { avisarActaLista } from '@/presentation/store/slices/actaSlice';
import { hydrateSession } from '@/presentation/store/slices/authSlice';
import { crashReportingService, store, syncWorker } from '../src/infrastructure/services';

void SplashScreen.preventAutoHideAsync().catch(() => {});

function AuthBootstrap() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    void dispatch(hydrateSession());
  }, [dispatch]);

  return null;
}

function ActaWorkerBootstrap() {
  const dispatch = useAppDispatch();
  const usuarioId = useAppSelector((state) => state.auth.perfil?.id ?? null);
  const rol = useAppSelector((state) => state.auth.perfil?.rol ?? null);

  useEffect(() => {
    crashReportingService.establecerRol(rol);
    return () => crashReportingService.establecerRol(null);
  }, [rol]);

  useEffect(() => {
    if (!usuarioId) return undefined;
    return syncWorker.iniciar(usuarioId, (acta) => {
      dispatch(avisarActaLista(acta.id));
    });
  }, [dispatch, usuarioId]);

  return <ActaOcrNotification />;
}

function StackInstitutionalHeader({
  title,
  canGoBack,
}: {
  title: string;
  canGoBack: boolean;
}) {
  const rol = useAppSelector((state) => state.auth.perfil?.rol ?? null);
  const { isOffline } = useNetworkStatus();
  return (
    <InstitutionalHeader
      role={rol}
      title={title}
      showBack={canGoBack}
      onBack={() => {
        if (router.canGoBack()) {
          router.back();
        }
      }}
      offline={isOffline}
    />
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BebasNeue_400Regular,
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  useEffect(() => {
    void crashReportingService.inicializar().catch((error: unknown) => {
      console.warn('[Crashlytics] No se pudo inicializar:', error);
    });
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Provider store={store}>
          <BottomSheetModalProvider>
            <StatusBar style="dark" />
            <AuthBootstrap />
            <ActaWorkerBootstrap />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(provincial)" />
              <Stack.Screen name="(recinto)" />
              <Stack.Screen name="(veedor)" />
              <Stack.Screen name="(actas)" />
              <Stack.Screen
                name="ajustes"
                options={{
                  headerShown: true,
                  header: ({ navigation }) => (
                    <StackInstitutionalHeader
                      title="Ajustes"
                      canGoBack={navigation.canGoBack()}
                    />
                  ),
                }}
              />
              <Stack.Screen
                name="usuarios"
                options={{
                  headerShown: true,
                  header: ({ navigation }) => (
                    <StackInstitutionalHeader
                      title="Equipo"
                      canGoBack={navigation.canGoBack()}
                    />
                  ),
                }}
              />
            </Stack>
          </BottomSheetModalProvider>
        </Provider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
