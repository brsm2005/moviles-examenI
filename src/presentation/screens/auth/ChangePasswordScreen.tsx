import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import type { z } from 'zod';
import { colors, fontFamilies, radius } from '@theme/tokens';
import { cambioContrasenaSchema } from '@/domain/schemas/authSchemas';
import { AuthShell } from '@/presentation/components/auth/AuthShell';
import { AuthTextField } from '@/presentation/components/auth/AuthTextField';
import {
  FeedbackBottomSheet,
  type FeedbackContent,
} from '@/presentation/components/auth/FeedbackBottomSheet';
import { AnimatedButton } from '@/presentation/components/ui/AnimatedButton';
import { useAppDispatch, useAppSelector } from '@/presentation/store';
import { changeInitialPassword } from '@/presentation/store/slices/authSlice';

type PasswordValues = z.input<typeof cambioContrasenaSchema>;

export function ChangePasswordScreen() {
  const dispatch = useAppDispatch();
  const { flow } = useLocalSearchParams<{ flow?: string }>();
  const perfil = useAppSelector((state) => state.auth.perfil);
  const cargando = useAppSelector((state) => state.auth.cargando);
  const [feedback, setFeedback] = useState<FeedbackContent | null>(null);
  const [completed, setCompleted] = useState(false);
  const obligatorio = perfil?.mustChangePassword === true;
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<PasswordValues>({
    resolver: zodResolver(cambioContrasenaSchema),
    defaultValues: { password: '', confirmarPassword: '' },
  });

  const onSubmit = async ({ password }: PasswordValues) => {
    try {
      await dispatch(changeInitialPassword(password)).unwrap();
      setFeedback({
        title: 'Contraseña actualizada',
        message: 'Su nueva contraseña ya está activa. Puede continuar a su espacio de trabajo.',
        tone: 'success',
      });
      setCompleted(true);
    } catch (error) {
      setFeedback({
        title: 'No se pudo cambiar la contraseña',
        message:
          error instanceof Error ? error.message : 'Intente nuevamente más tarde.',
        tone: 'error',
      });
    }
  };

  return (
    <AuthShell
      eyebrow={obligatorio ? 'ACCIÓN REQUERIDA' : 'SEGURIDAD DE LA CUENTA'}
      title={obligatorio ? 'Cree su contraseña personal' : 'Cambie su contraseña'}
      description={
        obligatorio
          ? 'Por seguridad, debe reemplazar la contraseña temporal antes de acceder al sistema.'
          : flow === 'recovery'
            ? 'Elija una contraseña nueva para recuperar el acceso a su cuenta.'
            : 'Defina una contraseña nueva y segura para su cuenta.'
      }
    >
      <Controller
        control={control}
        name="password"
        render={({ field, fieldState }) => (
          <AuthTextField
            label="Nueva contraseña"
            autoCapitalize="none"
            autoComplete="new-password"
            secureTextEntry
            textContentType="newPassword"
            value={field.value}
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            error={fieldState.error?.message}
            showPasswordToggle
          />
        )}
      />
      <Controller
        control={control}
        name="confirmarPassword"
        render={({ field, fieldState }) => (
          <AuthTextField
            label="Confirme la contraseña"
            autoCapitalize="none"
            autoComplete="new-password"
            secureTextEntry
            textContentType="newPassword"
            value={field.value}
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            error={fieldState.error?.message}
            showPasswordToggle
          />
        )}
      />
      <View
        style={{
          backgroundColor: colors.cremaLimon,
          borderRadius: radius.md,
          paddingHorizontal: 14,
          paddingVertical: 10,
        }}
      >
        <Text
          style={{
            fontFamily: fontFamilies.bodyMedium,
            fontSize: 13,
            lineHeight: 19,
            color: colors.grisCarbon,
          }}
          selectable
        >
          Use al menos 10 caracteres. Se recomienda combinar letras, números y símbolos.
        </Text>
      </View>
      <AnimatedButton
        title={isSubmitting || cargando ? 'Actualizando…' : 'Guardar contraseña'}
        variant="primaryAccent"
        loading={isSubmitting || cargando}
        onPress={() => {
          void handleSubmit(onSubmit)();
        }}
      />
      <FeedbackBottomSheet
        content={feedback}
        onDismiss={() => {
          setFeedback(null);
          if (completed) router.replace('/');
        }}
      />
    </AuthShell>
  );
}
