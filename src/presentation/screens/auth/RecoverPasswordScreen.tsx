import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { Pressable, Text } from 'react-native';
import type { z } from 'zod';
import { colors, fontFamilies } from '@theme/tokens';
import { recuperacionContrasenaSchema } from '@/domain/schemas/authSchemas';
import { AuthShell } from '@/presentation/components/auth/AuthShell';
import { AuthTextField } from '@/presentation/components/auth/AuthTextField';
import {
  FeedbackBottomSheet,
  type FeedbackContent,
} from '@/presentation/components/auth/FeedbackBottomSheet';
import { AnimatedButton } from '@/presentation/components/ui/AnimatedButton';
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
            placeholder="usuario@organizacion.ec"
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
      <AnimatedButton
        title={isSubmitting || cargando ? 'Enviando enlace…' : 'Enviar enlace seguro'}
        variant="primaryAccent"
        loading={isSubmitting || cargando}
        onPress={() => {
          void handleSubmit(onSubmit)();
        }}
      />
      <Link href="/(auth)/login" asChild>
        <Pressable
          accessibilityRole="link"
          style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text
            style={{
              fontFamily: fontFamilies.bodyBold,
              fontSize: 14,
              color: colors.moradoPrincipal,
            }}
            selectable
          >
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
