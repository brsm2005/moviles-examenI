import { zodResolver } from '@hookform/resolvers/zod';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { Link, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  type TextInputProps,
  View,
} from 'react-native';
import type { z } from 'zod';
import type { Recinto } from '@/domain/entities/Recinto';
import { nuevoRecintoSchema } from '@/domain/schemas/territorioSchemas';
import {
  FeedbackBottomSheet,
  type FeedbackContent,
} from '@/presentation/components/auth/FeedbackBottomSheet';
import { useAppDispatch, useAppSelector } from '@/presentation/store';
import {
  asignarCoordinadorRecinto,
  cargarCatalogoTerritorial,
  cargarCoordinadoresRecinto,
  cargarProvinciaActual,
  clearTerritorioError,
  crearRecinto,
} from '@/presentation/store/slices/territorioSlice';
import { signOut } from '@/presentation/store/slices/authSlice';

type NuevoRecintoForm = z.input<typeof nuevoRecintoSchema>;

function mostrarError(error: unknown): string {
  return error instanceof Error ? error.message : 'Intente nuevamente.';
}

interface RecintoSheetFieldProps extends TextInputProps {
  label: string;
  error?: string;
}

function RecintoSheetField({
  label,
  error,
  ...inputProps
}: RecintoSheetFieldProps) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-slate-700" selectable>
        {label}
      </Text>
      <BottomSheetTextInput
        {...inputProps}
        className={`min-h-12 rounded-xl border bg-white px-4 text-base text-texto ${
          error ? 'border-red-500' : 'border-slate-300'
        }`}
        placeholderTextColor="#64748B"
      />
      {error ? (
        <Text className="text-sm text-red-700" selectable>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function ProvincialTerritoryScreen() {
  const dispatch = useAppDispatch();
  const {
    recintos,
    coordinadoresRecinto,
    provincia,
    cargandoCatalogo,
    cargandoPersonal,
    guardando,
    error,
    catalogoOffline,
  } = useAppSelector((state) => state.territorio);
  const addVenueSheetRef = useRef<BottomSheetModal>(null);
  const coordinatorSheetRef = useRef<BottomSheetModal>(null);
  const [recintoSeleccionado, setRecintoSeleccionado] =
    useState<Recinto | null>(null);
  const [feedback, setFeedback] = useState<FeedbackContent | null>(null);
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<NuevoRecintoForm>({
    resolver: zodResolver(nuevoRecintoSchema),
    defaultValues: {
      nombre: '',
      canton: '',
      parroquia: '',
      direccion: '',
    },
  });
  const coordinadoresAsignados = new Set(
    recintos
      .map((recinto) => recinto.coordinadorRecintoId)
      .filter((id): id is string => id !== null),
  );
  const coordinadoresDisponibles = coordinadoresRecinto.filter(
    (coordinator) => !coordinadoresAsignados.has(coordinator.id),
  );

  useEffect(() => {
    void dispatch(cargarCatalogoTerritorial());
    void dispatch(cargarProvinciaActual());
    void dispatch(cargarCoordinadoresRecinto());
  }, [dispatch]);

  const onCreateVenue = async (values: NuevoRecintoForm) => {
    try {
      await dispatch(crearRecinto(values)).unwrap();
      addVenueSheetRef.current?.dismiss();
      reset();
      setFeedback({
        title: 'Recinto agregado',
        message: 'El recinto quedó registrado en su jurisdicción.',
        tone: 'success',
      });
    } catch (submitError) {
      setFeedback({
        title: 'No se pudo agregar el recinto',
        message: mostrarError(submitError),
        tone: 'error',
      });
    }
  };

  const onAssignCoordinator = async (coordinadorId: string) => {
    if (!recintoSeleccionado) return;
    try {
      await dispatch(
        asignarCoordinadorRecinto({
          recintoId: recintoSeleccionado.id,
          coordinadorId,
        }),
      ).unwrap();
      coordinatorSheetRef.current?.dismiss();
      setFeedback({
        title: 'Coordinador asignado',
        message: `La coordinación de ${recintoSeleccionado.nombre} quedó asignada.`,
        tone: 'success',
      });
      setRecintoSeleccionado(null);
      void dispatch(cargarCoordinadoresRecinto());
    } catch (assignmentError) {
      setFeedback({
        title: 'No se pudo asignar el coordinador',
        message: mostrarError(assignmentError),
        tone: 'error',
      });
    }
  };

  const onSignOut = async () => {
    try {
      await dispatch(signOut()).unwrap();
      router.replace('/(auth)/login');
    } catch (signOutError) {
      setFeedback({
        title: 'No se pudo cerrar la sesión',
        message: mostrarError(signOutError),
        tone: 'error',
      });
    }
  };

  const abrirAsignacion = (recinto: Recinto) => {
    dispatch(clearTerritorioError());
    setRecintoSeleccionado(recinto);
    coordinatorSheetRef.current?.present();
  };

  return (
    <>
      <ScrollView
        className="flex-1 bg-fondo"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-6 px-5 pb-12 pt-6"
      >
        <View className="gap-4">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1 gap-2">
              <Text className="text-xs font-bold tracking-[2px] text-secundario" selectable>
                COORDINACIÓN PROVINCIAL
              </Text>
              <Text className="text-3xl font-bold text-texto" selectable>
                Gestión territorial
              </Text>
              <Text className="text-base leading-6 text-slate-600" selectable>
                Administre los recintos y asigne un coordinador responsable a cada uno.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar sesión"
              className="min-h-12 min-w-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-3"
              onPress={onSignOut}
            >
              <Text className="text-xs font-bold text-texto" selectable>
                Salir
              </Text>
            </Pressable>
          </View>
          <View className="flex-row items-center justify-between rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
            <View className="gap-1">
              <Text className="text-xs font-bold uppercase tracking-wide text-secundario" selectable>
                Jurisdicción
              </Text>
              <Text className="text-base font-bold text-texto" selectable>
                {provincia ?? 'Sin provincia configurada'}
              </Text>
            </View>
            {catalogoOffline ? (
              <Text className="rounded-full bg-amber-100 px-3 py-2 text-xs font-bold text-amber-900" selectable>
                Modo sin conexión
              </Text>
            ) : null}
          </View>
        </View>

        {error ? (
          <View className="gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
            <Text className="text-sm leading-5 text-red-800" selectable>
              {error}
            </Text>
            <Pressable
              accessibilityRole="button"
              className="min-h-11 justify-center"
              onPress={() => {
                dispatch(clearTerritorioError());
                void dispatch(cargarCatalogoTerritorial());
                void dispatch(cargarProvinciaActual());
                void dispatch(cargarCoordinadoresRecinto());
              }}
            >
              <Text className="font-bold text-red-900" selectable>
                Reintentar carga
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View className="flex-row flex-wrap gap-3">
          <Link href="/(provincial)/monitoreo" asChild>
            <Pressable accessibilityRole="button" className="min-h-12 w-full items-center justify-center rounded-xl bg-primario px-4">
              <Text className="font-bold text-white" selectable>Monitoreo provincial</Text>
            </Pressable>
          </Link>
          <Link href="/ajustes" asChild>
            <Pressable accessibilityRole="button" className="min-h-12 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4">
              <Text className="font-bold text-texto" selectable>Perfil y ajustes</Text>
            </Pressable>
          </Link>
          <Pressable
            accessibilityRole="button"
            className="min-h-12 flex-1 items-center justify-center rounded-xl bg-primario px-4"
            disabled={!provincia || catalogoOffline}
            onPress={() => addVenueSheetRef.current?.present()}
          >
            <Text className="text-center font-bold text-white" selectable>
              Agregar recinto
            </Text>
          </Pressable>
          <Link href="/(auth)/register-subordinate" asChild>
            <Pressable
              accessibilityRole="button"
              className="min-h-12 flex-1 items-center justify-center rounded-xl border border-primario bg-white px-4"
            >
              <Text className="text-center font-bold text-primario" selectable>
                Crear coordinador
              </Text>
            </Pressable>
          </Link>
        </View>

        <View className="gap-4">
          <View className="flex-row items-center justify-between gap-3">
            <Text className="text-xl font-bold text-texto" selectable>
              Recintos
            </Text>
            <Pressable
              accessibilityRole="button"
              className="min-h-11 justify-center px-2"
              disabled={cargandoCatalogo}
              onPress={() => {
                void dispatch(cargarCatalogoTerritorial());
                void dispatch(cargarProvinciaActual());
                void dispatch(cargarCoordinadoresRecinto());
              }}
            >
              <Text className="font-bold text-primario" selectable>
                Actualizar
              </Text>
            </Pressable>
          </View>
          {cargandoCatalogo && recintos.length === 0 ? (
            <View className="items-center gap-3 rounded-2xl bg-white p-8">
              <ActivityIndicator size="large" color="#1B365D" />
              <Text className="text-center text-slate-600" selectable>
                Cargando recintos y catálogos…
              </Text>
            </View>
          ) : recintos.length === 0 ? (
            <View className="gap-2 rounded-2xl border border-dashed border-slate-300 bg-white p-6">
              <Text className="text-lg font-bold text-texto" selectable>
                Aún no hay recintos
              </Text>
              <Text className="leading-6 text-slate-600" selectable>
                Agregue el primer recinto de la jurisdicción para comenzar las asignaciones.
              </Text>
            </View>
          ) : (
            recintos.map((recinto) => {
              const coordinador = coordinadoresRecinto.find(
                (person) => person.id === recinto.coordinadorRecintoId,
              );
              return (
                <View
                  key={recinto.id}
                  className="gap-4 rounded-2xl border border-slate-200 bg-white p-5"
                >
                  <View className="gap-1">
                    <Text className="text-lg font-bold text-texto" selectable>
                      {recinto.nombre}
                    </Text>
                    <Text className="leading-5 text-slate-600" selectable>
                      {recinto.canton} · {recinto.parroquia ?? 'Parroquia no indicada'}
                    </Text>
                    {recinto.direccion ? (
                      <Text className="text-sm text-slate-500" selectable>
                        {recinto.direccion}
                      </Text>
                    ) : null}
                  </View>
                  <View className="flex-row items-center justify-between gap-3 border-t border-slate-100 pt-3">
                    <View className="flex-1 gap-1">
                      <Text className="text-xs font-bold uppercase tracking-wide text-slate-500" selectable>
                        Coordinador de recinto
                      </Text>
                      <Text className="font-semibold text-texto" selectable>
                        {recinto.coordinadorRecintoId
                          ? coordinador?.nombresCompletos ??
                            'Coordinador asignado'
                          : 'Pendiente de asignación'}
                      </Text>
                    </View>
                    {!recinto.coordinadorRecintoId ? (
                      <Pressable
                        accessibilityRole="button"
                        className="min-h-11 justify-center rounded-lg bg-blue-50 px-3"
                        onPress={() => abrirAsignacion(recinto)}
                      >
                        <Text className="text-sm font-bold text-primario" selectable>
                          Asignar
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <BottomSheetModal
        ref={addVenueSheetRef}
        snapPoints={['78%']}
        enablePanDownToClose
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...props}
            disappearsOnIndex={-1}
            appearsOnIndex={0}
          />
        )}
        backgroundStyle={{ backgroundColor: '#FFFFFF' }}
        handleIndicatorStyle={{ backgroundColor: '#CBD5E1' }}
      >
        <BottomSheetScrollView
          className="flex-1"
          contentContainerClassName="gap-5 px-6 pb-10 pt-3"
          keyboardShouldPersistTaps="handled"
        >
          <View className="gap-2">
            <Text className="text-2xl font-bold text-texto" selectable>
              Nuevo recinto
            </Text>
            <Text className="text-base leading-6 text-slate-600" selectable>
              Se registrará en {provincia ?? 'la provincia de su perfil'}.
            </Text>
          </View>
          <Controller
            control={control}
            name="nombre"
            render={({ field, fieldState }) => (
              <RecintoSheetField
                label="Nombre del recinto"
                autoCapitalize="words"
                value={field.value}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="canton"
            render={({ field, fieldState }) => (
              <RecintoSheetField
                label="Cantón"
                autoCapitalize="words"
                value={field.value}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="parroquia"
            render={({ field, fieldState }) => (
              <RecintoSheetField
                label="Parroquia"
                autoCapitalize="words"
                value={field.value}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="direccion"
            render={({ field, fieldState }) => (
              <RecintoSheetField
                label="Dirección (opcional)"
                value={field.value}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                placeholder="Calle o referencia"
                error={fieldState.error?.message}
              />
            )}
          />
          <Pressable
            accessibilityRole="button"
            className="min-h-12 items-center justify-center rounded-xl bg-primario px-4"
            disabled={guardando || isSubmitting}
            onPress={() => {
              void handleSubmit(onCreateVenue)();
            }}
          >
            <Text className="font-bold text-white" selectable>
              {guardando || isSubmitting ? 'Guardando…' : 'Guardar recinto'}
            </Text>
          </Pressable>
        </BottomSheetScrollView>
      </BottomSheetModal>

      <BottomSheetModal
        ref={coordinatorSheetRef}
        snapPoints={['58%']}
        enablePanDownToClose
        onDismiss={() => setRecintoSeleccionado(null)}
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...props}
            disappearsOnIndex={-1}
            appearsOnIndex={0}
          />
        )}
        backgroundStyle={{ backgroundColor: '#FFFFFF' }}
        handleIndicatorStyle={{ backgroundColor: '#CBD5E1' }}
      >
        <BottomSheetScrollView
          className="flex-1"
          contentContainerClassName="gap-4 px-6 pb-10 pt-3"
        >
          <View className="gap-2">
            <Text className="text-2xl font-bold text-texto" selectable>
              Asignar coordinador
            </Text>
            <Text className="text-base leading-6 text-slate-600" selectable>
              {recintoSeleccionado?.nombre} admite una sola coordinación.
            </Text>
          </View>
          {cargandoPersonal ? (
            <ActivityIndicator size="large" color="#1B365D" />
          ) : coordinadoresDisponibles.length === 0 ? (
            <View className="gap-3 rounded-2xl bg-blue-50 p-4">
              <Text className="leading-6 text-slate-700" selectable>
                No hay coordinadores disponibles. Cree una cuenta subordinada y actualice la lista.
              </Text>
              <Link href="/(auth)/register-subordinate" asChild>
                <Pressable
                  accessibilityRole="button"
                  className="min-h-11 items-center justify-center rounded-lg bg-primario px-3"
                >
                  <Text className="font-bold text-white" selectable>
                    Crear coordinador
                  </Text>
                </Pressable>
              </Link>
              <Pressable
                accessibilityRole="button"
                className="min-h-11 justify-center"
                onPress={() => void dispatch(cargarCoordinadoresRecinto())}
              >
                <Text className="font-bold text-primario" selectable>
                  Actualizar coordinadores
                </Text>
              </Pressable>
            </View>
          ) : (
            coordinadoresDisponibles.map((coordinador) => (
              <Pressable
                key={coordinador.id}
                accessibilityRole="button"
                className="min-h-16 justify-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-3"
                disabled={guardando}
                onPress={() => void onAssignCoordinator(coordinador.id)}
              >
                <Text className="font-bold text-texto" selectable>
                  {coordinador.nombresCompletos}
                </Text>
                <Text className="text-sm text-slate-500" selectable>
                  C.I. {coordinador.cedula}
                </Text>
              </Pressable>
            ))
          )}
          {error ? (
            <Text className="text-sm leading-5 text-red-700" selectable>
              {error}
            </Text>
          ) : null}
        </BottomSheetScrollView>
      </BottomSheetModal>

      <FeedbackBottomSheet
        content={feedback}
        onDismiss={() => setFeedback(null)}
      />
    </>
  );
}
