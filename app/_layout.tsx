import '../global.css';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'react-redux';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack } from 'expo-router/stack';
import { TerritorioRepository } from '@/data/repositories/TerritorioRepository';
import { NetInfoConnectivityService } from '@/infrastructure/device/NetInfoConnectivityService';
import { FirebaseCrashReportingService } from '@/infrastructure/monitoring/FirebaseCrashReportingService';
import { SQLiteTerritorioDataSource } from '@/infrastructure/storage/SQLiteTerritorioDataSource';
import { SupabaseAuthRepository } from '@/infrastructure/supabase/SupabaseAuthRepository';
import { SupabaseTerritorioDataSource } from '@/infrastructure/supabase/SupabaseTerritorioDataSource';
import {
  createAppStore,
  useAppDispatch,
} from '@/presentation/store';
import { hydrateSession } from '@/presentation/store/slices/authSlice';

export const store = createAppStore(
  new SupabaseAuthRepository(),
  new TerritorioRepository(
    new SupabaseTerritorioDataSource(),
    new SQLiteTerritorioDataSource(),
    new NetInfoConnectivityService(),
  ),
  new FirebaseCrashReportingService(),
);

function AuthBootstrap() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    void dispatch(hydrateSession());
  }, [dispatch]);

  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <BottomSheetModalProvider>
          <AuthBootstrap />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(provincial)" />
            <Stack.Screen name="(recinto)" />
            <Stack.Screen name="(veedor)" />
          </Stack>
        </BottomSheetModalProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}
