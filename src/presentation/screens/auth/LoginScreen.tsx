import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { inicioSesionSchema } from '@/domain/schemas/authSchemas';
import type { z } from 'zod';
import { AuthShell } from '@/presentation/components/auth/AuthShell';
import { AuthTextField } from '@/presentation/components/auth/AuthTextField';
import {
  FeedbackBottomSheet,
  type FeedbackContent,
} from '@/presentation/components/auth/FeedbackBottomSheet';
import { useAppDispatch, useAppSelector } from '@/presentation/store';
import { clearAuthError, signIn } from '@/presentation/store/slices/authSlice';

type LoginValues = z.input<typeof inicioSesionSchema>;

export function LoginScreen() {
  const dispatch = useAppDispatch();
  const cargando = useAppSelector((state) => state.auth.cargando);
  const authError = useAppSelector((state) => state.auth.error);
  const [feedback, setFeedback] = useState<FeedbackContent | null>(null);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(inicioSesionSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (credenciales: LoginValues) => {
    dispatch(clearAuthError());
    try {
      await dispatch(signIn(credenciales)).unwrap();
    } catch (error) {
      setFeedback({
        title: 'No se pudo iniciar sesión',
        message:
          error instanceof Error ? error.message : 'Revise sus datos e intente nuevamente.',
        tone: 'error',
      });
    }
  };

  return (
    <AuthShell
      title="Iniciar sesión"
      description="Ingrese con las credenciales que le entregó su coordinador."
    >
      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <AuthTextField
            label="Correo electrónico"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
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
            label="Contraseña"
            autoCapitalize="none"
            autoComplete="password"
            secureTextEntry
            textContentType="password"
            value={field.value}
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            error={fieldState.error?.message}
            showPasswordToggle
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
          {isSubmitting || cargando ? 'Verificando…' : 'Ingresar de forma segura'}
        </Text>
      </Pressable>
      {authError ? (
        <Text className="text-sm leading-5 text-red-700" selectable>
          {authError}
        </Text>
      ) : null}
      <View className="items-center gap-3">
        <Link href="/(auth)/recover-password" asChild>
          <Pressable accessibilityRole="link" className="p-2">
            <Text className="font-semibold text-secundario" selectable>
              ¿Olvidó su contraseña?
            </Text>
          </Pressable>
        </Link>
        <Text className="text-center text-sm text-slate-500" selectable>
          ¿Necesita acceso? Solicítelo a su coordinador provincial.
        </Text>
      </View>
      <FeedbackBottomSheet
        content={feedback}
        onDismiss={() => {
          setFeedback(null);
          dispatch(clearAuthError());
        }}
      />
    </AuthShell>
  );
}
