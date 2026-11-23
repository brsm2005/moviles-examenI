import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { RolPerfil } from '@/domain/entities/Perfil';
import {
  FeedbackBottomSheet,
  type FeedbackContent,
} from '@/presentation/components/auth/FeedbackBottomSheet';
import { useAppDispatch } from '@/presentation/store';
import { signOut } from '@/presentation/store/slices/authSlice';

interface RoleHomeScreenProps {
  role: RolPerfil;
  title: string;
  description: string;
}

const roleLabels: Record<RolPerfil, string> = {
  COORDINADOR_PROVINCIAL: 'Coordinación provincial',
  COORDINADOR_RECINTO: 'Coordinación de recinto',
  VEEDOR: 'Veeduría electoral',
};

export function RoleHomeScreen({
  role,
  title,
  description,
}: RoleHomeScreenProps) {
  const dispatch = useAppDispatch();
  const [feedback, setFeedback] = useState<FeedbackContent | null>(null);

  const handleSignOut = async () => {
    try {
      await dispatch(signOut()).unwrap();
      router.replace('/(auth)/login');
    } catch (error) {
      setFeedback({
        title: 'No se pudo cerrar la sesión',
        message:
          error instanceof Error ? error.message : 'Intente nuevamente.',
        tone: 'error',
      });
    }
  };

  return (
    <View className="flex-1 gap-6 bg-fondo px-6 py-10">
      <View className="gap-2">
        <Text className="text-xs font-bold tracking-[2px] text-secundario" selectable>
          {roleLabels[role].toUpperCase()}
        </Text>
        <Text className="text-3xl font-bold text-texto" selectable>
          {title}
        </Text>
        <Text className="text-base leading-6 text-slate-600" selectable>
          {description}
        </Text>
      </View>
      {role !== 'VEEDOR' ? (
        <Pressable
          accessibilityRole="button"
          className="min-h-14 justify-center rounded-2xl bg-primario px-5"
          onPress={() => router.push('/(auth)/register-subordinate')}
        >
          <Text className="font-bold text-white" selectable>
            Registrar {role === 'COORDINADOR_PROVINCIAL' ? 'coordinador de recinto' : 'veedor'}
          </Text>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        className="min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-4"
        onPress={handleSignOut}
      >
        <Text className="font-semibold text-texto" selectable>
          Cerrar sesión
        </Text>
      </Pressable>
      <FeedbackBottomSheet
        content={feedback}
        onDismiss={() => setFeedback(null)}
      />
    </View>
  );
}
