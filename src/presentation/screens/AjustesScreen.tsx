import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import type { ICrashReportingService } from '@/domain/ports/ICrashReportingService';
import { FeedbackBottomSheet, type FeedbackContent } from '@/presentation/components/auth/FeedbackBottomSheet';
import { useAppSelector } from '@/presentation/store';

export function AjustesScreen({ crashReporting }: { crashReporting: ICrashReportingService }) {
  const { perfil, inicializando } = useAppSelector((state) => state.auth);
  const [feedback, setFeedback] = useState<FeedbackContent | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (inicializando) return <ActivityIndicator />;
  if (!perfil) return <Redirect href="/(auth)/login" />;
  if (perfil.mustChangePassword) return <Redirect href="/(auth)/change-password" />;

  const simular = async () => {
    setEnviando(true);
    try {
      await crashReporting.registrarError(new Error('Error de prueba manual de Crashlytics'), {
        rol: perfil.rol, pantalla: 'ajustes', operacion: 'simular_error_crashlytics',
      });
      setFeedback({
        title: 'Error de prueba registrado',
        message: 'Compruebe su llegada en Firebase Crashlytics después de recuperar la conexión. La entrega puede tardar varios minutos.',
        tone: 'success',
      });
    } catch (error) {
      setFeedback({
        title: 'No se pudo registrar la prueba',
        message: error instanceof Error ? error.message : 'Compruebe la configuración nativa de Firebase.',
        tone: 'error',
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View className="flex-1 bg-fondo">
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerClassName="gap-5 px-5 pb-12 pt-6">
        <Pressable accessibilityRole="button" onPress={() => router.back()} className="min-h-11 justify-center">
          <Text className="font-bold text-primario">Volver</Text>
        </Pressable>
        <Text className="text-3xl font-bold text-texto" selectable>Perfil y ajustes</Text>
        <View className="gap-2 rounded-2xl border border-slate-200 bg-white p-5">
          <Text className="text-lg font-bold text-texto" selectable>{perfil.nombresCompletos}</Text>
          <Text className="text-sm text-slate-600" selectable>{perfil.rol.replaceAll('_', ' ')}</Text>
        </View>
        <Text className="text-lg font-bold text-texto">Diagnóstico</Text>
        <Text className="text-sm leading-5 text-slate-600">
          Registra un error no fatal de prueba; no interrumpe la aplicación.
        </Text>
        <Pressable accessibilityRole="button" disabled={enviando} onPress={() => void simular()}
          className="min-h-12 items-center justify-center rounded-xl bg-primario px-4">
          <Text className="font-bold text-white">{enviando ? 'Registrando…' : 'Simular error para Crashlytics'}</Text>
        </Pressable>
      </ScrollView>
      <FeedbackBottomSheet content={feedback} onDismiss={() => setFeedback(null)} />
    </View>
  );
}
