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
      setErrorMsg(
        typeof error === 'string'
          ? error
          : error instanceof Error
            ? error.message
            : 'Error al guardar',
      );
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
      backgroundStyle={{ backgroundColor: '#FFFFFF', borderRadius: 24 }}
      handleIndicatorStyle={{ backgroundColor: '#D4BFE0', width: 44 }}
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
      <BottomSheetScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="px-6 pb-8 pt-4"
      >
        <Text className="font-display text-3xl uppercase text-primario">Editar nombre</Text>
        <Text className="mt-1 font-body text-sm text-texto-secundario">
          Actualiza tu nombre visible en el sistema electoral
        </Text>

        <Controller
          control={control}
          name="nuevoNombre"
          render={({ field, fieldState }) => (
            <View className="mt-6 gap-2">
              <Text className="font-body-semibold text-sm text-texto">Nombre completo</Text>
              <BottomSheetTextInput
                accessibilityLabel="Nombre completo"
                value={field.value}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                autoCapitalize="words"
                autoComplete="name"
                editable={!guardando}
                selectionColor="#6F2C91"
                className={`min-h-12 rounded-xl border-[1.5px] bg-white px-4 font-body text-base text-texto ${
                  fieldState.error ? 'border-alerta bg-red-50' : 'border-borde-lavanda'
                }`}
              />
              {fieldState.error ? (
                <Text className="font-body-semibold text-xs text-alerta">
                  {fieldState.error.message}
                </Text>
              ) : null}
            </View>
          )}
        />

        {errorMsg && (
          <Text className="mt-4 font-body-semibold text-sm text-alerta">{errorMsg}</Text>
        )}

        <Pressable
          onPress={() => void handleSubmit(onSubmit)()}
          disabled={guardando || isSubmitting}
          className="mt-6 min-h-12 items-center justify-center rounded-xl bg-primario px-4"
        >
          <Text className="font-body-bold text-amarillo">
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => modalRef.current?.dismiss()}
          disabled={guardando || isSubmitting}
          className="mt-3 min-h-12 items-center justify-center rounded-xl border border-borde-lavanda bg-white px-4"
        >
          <Text className="font-body-semibold text-primario">Cancelar</Text>
        </Pressable>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}
