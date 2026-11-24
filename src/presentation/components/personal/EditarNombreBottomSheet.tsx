import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import BottomSheet, { useBottomSheetInternal } from '@gorhom/bottom-sheet';
import { Keyboard, Pressable, Text, View } from 'react-native';
import type { z } from 'zod';
import { actualizarPersonalSchema } from '@/domain/schemas/personalSchemas';
import { AuthTextField } from '@/presentation/components/auth/AuthTextField';
import { useAppDispatch, useAppSelector } from '@/presentation/store';
import { actualizarPersonal } from '@/presentation/store/slices/personalSlice';

type ActualizarPersonalInput = z.input<typeof actualizarPersonalSchema>;

interface EditarNombreBottomSheetProps {
  personalId: string;
  nombreActual: string;
  telefonoActual: string;
  isOpen: boolean;
  onDismiss: () => void;
  onSuccess?: () => void;
}

export function EditarNombreBottomSheet({
  personalId,
  nombreActual,
  telefonoActual,
  isOpen,
  onDismiss,
  onSuccess,
}: EditarNombreBottomSheetProps) {
  const dispatch = useAppDispatch();
  const { actualizando, error } = useAppSelector((state) => state.personal);
  const { snapPoints } = useBottomSheetInternal();
  const [errorLocalizacion, setErrorLocalizacion] = useState<string | null>(null);
  const previousIsOpen = useRef<boolean>(isOpen);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
    reset,
  } = useForm<ActualizarPersonalInput>({
    resolver: zodResolver(actualizarPersonalSchema),
    defaultValues: {
      id: personalId,
      nombresCompletos: nombreActual,
      telefono: telefonoActual,
    },
  });

  useEffect(() => {
    if (isOpen && !previousIsOpen.current) {
      reset({
        id: personalId,
        nombresCompletos: nombreActual,
        telefono: telefonoActual,
      });
      setErrorLocalizacion(null);
    }
    previousIsOpen.current = isOpen;
  }, [isOpen, personalId, nombreActual, telefonoActual, reset]);

  const onSubmit = async (data: ActualizarPersonalInput) => {
    setErrorLocalizacion(null);
    try {
      await dispatch(actualizarPersonal(data)).unwrap();
      Keyboard.dismiss();
      onDismiss();
      onSuccess?.();
    } catch (err) {
      setErrorLocalizacion(
        err instanceof Error ? err.message : 'Error al actualizar los datos',
      );
    }
  };

  return (
    <BottomSheet
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onDismiss}
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
        <Text className="text-xl font-bold text-texto">Editar información</Text>

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
          disabled={isSubmitting || actualizando === personalId}
          className="min-h-12 items-center justify-center rounded-xl bg-primario px-4"
        >
          <Text className="font-bold text-white">
            {isSubmitting || actualizando === personalId
              ? 'Guardando…'
              : 'Guardar cambios'}
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
