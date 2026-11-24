import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import type { IDiagnosticoCrashReportingService } from '@/domain/ports/ICrashReportingService';
import { FeedbackBottomSheet, type FeedbackContent } from '@/presentation/components/auth/FeedbackBottomSheet';
import { EditarNombreBottomSheet } from '@/presentation/components/usuarios/EditarNombreBottomSheet';
import { routeForRole } from '@/presentation/navigation/roleRoutes';
import { volverSeguro } from '@/presentation/navigation/volverSeguro';
import { useAppSelector } from '@/presentation/store';

export function AjustesScreen({ crashReporting }: { crashReporting: IDiagnosticoCrashReportingService }) {
  const { perfil, inicializando } = useAppSelector((state) => state.auth);
  const [feedback, setFeedback] = useState<FeedbackContent | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [editandoNombre, setEditandoNombre] = useState(false);

  if (inicializando) return <ActivityIndicator />;
  if (!perfil) return <Redirect href="/(auth)/login" />;
  if (perfil.mustChangePassword) return <Redirect href="/(auth)/change-password" />;

  const simular = async () => {
    setEnviando(true);
    try {
      await crashReporting.registrarErrorDiagnostico(new Error('Error de prueba manual de Crashlytics'), {
        rol: perfil.rol,
        pantalla: 'ajustes',
        operacion: 'simular_error_crashlytics',
      });
      setFeedback({
        title: 'Prueba enviada al SDK',
        message: 'Se solicitó el registro del error. Esto no confirma su entrega a Firebase; reinicie la app y consulte Crashlytics más tarde.',
        tone: 'success',
      });
    } catch (error) {
      console.error('[AjustesScreen] Error al registrar prueba:', error);
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
        <Pressable accessibilityRole="button" onPress={() => volverSeguro(routeForRole(perfil.rol))} className="min-h-11 justify-center">
          <Text className="font-bold text-primario">← Volver</Text>
        </Pressable>
        <Text className="text-3xl font-bold text-texto" selectable>Perfil y ajustes</Text>
        
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Editar nombre"
          onPress={() => setEditandoNombre(true)}
          className="gap-2 rounded-2xl border border-slate-200 bg-white p-5"
        >
          <Text className="text-lg font-bold text-texto" selectable>{perfil.nombresCompletos}</Text>
          <Text className="text-sm text-slate-600" selectable>{perfil.rol.replaceAll('_', ' ')}</Text>
          <Text className="mt-2 text-xs font-semibold text-primario">Tocar para editar nombre</Text>
        </Pressable>

        {(perfil.rol === 'COORDINADOR_PROVINCIAL' || perfil.rol === 'COORDINADOR_RECINTO') && (
          <>
            <Text className="text-lg font-bold text-texto">Gestión de equipo</Text>
            <Pressable
              onPress={() => router.push('/usuarios')}
              className="rounded-xl border border-primario bg-primario px-4 py-3"
            >
              <Text className="text-center font-semibold text-white">
                {perfil.rol === 'COORDINADOR_PROVINCIAL' ? 'Gestionar Coordinadores de Recinto' : 'Gestionar Veedores'}
              </Text>
            </Pressable>
          </>
        )}

        <Text className="text-lg font-bold text-texto">Diagnóstico de Crashlytics</Text>
        <View className="gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <Text className="text-sm font-semibold text-amber-900">ℹ Requisitos para que funcione:</Text>
          <Text className="text-xs text-amber-800">• APK compilado de forma nativa (no funciona en Expo Go)</Text>
          <Text className="text-xs text-amber-800">• google-services.json correctamente configurado</Text>
          <Text className="text-xs text-amber-800">• En debug, habilitar Crashlytics antes de compilar</Text>
          <Text className="text-xs text-amber-800">• Conexión a Internet (aunque el registro se guarda offline)</Text>
        </View>
        <Text className="text-sm leading-5 text-slate-600">
          Solicita el registro de un error no fatal de prueba; no interrumpe la aplicación.
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={enviando}
          onPress={() => void simular()}
          className="min-h-12 items-center justify-center rounded-xl bg-primario px-4"
        >
          <Text className="font-bold text-white">
            {enviando ? 'Registrando error…' : 'Simular error para Crashlytics'}
          </Text>
        </Pressable>
        <View className="gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <Text className="text-sm font-semibold text-slate-700">🔍 Para verificar:</Text>
          <Text className="text-xs text-slate-600">1. Reinicia la aplicación con conexión a Internet.</Text>
          <Text className="text-xs text-slate-600">2. Accede a Firebase Console → Crashlytics y consulta los errores no fatales.</Text>
          <Text className="text-xs text-slate-600">3. La entrega puede tardar varios minutos.</Text>
        </View>
      </ScrollView>

      <EditarNombreBottomSheet
        nombreActual={perfil.nombresCompletos}
        isOpen={editandoNombre}
        onClose={() => setEditandoNombre(false)}
        onSuccess={() => setFeedback({
          title: 'Nombre actualizado',
          message: 'Tu nombre ha sido actualizado exitosamente.',
          tone: 'success',
        })}
      />

      <FeedbackBottomSheet content={feedback} onDismiss={() => setFeedback(null)} />
    </View>
  );
}
