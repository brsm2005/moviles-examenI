import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { Pressable, Text } from 'react-native';
import type { z } from 'zod';
import { recuperacionContrasenaSchema } from '@/domain/schemas/authSchemas';
import { AuthShell } from '@/presentation/components/auth/AuthShell';
import { AuthTextField } from '@/presentation/components/auth/AuthTextField';
import {
  FeedbackBottomSheet,
  type FeedbackContent,
} from '@/presentation/components/auth/FeedbackBottomSheet';
import { useAppDispatch, useAppSelector } from '@/presentation/store';
import { requestPasswordReset } from '@/presentation/store/slices/authSlice';

type RecoveryValues = z.input<typeof recuperacionContrasenaSchema>;

export function RecoverPasswordScreen() {
  const dispatch = useAppDispatch();
  const cargando = useAppSelector((state) => state.auth.cargando);
  const [feedback, setFeedback] = useState<FeedbackContent | null>(null);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<RecoveryValues>({
    resolver: zodResolver(recuperacionContrasenaSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async ({ email }: RecoveryValues) => {
    try {
      await dispatch(requestPasswordReset(email)).unwrap();
      setFeedback({
        title: 'Revise su correo',
        message:
          'Si la cuenta existe, recibirá un enlace seguro para restablecer su contraseña.',
        tone: 'success',
      });
    } catch (error) {
      setFeedback({
        title: 'No se pudo enviar el enlace',
        message:
          error instanceof Error ? error.message : 'Intente nuevamente más tarde.',
        tone: 'error',
      });
    }
  };

  return (
    <AuthShell
      eyebrow="RECUPERACIÓN DE ACCESO"
      title="Recupere su cuenta"
      description="Enviaremos un enlace de un solo uso al correo asociado a su perfil."
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
      <Pressable
        accessibilityRole="button"
        className="min-h-12 items-center justify-center rounded-xl bg-primario px-4"
        disabled={isSubmitting || cargando}
        onPress={() => {
          void handleSubmit(onSubmit)();
        }}
      >
        <Text className="font-bold text-white" selectable>
          {isSubmitting || cargando ? 'Enviando enlace…' : 'Enviar enlace seguro'}
        </Text>
      </Pressable>
      <Link href="/(auth)/login" asChild>
        <Pressable accessibilityRole="link" className="min-h-11 items-center justify-center">
          <Text className="font-semibold text-secundario" selectable>
            Volver al inicio de sesión
          </Text>
        </Pressable>
      </Link>
      <FeedbackBottomSheet
        content={feedback}
        onDismiss={() => setFeedback(null)}
      />
    </AuthShell>
  );
}
