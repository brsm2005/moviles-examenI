import '../global.css';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'react-redux';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack } from 'expo-router/stack';
import { useAppDispatch, useAppSelector } from '@/presentation/store';
import { ActaOcrNotification } from '@/presentation/components/actas/ActaOcrNotification';
import { avisarActaLista } from '@/presentation/store/slices/actaSlice';
import { hydrateSession } from '@/presentation/store/slices/authSlice';
import { crashReportingService, store, syncWorker } from '../src/infrastructure/services';

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

export default function RootLayout() {
  useEffect(() => {
    void crashReportingService.inicializar().catch((error: unknown) => {
      console.warn('[Crashlytics] No se pudo inicializar:', error);
    });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <BottomSheetModalProvider>
          <AuthBootstrap />
          <ActaWorkerBootstrap />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(provincial)" />
            <Stack.Screen name="(recinto)" />
            <Stack.Screen name="(veedor)" />
            <Stack.Screen name="(actas)" />
          </Stack>
        </BottomSheetModalProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}
