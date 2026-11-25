import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pressable, Text, View } from 'react-native';
import type { z } from 'zod';
import { colors, fontFamilies, radius } from '@theme/tokens';
import { registroSubordinadoSchema } from '@/domain/schemas/authSchemas';
import { AuthShell } from '@/presentation/components/auth/AuthShell';
import { AuthTextField } from '@/presentation/components/auth/AuthTextField';
import {
  FeedbackBottomSheet,
  type FeedbackContent,
} from '@/presentation/components/auth/FeedbackBottomSheet';
import { AnimatedButton } from '@/presentation/components/ui/AnimatedButton';
import { RoleBadge } from '@/presentation/components/ui/RoleBadge';
import { volverSeguro } from '@/presentation/navigation/volverSeguro';
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
      <View
        style={{
          backgroundColor: colors.lavandaSuave,
          borderColor: colors.bordeLavanda,
          borderWidth: 1,
          borderRadius: radius.md,
          padding: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <Text
          style={{
            fontFamily: fontFamilies.bodySemiBold,
            fontSize: 13,
            color: colors.grisCarbon,
          }}
          selectable
        >
          Rol asignado
        </Text>
        <RoleBadge role={rol} />
      </View>

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
            showPasswordToggle
          />
        )}
      />
      <AnimatedButton
        title={isSubmitting || cargando ? 'Creando cuenta…' : 'Crear y enviar verificación'}
        variant="primaryAccent"
        loading={isSubmitting || cargando}
        haptic="medium"
        onPress={() => {
          void handleSubmit(onSubmit)();
        }}
      />
      <Pressable
        accessibilityRole="button"
        style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
        onPress={() => volverSeguro('/usuarios')}
      >
        <Text
          style={{
            fontFamily: fontFamilies.bodyBold,
            fontSize: 14,
            color: colors.moradoPrincipal,
          }}
          selectable
        >
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
