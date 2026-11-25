import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import type { z } from 'zod';
import { colors, fontFamilies, radius } from '@theme/tokens';
import { inicioSesionSchema } from '@/domain/schemas/authSchemas';
import { AuthShell } from '@/presentation/components/auth/AuthShell';
import { AuthTextField } from '@/presentation/components/auth/AuthTextField';
import {
  FeedbackBottomSheet,
  type FeedbackContent,
} from '@/presentation/components/auth/FeedbackBottomSheet';
import { AnimatedButton } from '@/presentation/components/ui/AnimatedButton';
import { useAppDispatch, useAppSelector } from '@/presentation/store';
import { clearAuthError, signIn } from '@/presentation/store/slices/authSlice';
import { hapticSuccess } from '@/presentation/utils/haptics';

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
      hapticSuccess();
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
      description="Ingrese con las credenciales institucionales entregadas por su coordinador."
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
      <Controller
        control={control}
        name="password"
        render={({ field, fieldState }) => (
          <AuthTextField
            label="Contraseña"
            placeholder="Ingrese su contraseña"
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
      <AnimatedButton
        title={isSubmitting || cargando ? 'Verificando…' : 'Ingresar de forma segura'}
        variant="primaryAccent"
        loading={isSubmitting || cargando}
        haptic="medium"
        onPress={() => {
          void handleSubmit(onSubmit)();
        }}
      />
      {authError ? (
        <View
          style={{
            backgroundColor: colors.errorFondo,
            borderColor: colors.errorBorde,
            borderWidth: 1,
            borderRadius: radius.md,
            padding: 12,
          }}
        >
          <Text
            style={{
              fontFamily: fontFamilies.bodyMedium,
              fontSize: 13,
              lineHeight: 19,
              color: colors.error,
            }}
            selectable
          >
            {authError}
          </Text>
        </View>
      ) : null}
      <View className="items-center gap-3 pt-1">
        <Link href="/(auth)/recover-password" asChild>
          <Pressable
            accessibilityRole="link"
            style={{
              minHeight: 48,
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: 12,
            }}
          >
            <Text
              style={{
                fontFamily: fontFamilies.bodyBold,
                fontSize: 14,
                color: colors.moradoPrincipal,
              }}
              selectable
            >
              ¿Olvidó su contraseña?
            </Text>
          </Pressable>
        </Link>
        <View
          style={{
            width: '100%',
            backgroundColor: colors.lavandaSuave,
            borderRadius: radius.md,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <Text
            style={{
              textAlign: 'center',
              fontFamily: fontFamilies.bodyMedium,
              fontSize: 12,
              lineHeight: 18,
              color: colors.grisCarbon,
            }}
            selectable
          >
            ¿Necesita acceso? Solicite el aprovisionamiento a su coordinador provincial o de recinto.
          </Text>
        </View>
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
