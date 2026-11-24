import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Redirect, ScrollView, Text, View, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { datosCrearUsuarioSchema } from '@/domain/schemas/usuariosSchemas';
import type { z } from 'zod';
import { AuthTextField } from '@/presentation/components/auth/AuthTextField';
import {
  FeedbackBottomSheet,
  type FeedbackContent,
} from '@/presentation/components/auth/FeedbackBottomSheet';
import { useAppDispatch, useAppSelector } from '@/presentation/store';
import { crearUsuario, obtenerUsuarioPorId } from '@/presentation/store/slices/usuariosSlice';

type CrearUsuarioValues = z.input<typeof datosCrearUsuarioSchema>;

export function CrearEditarUsuarioScreen() {
  const dispatch = useAppDispatch();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { perfil, inicializando } = useAppSelector((state) => state.auth);
  const { usuarioActual, cargando } = useAppSelector((state) => state.usuarios);
  const [feedback, setFeedback] = useState<FeedbackContent | null>(null);
  const [guardando, setGuardando] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<CrearUsuarioValues>({
    resolver: zodResolver(datosCrearUsuarioSchema),
    defaultValues: {
      cedula: '',
      nombresCompletos: '',
      email: '',
      telefono: '',
      rol: 'VEEDOR',
    },
  });

  useEffect(() => {
    if (id && !usuarioActual) {
      void dispatch(obtenerUsuarioPorId(id));
    }
  }, [id, dispatch, usuarioActual]);

  if (inicializando) return <ActivityIndicator />;
  if (!perfil) return <Redirect href="/(auth)/login" />;

  if (perfil.rol === 'VEEDOR') {
    return (
      <View className="flex-1 bg-fondo px-6 py-10">
        <Text className="text-xl font-bold text-texto">No tiene permisos para crear usuarios.</Text>
      </View>
    );
  }

  const onSubmit = async (datos: CrearUsuarioValues) => {
    setGuardando(true);
    try {
      await dispatch(
        crearUsuario({
          datos: {
            cedula: datos.cedula,
            nombresCompletos: datos.nombresCompletos,
            email: datos.email,
            telefono: datos.telefono,
            rol: datos.rol,
            recintoId: perfil.rol === 'COORDINADOR_RECINTO' ? perfil.recintoId || undefined : undefined,
          },
          recintoIdDelCreador: perfil.recintoId,
        })
      ).unwrap();

      setFeedback({
        title: 'Usuario creado exitosamente',
        message: 'El usuario ha sido registrado en el sistema.',
        tone: 'success',
      });

      setTimeout(() => router.back(), 1500);
    } catch (error) {
      setFeedback({
        title: 'Error al crear usuario',
        message: error instanceof Error ? error.message : 'Intente nuevamente',
        tone: 'error',
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <ScrollView
        className="flex-1 bg-fondo"
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-6 py-6">
          <Pressable onPress={() => router.back()} className="mb-4 min-h-10 justify-center">
            <Text className="text-sm font-bold text-primario">← Volver</Text>
          </Pressable>

          <Text className="text-3xl font-bold text-texto">Crear usuario</Text>
          <Text className="mt-2 text-sm text-slate-600">
            {perfil.rol === 'COORDINADOR_PROVINCIAL'
              ? 'Registra un nuevo Coordinador de Recinto'
              : 'Registra un nuevo Veedor'}
          </Text>

          <View className="mt-6 gap-4 rounded-2xl border border-slate-200 bg-white p-6">
            <Controller
              control={control}
              name="cedula"
              render={({ field, fieldState }) => (
                <AuthTextField
                  label="Cédula"
                  placeholder="Ej: 1234567"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={fieldState.error?.message}
                  keyboardType="numeric"
                />
              )}
            />

            <Controller
              control={control}
              name="nombresCompletos"
              render={({ field, fieldState }) => (
                <AuthTextField
                  label="Nombres completos"
                  placeholder="Ej: Juan Pérez"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={fieldState.error?.message}
                  autoCapitalize="words"
                />
              )}
            />

            <Controller
              control={control}
              name="email"
              render={({ field, fieldState }) => (
                <AuthTextField
                  label="Correo electrónico"
                  placeholder="correo@ejemplo.com"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={fieldState.error?.message}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              )}
            />

            <Controller
              control={control}
              name="telefono"
              render={({ field, fieldState }) => (
                <AuthTextField
                  label="Teléfono"
                  placeholder="Ej: 0999123456"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={fieldState.error?.message}
                  keyboardType="phone-pad"
                />
              )}
            />
          </View>

          <Pressable
            onPress={() => void handleSubmit(onSubmit)()}
            disabled={guardando || isSubmitting || cargando}
            className="mt-6 min-h-12 items-center justify-center rounded-xl bg-primario px-4"
          >
            <Text className="font-bold text-white">
              {guardando ? 'Creando…' : 'Crear usuario'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <FeedbackBottomSheet content={feedback} onDismiss={() => setFeedback(null)} />
    </KeyboardAvoidingView>
  );
}
