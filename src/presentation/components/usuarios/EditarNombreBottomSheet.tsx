import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pressable, Text, View } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { editarNombreSchema } from '@/domain/schemas/usuariosSchemas';
import type { z } from 'zod';
import { AuthTextField } from '@/presentation/components/auth/AuthTextField';
import { useAppDispatch } from '@/presentation/store';
import { editarNombrePropio } from '@/presentation/store/slices/usuariosSlice';

type EditarNombreValues = z.input<typeof editarNombreSchema>;

interface EditarNombreBottomSheetProps {
  usuarioId: string;
  nombreActual: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditarNombreBottomSheet({
  usuarioId,
  nombreActual,
  isOpen,
  onClose,
  onSuccess,
}: EditarNombreBottomSheetProps) {
  const dispatch = useAppDispatch();
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { control, handleSubmit, formState: { isSubmitting }, reset } = useForm<EditarNombreValues>({
    resolver: zodResolver(editarNombreSchema),
    defaultValues: { nuevoNombre: nombreActual },
  });

  const onSubmit = async (datos: EditarNombreValues) => {
    setGuardando(true);
    setErrorMsg(null);
    try {
      await dispatch(editarNombrePropio({ id: usuarioId, nuevoNombre: datos.nuevoNombre })).unwrap();
      reset();
      onClose();
      onSuccess?.();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <BottomSheet snapPoints={[200, 400]} onClose={onClose} enablePanDownToClose>
      <View className="flex-1 px-6 py-6">
        <Text className="text-2xl font-bold text-texto">Editar nombre</Text>
        <Text className="mt-2 text-sm text-slate-600">Actualiza tu nombre en el sistema</Text>

        <Controller
          control={control}
          name="nuevoNombre"
          render={({ field, fieldState }) => (
            <View className="mt-6">
              <AuthTextField
                label="Nombre completo"
                value={field.value}
                onChangeText={field.onChange}
                error={fieldState.error?.message}
                autoCapitalize="words"
              />
            </View>
          )}
        />

        {errorMsg && (
          <Text className="mt-4 text-sm text-red-600">{errorMsg}</Text>
        )}

        <Pressable
          onPress={() => void handleSubmit(onSubmit)()}
          disabled={guardando || isSubmitting}
          className="mt-6 min-h-12 items-center justify-center rounded-xl bg-primario"
        >
          <Text className="font-bold text-white">
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </Text>
        </Pressable>

        <Pressable
          onPress={onClose}
          className="mt-3 min-h-10 items-center justify-center rounded-xl border border-slate-300"
        >
          <Text className="font-semibold text-texto">Cancelar</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}
