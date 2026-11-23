import { Stack } from 'expo-router/stack';

export default function ActasLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackButtonDisplayMode: 'minimal',
        headerStyle: { backgroundColor: '#F6F8FB' },
        headerTintColor: '#1B365D',
      }}
    >
      <Stack.Screen name="historial" options={{ title: 'Historial de actas' }} />
      <Stack.Screen name="verificacion" options={{ title: 'Verificación de acta' }} />
    </Stack>
  );
}
