import '../global.css';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'react-redux';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack } from 'expo-router/stack';
import { SupabaseAuthRepository } from '@/infrastructure/supabase/SupabaseAuthRepository';
import { createAppStore, useAppDispatch } from '@/presentation/store';
import { hydrateSession } from '@/presentation/store/slices/authSlice';

export const store = createAppStore(new SupabaseAuthRepository());

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
