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

  if (inicializando) return <ActivityIndicator color="#6F2C91" />;
  if (!perfil) return <Redirect href="/(auth)/login" />;
  if (perfil.mustChangePassword) return <Redirect href="/(auth)/change-password" />;

  const simular = async () => {
    setEnviando(true);
    try {
      await crashReporting.provocarCrash({
        rol: perfil.rol,
        pantalla: 'ajustes',
        operacion: 'simular_crash_fatal_crashlytics',
      });
    } catch (error) {
      console.error('[AjustesScreen] Error al iniciar prueba fatal:', error);
      setFeedback({
        title: 'No se pudo simular el crash',
        message: error instanceof Error ? error.message : 'Compruebe la configuración nativa de Firebase.',
        tone: 'error',
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View className="flex-1 bg-malva">
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-5 px-5 pb-12 pt-5"
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => volverSeguro(routeForRole(perfil.rol))}
          className="min-h-12 self-start justify-center rounded-xl border border-borde-lavanda bg-white px-4"
        >
          <Text className="font-body-bold text-sm text-primario">← Volver</Text>
        </Pressable>

        <Text className="font-display text-4xl uppercase tracking-wider text-primario" selectable>
          Perfil y ajustes
        </Text>

        {/* Tarjeta de perfil en Lavanda Suave */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Editar nombre"
          onPress={() => setEditandoNombre(true)}
          className="gap-2 rounded-2xl border border-borde-lavanda bg-lavanda p-5"
        >
          <View className="self-start rounded-full bg-primario px-3 py-1">
            <Text className="font-body-bold text-xs uppercase tracking-wider text-amarillo" selectable>
              {perfil.rol.replaceAll('_', ' ')}
            </Text>
          </View>
          <Text className="font-body-bold text-xl text-texto" selectable>
            {perfil.nombresCompletos}
          </Text>
          <Text className="mt-1 font-body-bold text-xs text-primario">
            Tocar para editar nombre →
          </Text>
        </Pressable>

        {(perfil.rol === 'COORDINADOR_PROVINCIAL' || perfil.rol === 'COORDINADOR_RECINTO') && (
          <View className="gap-3 rounded-2xl border border-borde-lavanda bg-white p-5">
            <Text className="font-display text-2xl uppercase tracking-wide text-primario">
              Gestión de equipo
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/usuarios')}
              className="min-h-12 items-center justify-center rounded-xl bg-primario px-4"
            >
              <Text className="text-center font-body-bold text-amarillo">
                {perfil.rol === 'COORDINADOR_PROVINCIAL'
                  ? 'Gestionar Coordinadores de Recinto'
                  : 'Gestionar Veedores'}
              </Text>
            </Pressable>
          </View>
        )}

        <View className="gap-3 rounded-2xl border border-borde-lavanda bg-white p-5">
          <Text className="font-display text-2xl uppercase tracking-wide text-primario">
            Diagnóstico de Crashlytics
          </Text>
          <View className="gap-2 rounded-xl border border-primario bg-crema p-4">
            <Text className="font-body-bold text-sm text-primario">
              Requisitos de verificación
            </Text>
            <Text className="font-body text-xs text-texto">
              • APK compilado de forma nativa (no funciona en Expo Go)
            </Text>
            <Text className="font-body text-xs text-texto">
              • google-services.json correctamente configurado
            </Text>
            <Text className="font-body text-xs text-texto">
              • En debug, habilitar Crashlytics antes de compilar
            </Text>
            <Text className="font-body text-xs text-texto">
              • Conexión a Internet (aunque el registro se guarda offline)
            </Text>
          </View>
          <Text className="font-body text-sm leading-5 text-texto-secundario">
            Provoca un cierre fatal controlado para comprobar la captura de crashes.
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={enviando}
            onPress={() => void simular()}
            className="min-h-12 items-center justify-center rounded-xl bg-primario px-4"
          >
            <Text className="font-body-bold text-white">
              {enviando ? 'Provocando crash…' : 'Simular crash fatal'}
            </Text>
          </Pressable>
          <View className="gap-1.5 rounded-xl bg-vainilla p-4">
            <Text className="font-body-bold text-sm text-primario">Pasos para verificar</Text>
            <Text className="font-body text-xs text-texto">
              1. Reinicia la aplicación con conexión a Internet.
            </Text>
            <Text className="font-body text-xs text-texto">
              2. Accede a Firebase Console → Crashlytics y consulta los errores fatales.
            </Text>
            <Text className="font-body text-xs text-texto">
              3. La entrega puede tardar varios minutos.
            </Text>
          </View>
        </View>
      </ScrollView>

      <EditarNombreBottomSheet
        nombreActual={perfil.nombresCompletos}
        isOpen={editandoNombre}
        onClose={() => setEditandoNombre(false)}
        onSuccess={() =>
          setFeedback({
            title: 'Nombre actualizado',
            message: 'Tu nombre ha sido actualizado exitosamente.',
            tone: 'success',
          })
        }
      />

      <FeedbackBottomSheet content={feedback} onDismiss={() => setFeedback(null)} />
    </View>
  );
}
