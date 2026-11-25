import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import BottomSheet, { useBottomSheetInternal } from '@gorhom/bottom-sheet';
import { Keyboard, Pressable, Text, View } from 'react-native';
import type { z } from 'zod';
import { crearPersonalSchema } from '@/domain/schemas/personalSchemas';
import type { CrearPersonalDTO } from '@/domain/ports/IPersonalTerritorialRepository';
import { AuthTextField } from '@/presentation/components/auth/AuthTextField';
import { useAppDispatch, useAppSelector } from '@/presentation/store';
import { crearPersonal, clearUltimoCreado } from '@/presentation/store/slices/personalSlice';

type CrearPersonalInput = z.input<typeof crearPersonalSchema>;

interface CrearPersonalBottomSheetProps {
  rolEsperado: 'COORDINADOR_RECINTO' | 'VEEDOR';
  rolNombre: string;
  recintoId?: string;
  isOpen: boolean;
  onDismiss: () => void;
  onSuccess?: () => void;
}

export function CrearPersonalBottomSheet({
  rolEsperado,
  rolNombre,
  recintoId,
  isOpen,
  onDismiss,
  onSuccess,
}: CrearPersonalBottomSheetProps) {
  const dispatch = useAppDispatch();
  const { creando, error } = useAppSelector((state) => state.personal);
  const { snapPoints } = useBottomSheetInternal();
  const [errorLocalizacion, setErrorLocalizacion] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
    reset,
  } = useForm<CrearPersonalInput>({
    resolver: zodResolver(crearPersonalSchema),
    defaultValues: {
      cedula: '',
      nombresCompletos: '',
      telefono: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: CrearPersonalInput) => {
    setErrorLocalizacion(null);
    dispatch(clearUltimoCreado());

    try {
      const nuevoPersonal: CrearPersonalDTO = {
        ...data,
        rol: rolEsperado,
        recintoId,
      };

      await dispatch(crearPersonal(nuevoPersonal)).unwrap();
      Keyboard.dismiss();
      reset();
      onDismiss();
      onSuccess?.();
    } catch (err) {
      setErrorLocalizacion(
        err instanceof Error ? err.message : 'Error al crear el usuario',
      );
    }
  };

  return (
    <BottomSheet
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={() => {
        onDismiss();
        setErrorLocalizacion(null);
        reset();
      }}
      backdropComponent={() =>
        isOpen ? (
          <Pressable
            onPress={onDismiss}
            className="absolute inset-0 bg-black/50"
          />
        ) : null
      }
    >
      <View className="gap-4 px-6 pb-12">
        <View className="gap-1">
          <Text className="text-xl font-bold text-texto">
            Crear {rolNombre}
          </Text>
          <Text className="text-sm text-slate-600">
            Proporcione los datos del nuevo usuario
          </Text>
        </View>

        <Text className="rounded-xl bg-lavanda px-4 py-3 font-body-semibold text-sm text-primario">
          Rol: {rolNombre}
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
              showPasswordToggle
            />
          )}
        />

        <Text className="text-xs leading-5 text-slate-600">
          Mínimo 10 caracteres. Incluir mayúscula, minúscula, número y símbolo.
        </Text>

        {errorLocalizacion || error ? (
          <View className="rounded-xl bg-red-50 p-4">
            <Text className="text-sm text-red-700">
              {errorLocalizacion || error}
            </Text>
          </View>
        ) : null}

        <Pressable
          onPress={() => {
            void handleSubmit(onSubmit)();
          }}
          disabled={isSubmitting || creando}
          className="min-h-12 items-center justify-center rounded-xl bg-primario px-4"
        >
          <Text className="font-bold text-white">
            {isSubmitting || creando ? 'Creando…' : 'Crear y enviar verificación'}
          </Text>
        </Pressable>

        <Pressable
          onPress={onDismiss}
          disabled={isSubmitting}
          className="min-h-11 items-center justify-center"
        >
          <Text className="font-semibold text-secundario">Cancelar</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}
