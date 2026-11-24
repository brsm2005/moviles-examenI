import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Keyboard, Pressable, Text, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { editarNombreSchema } from '@/domain/schemas/usuariosSchemas';
import type { z } from 'zod';
import { useAppDispatch } from '@/presentation/store';
import { actualizarNombrePropio } from '@/presentation/store/slices/authSlice';

type EditarNombreValues = z.input<typeof editarNombreSchema>;

interface EditarNombreBottomSheetProps {
  nombreActual: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditarNombreBottomSheet({
  nombreActual,
  isOpen,
  onClose,
  onSuccess,
}: EditarNombreBottomSheetProps) {
  const dispatch = useAppDispatch();
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const modalRef = useRef<BottomSheetModal>(null);
  const guardandoRef = useRef(false);
  const guardadoRef = useRef(false);
  const nombreActualRef = useRef(nombreActual);

  const { control, handleSubmit, formState: { isSubmitting }, reset } = useForm<EditarNombreValues>({
    resolver: zodResolver(editarNombreSchema),
    defaultValues: { nuevoNombre: nombreActual },
  });

  useEffect(() => {
    nombreActualRef.current = nombreActual;
  }, [nombreActual]);

  useEffect(() => {
    if (!isOpen) return;
    reset({ nuevoNombre: nombreActualRef.current });
    const frame = requestAnimationFrame(() => modalRef.current?.present());
    return () => cancelAnimationFrame(frame);
  }, [isOpen, reset]);

  const onSubmit = async (datos: EditarNombreValues) => {
    if (guardandoRef.current) return;
    guardandoRef.current = true;
    setGuardando(true);
    setErrorMsg(null);
    try {
      await dispatch(actualizarNombrePropio(datos.nuevoNombre)).unwrap();
      guardadoRef.current = true;
      Keyboard.dismiss();
      modalRef.current?.dismiss();
    } catch (error) {
      setErrorMsg(typeof error === 'string' ? error : error instanceof Error ? error.message : 'Error al guardar');
    } finally {
      guardandoRef.current = false;
      setGuardando(false);
    }
  };

  return (
    <BottomSheetModal
      ref={modalRef}
      snapPoints={['65%']}
      enableDynamicSizing={false}
      enablePanDownToClose={!guardando}
      keyboardBehavior="interactive"
      onDismiss={() => {
        setErrorMsg(null);
        onClose();
        if (guardadoRef.current) {
          guardadoRef.current = false;
          onSuccess?.();
        }
      }}
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          pressBehavior={guardando ? 'none' : 'close'}
        />
      )}
    >
      <BottomSheetScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="px-6 pb-8 pt-4">
        <Text className="text-2xl font-bold text-texto">Editar nombre</Text>
        <Text className="mt-2 text-sm text-slate-600">Actualiza tu nombre en el sistema</Text>

        <Controller
          control={control}
          name="nuevoNombre"
          render={({ field, fieldState }) => (
            <View className="mt-6 gap-2">
              <Text className="text-sm font-semibold text-slate-700">Nombre completo</Text>
              <BottomSheetTextInput
                accessibilityLabel="Nombre completo"
                value={field.value}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                autoCapitalize="words"
                autoComplete="name"
                editable={!guardando}
                className={`min-h-12 rounded-xl border bg-white px-4 text-base text-texto ${
                  fieldState.error ? 'border-red-500' : 'border-slate-300'
                }`}
              />
              {fieldState.error ? (
                <Text className="text-sm text-red-700">{fieldState.error.message}</Text>
              ) : null}
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
          onPress={() => modalRef.current?.dismiss()}
          disabled={guardando || isSubmitting}
          className="mt-3 min-h-10 items-center justify-center rounded-xl border border-slate-300"
        >
          <Text className="font-semibold text-texto">Cancelar</Text>
        </Pressable>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}
