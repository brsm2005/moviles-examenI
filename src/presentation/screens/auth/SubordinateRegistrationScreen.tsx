import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Pressable, Text } from 'react-native';
import type { z } from 'zod';
import { registroSubordinadoSchema } from '@/domain/schemas/authSchemas';
import { AuthShell } from '@/presentation/components/auth/AuthShell';
import { AuthTextField } from '@/presentation/components/auth/AuthTextField';
import {
  FeedbackBottomSheet,
  type FeedbackContent,
} from '@/presentation/components/auth/FeedbackBottomSheet';
import { useAppDispatch, useAppSelector } from '@/presentation/store';
import {
  clearCreatedSubordinate,
  registerSubordinate,
} from '@/presentation/store/slices/authSlice';

type SubordinateValues = z.input<typeof registroSubordinadoSchema>;

export function SubordinateRegistrationScreen() {
  const dispatch = useAppDispatch();
  const perfil = useAppSelector((state) => state.auth.perfil);
  const cargando = useAppSelector((state) => state.auth.cargando);
  const [feedback, setFeedback] = useState<FeedbackContent | null>(null);
  const rol = useMemo(
    () =>
      perfil?.rol === 'COORDINADOR_PROVINCIAL'
        ? 'COORDINADOR_RECINTO'
        : 'VEEDOR',
    [perfil?.rol],
  );
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<SubordinateValues>({
    resolver: zodResolver(registroSubordinadoSchema),
    defaultValues: {
      cedula: '',
      nombresCompletos: '',
      telefono: '',
      email: '',
      password: '',
      rol,
    },
  });

  const onSubmit = async (values: SubordinateValues) => {
    dispatch(clearCreatedSubordinate());
    try {
      await dispatch(registerSubordinate(values)).unwrap();
      setFeedback({
        title: 'Cuenta aprovisionada',
        message:
          'Se envió el correo de verificación SMTP. La persona deberá confirmar su correo y cambiar la contraseña temporal al ingresar.',
        tone: 'success',
      });
    } catch (error) {
      setFeedback({
        title: 'No se pudo crear la cuenta',
        message:
          error instanceof Error ? error.message : 'Verifique los datos e intente nuevamente.',
        tone: 'error',
      });
    }
  };

  return (
    <AuthShell
      eyebrow="APROVISIONAMIENTO JERÁRQUICO"
      title="Registrar subordinado"
      description="La cuenta se crea mediante el servicio autorizado y recibe un correo de verificación."
    >
      <Text className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-primario" selectable>
        Rol asignado: {rol === 'COORDINADOR_RECINTO' ? 'Coordinador de recinto' : 'Veedor'}
      </Text>
      <Controller
        control={control}
        name="nombresCompletos"
        render={({ field, fieldState }) => (
          <AuthTextField
            label="Nombres completos"
            autoCapitalize="words"
            autoComplete="name"
            value={field.value}
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="cedula"
        render={({ field, fieldState }) => (
          <AuthTextField
            label="Cédula"
            keyboardType="number-pad"
            maxLength={10}
            value={field.value}
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="telefono"
        render={({ field, fieldState }) => (
          <AuthTextField
            label="Teléfono"
            keyboardType="phone-pad"
            autoComplete="tel"
            value={field.value}
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <AuthTextField
            label="Correo electrónico"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={field.value}
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field, fieldState }) => (
          <AuthTextField
            label="Contraseña temporal"
            autoCapitalize="none"
            autoComplete="new-password"
            secureTextEntry
            value={field.value}
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      <Pressable
        accessibilityRole="button"
        className="min-h-12 items-center justify-center rounded-xl bg-primario px-4"
        disabled={isSubmitting || cargando}
        onPress={() => {
          void handleSubmit(onSubmit)();
        }}
      >
        <Text className="font-bold text-white" selectable>
          {isSubmitting || cargando ? 'Creando cuenta…' : 'Crear y enviar verificación'}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        className="min-h-11 items-center justify-center"
        onPress={() => router.back()}
      >
        <Text className="font-semibold text-secundario" selectable>
          Volver al espacio de trabajo
        </Text>
      </Pressable>
      <FeedbackBottomSheet
        content={feedback}
        onDismiss={() => setFeedback(null)}
      />
    </AuthShell>
  );
}
