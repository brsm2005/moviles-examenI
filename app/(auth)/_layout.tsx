import { Stack } from 'expo-router/stack';
import { AuthGroupGuard } from '@/presentation/navigation/AuthGroupGuard';

export default function AuthLayout() {
  return (
    <AuthGroupGuard>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthGroupGuard>
  );
}
