import { zodResolver } from '@hookform/resolvers/zod';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { Link, router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { colors, fontFamilies, radius, shadows, touchTarget } from '@theme/tokens';
import type { Recinto } from '@/domain/entities/Recinto';
import { nuevoRecintoSchema } from '@/domain/schemas/territorioSchemas';
import {
  FeedbackBottomSheet,
  type FeedbackContent,
} from '@/presentation/components/auth/FeedbackBottomSheet';
import { AnimatedButton } from '@/presentation/components/ui/AnimatedButton';
import { AnimatedProgressBar } from '@/presentation/components/ui/AnimatedProgressBar';
import { useAppDispatch, useAppSelector } from '@/presentation/store';
import { signOut } from '@/presentation/store/slices/authSlice';
import {
  asignarCoordinadorRecinto,
  cargarCatalogoTerritorial,
  cargarCoordinadoresRecinto,
  cargarProvinciaActual,
  clearTerritorioError,
  crearRecinto,
} from '@/presentation/store/slices/territorioSlice';
import { hapticSelection } from '@/presentation/utils/haptics';

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
      <Text className="font-body-semibold text-sm text-texto" selectable>
        {label}
      </Text>
      <BottomSheetTextInput
        {...inputProps}
        className={`min-h-12 rounded-xl border-[1.5px] bg-white px-4 font-body text-base text-texto ${
          error ? 'border-alerta bg-red-50' : 'border-borde-lavanda'
        }`}
        placeholderTextColor={colors.textoSecundario}
        selectionColor={colors.moradoPrincipal}
      />
      {error ? (
        <Text className="font-body-semibold text-xs text-alerta" selectable>
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
  const [filtroCanton, setFiltroCanton] = useState<string | null>(null);
  const [filtroParroquia, setFiltroParroquia] = useState<string | null>(null);
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

  const cantonesDisponibles = useMemo(
    () => [...new Set(recintos.map((r) => r.canton).filter(Boolean))].sort(),
    [recintos],
  );
  const parroquiasDisponibles = useMemo(() => {
    const base = filtroCanton
      ? recintos.filter((r) => r.canton === filtroCanton)
      : recintos;
    return [
      ...new Set(base.map((r) => r.parroquia).filter((p): p is string => Boolean(p))),
    ].sort();
  }, [recintos, filtroCanton]);

  const recintosFiltrados = useMemo(
    () =>
      recintos.filter((r) => {
        if (filtroCanton && r.canton !== filtroCanton) return false;
        if (filtroParroquia && r.parroquia !== filtroParroquia) return false;
        return true;
      }),
    [recintos, filtroCanton, filtroParroquia],
  );

  const recintosCubiertos = recintos.filter((r) => Boolean(r.coordinadorRecintoId)).length;
  const recintosPendientes = recintos.length - recintosCubiertos;
  const porcentajeCobertura =
    recintos.length > 0 ? Math.round((recintosCubiertos / recintos.length) * 100) : 0;

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
        className="flex-1 bg-malva"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-5 px-5 pb-12 pt-5"
      >
        {/* Encabezado ejecutivo en Morado Principal */}
        <View
          style={{
            backgroundColor: colors.moradoPrincipal,
            borderRadius: radius.xl,
            borderCurve: 'continuous',
            padding: 20,
            gap: 14,
            boxShadow: shadows.raised,
          }}
        >
          <View className="flex-row items-start justify-between gap-3">
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <Text
                style={{
                  fontFamily: fontFamilies.display,
                  fontSize: 34,
                  lineHeight: 36,
                  letterSpacing: 0.8,
                  color: colors.blancoPuro,
                  textTransform: 'uppercase',
                }}
                selectable
              >
                Gestión territorial
              </Text>
              <Text
                numberOfLines={2}
                style={{
                  fontFamily: fontFamilies.bodySemiBold,
                  fontSize: 15,
                  color: colors.amarilloPrincipal,
                }}
                selectable
              >
                {provincia ?? 'Sin provincia configurada'}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar sesión"
              onPress={onSignOut}
              style={({ pressed }) => ({
                minHeight: touchTarget.minHeight,
                minWidth: touchTarget.minWidth,
                paddingHorizontal: 14,
                borderRadius: radius.md,
                borderCurve: 'continuous',
                backgroundColor: pressed ? colors.moradoProfundo : colors.moradoOscuro,
                borderWidth: 1,
                borderColor: colors.moradoBorde,
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              })}
            >
              <Text
                style={{
                  fontFamily: fontFamilies.bodyBold,
                  fontSize: 12,
                  color: colors.blancoPuro,
                }}
                selectable
              >
                Salir
              </Text>
            </Pressable>
          </View>

          <Text
            style={{
              fontFamily: fontFamilies.bodyMedium,
              fontSize: 13,
              lineHeight: 19,
              color: colors.malvaPalido,
            }}
            selectable
          >
            Supervise la cobertura provincial de recintos y asigne responsables operativos.
          </Text>

          {catalogoOffline ? (
            <View
              style={{
                alignSelf: 'flex-start',
                backgroundColor: colors.cremaLimon,
                borderRadius: radius.full,
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}
            >
              <Text
                style={{
                  fontFamily: fontFamilies.bodyBold,
                  fontSize: 12,
                  color: colors.grisCarbon,
                }}
                selectable
              >
                Modo sin conexión · Lectura local
              </Text>
            </View>
          ) : null}
        </View>

        {/* Tarjeta resumen de cobertura en Lavanda Suave (#E4D4EC) */}
        <View
          style={{
            backgroundColor: colors.lavandaSuave,
            borderColor: colors.bordeLavanda,
            borderWidth: 1,
            borderRadius: radius.xl,
            borderCurve: 'continuous',
            padding: 16,
            gap: 14,
          }}
        >
          <View className="flex-row items-center justify-between gap-2">
            <Text
              style={{
                fontFamily: fontFamilies.display,
                fontSize: 22,
                letterSpacing: 0.7,
                color: colors.moradoPrincipal,
                textTransform: 'uppercase',
              }}
            >
              Cobertura de recintos
            </Text>
            <Text
              style={{
                fontFamily: fontFamilies.display,
                fontSize: 28,
                color: colors.moradoPrincipal,
                fontVariant: ['tabular-nums'],
              }}
            >
              {porcentajeCobertura}%
            </Text>
          </View>

          <AnimatedProgressBar
            percentage={porcentajeCobertura}
            fillColor={colors.moradoPrincipal}
            trackColor={colors.blancoPuro}
            height={12}
          />

          <View className="flex-row gap-3">
            <View
              style={{
                flex: 1,
                backgroundColor: colors.blancoPuro,
                borderRadius: radius.md,
                padding: 12,
                gap: 2,
              }}
            >
              <Text
                style={{
                  fontFamily: fontFamilies.display,
                  fontSize: 32,
                  lineHeight: 34,
                  color: colors.moradoPrincipal,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {recintosCubiertos}
              </Text>
              <Text
                style={{
                  fontFamily: fontFamilies.bodySemiBold,
                  fontSize: 12,
                  color: colors.grisCarbon,
                }}
              >
                Cubiertos
              </Text>
            </View>

            <View
              style={{
                flex: 1,
                backgroundColor: recintosPendientes > 0 ? colors.cremaLimon : colors.blancoPuro,
                borderRadius: radius.md,
                borderWidth: recintosPendientes > 0 ? 1 : 0,
                borderColor: colors.advertenciaBorde,
                padding: 12,
                gap: 2,
              }}
            >
              <Text
                style={{
                  fontFamily: fontFamilies.display,
                  fontSize: 32,
                  lineHeight: 34,
                  color: colors.moradoPrincipal,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {recintosPendientes}
              </Text>
              <Text
                style={{
                  fontFamily: fontFamilies.bodySemiBold,
                  fontSize: 12,
                  color: colors.grisCarbon,
                }}
              >
                Pendientes
              </Text>
            </View>

            <View
              style={{
                flex: 1,
                backgroundColor: colors.blancoPuro,
                borderRadius: radius.md,
                padding: 12,
                gap: 2,
              }}
            >
              <Text
                style={{
                  fontFamily: fontFamilies.display,
                  fontSize: 32,
                  lineHeight: 34,
                  color: colors.grisCarbon,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {recintos.length}
              </Text>
              <Text
                style={{
                  fontFamily: fontFamilies.bodySemiBold,
                  fontSize: 12,
                  color: colors.textoSecundario,
                }}
              >
                Total
              </Text>
            </View>
          </View>
        </View>

        {error ? (
          <View
            style={{
              backgroundColor: colors.errorFondo,
              borderColor: colors.errorBorde,
              borderWidth: 1,
              borderRadius: radius.lg,
              padding: 16,
              gap: 10,
            }}
          >
            <Text className="font-body text-sm leading-5 text-red-800" selectable>
              {error}
            </Text>
            <AnimatedButton
              title="Reintentar carga"
              variant="danger"
              compact
              onPress={() => {
                dispatch(clearTerritorioError());
                void dispatch(cargarCatalogoTerritorial());
                void dispatch(cargarProvinciaActual());
                void dispatch(cargarCoordinadoresRecinto());
              }}
            />
          </View>
        ) : null}

        {/* Acciones principales */}
        <View className="gap-3">
          <Link href="/(provincial)/monitoreo" asChild>
            <AnimatedButton variant="yellowAction" haptic="medium" style={{ width: '100%' }}>
              <SymbolView
                name={{ ios: 'chart.bar.fill', android: 'bar_chart', web: 'bar_chart' }}
                size={20}
                tintColor={colors.moradoPrincipal}
              />
              <Text
                style={{
                  fontFamily: fontFamilies.display,
                  fontSize: 22,
                  letterSpacing: 0.7,
                  color: colors.moradoPrincipal,
                  textTransform: 'uppercase',
                }}
                selectable
              >
                Tablero Exit Poll en vivo
              </Text>
            </AnimatedButton>
          </Link>

          <View className="flex-row gap-3">
            <AnimatedButton
              title="Agregar recinto"
              variant="primary"
              style={{ flex: 1 }}
              disabled={!provincia || catalogoOffline}
              onPress={() => addVenueSheetRef.current?.present()}
            />
            <Link href="/(auth)/register-subordinate" asChild>
              <AnimatedButton
                title="Crear coordinador"
                variant="outline"
                style={{ flex: 1 }}
              />
            </Link>
          </View>

          <Link href="/ajustes" asChild>
            <AnimatedButton title="Perfil, equipo y ajustes" variant="neutral" />
          </Link>
        </View>

        {/* Filtros rápidos por Cantón / Parroquia */}
        {cantonesDisponibles.length > 0 ? (
          <View className="gap-2.5">
            <Text
              style={{
                fontFamily: fontFamilies.display,
                fontSize: 20,
                letterSpacing: 0.6,
                color: colors.moradoPrincipal,
                textTransform: 'uppercase',
              }}
            >
              Filtrar por cantón
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              <FilterChip
                label={`Todos (${recintos.length})`}
                active={filtroCanton === null}
                onPress={() => {
                  hapticSelection();
                  setFiltroCanton(null);
                  setFiltroParroquia(null);
                }}
              />
              {cantonesDisponibles.map((canton) => (
                <FilterChip
                  key={canton}
                  label={canton}
                  active={filtroCanton === canton}
                  onPress={() => {
                    hapticSelection();
                    setFiltroCanton(canton);
                    setFiltroParroquia(null);
                  }}
                />
              ))}
            </ScrollView>

            {parroquiasDisponibles.length > 1 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                <FilterChip
                  label="Todas las parroquias"
                  active={filtroParroquia === null}
                  compact
                  onPress={() => {
                    hapticSelection();
                    setFiltroParroquia(null);
                  }}
                />
                {parroquiasDisponibles.map((parroquia) => (
                  <FilterChip
                    key={parroquia}
                    label={parroquia}
                    active={filtroParroquia === parroquia}
                    compact
                    onPress={() => {
                      hapticSelection();
                      setFiltroParroquia(parroquia);
                    }}
                  />
                ))}
              </ScrollView>
            ) : null}
          </View>
        ) : null}

        {/* Listado de recintos */}
        <View className="gap-3">
          <View className="flex-row items-center justify-between gap-3">
            <Text
              style={{
                fontFamily: fontFamilies.display,
                fontSize: 26,
                letterSpacing: 0.7,
                color: colors.moradoPrincipal,
                textTransform: 'uppercase',
              }}
              selectable
            >
              Recintos ({recintosFiltrados.length})
            </Text>
            <Pressable
              accessibilityRole="button"
              style={{
                minHeight: touchTarget.minHeight,
                justifyContent: 'center',
                paddingHorizontal: 10,
              }}
              disabled={cargandoCatalogo}
              onPress={() => {
                hapticSelection();
                void dispatch(cargarCatalogoTerritorial());
                void dispatch(cargarProvinciaActual());
                void dispatch(cargarCoordinadoresRecinto());
              }}
            >
              <Text
                style={{
                  fontFamily: fontFamilies.bodyBold,
                  fontSize: 13,
                  color: colors.moradoPrincipal,
                }}
                selectable
              >
                Actualizar
              </Text>
            </Pressable>
          </View>

          {cargandoCatalogo && recintos.length === 0 ? (
            <View className="items-center gap-3 rounded-2xl bg-white p-8">
              <ActivityIndicator size="large" color={colors.moradoPrincipal} />
              <Text className="text-center font-body text-texto-secundario" selectable>
                Cargando recintos y catálogos…
              </Text>
            </View>
          ) : recintosFiltrados.length === 0 ? (
            <View
              style={{
                backgroundColor: colors.blancoPuro,
                borderColor: colors.bordeLavanda,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderRadius: radius.lg,
                padding: 20,
                gap: 6,
              }}
            >
              <Text
                style={{
                  fontFamily: fontFamilies.display,
                  fontSize: 22,
                  color: colors.moradoPrincipal,
                  textTransform: 'uppercase',
                }}
                selectable
              >
                {recintos.length === 0 ? 'Aún no hay recintos' : 'Sin coincidencias en este filtro'}
              </Text>
              <Text className="font-body text-sm leading-5 text-texto-secundario" selectable>
                {recintos.length === 0
                  ? 'Agregue el primer recinto de la jurisdicción para comenzar las asignaciones.'
                  : 'Seleccione otro cantón o parroquia para ver más recintos.'}
              </Text>
            </View>
          ) : (
            recintosFiltrados.map((recinto, index) => {
              const coordinador = coordinadoresRecinto.find(
                (person) => person.id === recinto.coordinadorRecintoId,
              );
              const tieneCoordinador = Boolean(recinto.coordinadorRecintoId);
              return (
                <View
                  key={recinto.id}
                  style={{
                    backgroundColor: !tieneCoordinador
                      ? colors.cremaLimon
                      : index % 2 === 1
                        ? colors.vainillaClaro
                        : colors.blancoPuro,
                    borderColor: !tieneCoordinador
                      ? colors.advertenciaBorde
                      : colors.bordeLavanda,
                    borderWidth: 1,
                    borderRadius: radius.lg,
                    borderCurve: 'continuous',
                    padding: 16,
                    gap: 12,
                  }}
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                      <Text
                        style={{
                          fontFamily: fontFamilies.bodyBold,
                          fontSize: 16,
                          color: colors.grisCarbon,
                        }}
                        selectable
                      >
                        {recinto.nombre}
                      </Text>
                      <Text
                        style={{
                          fontFamily: fontFamilies.bodyMedium,
                          fontSize: 13,
                          color: colors.textoSecundario,
                        }}
                        selectable
                      >
                        {recinto.canton} · {recinto.parroquia ?? 'Parroquia no indicada'}
                      </Text>
                      {recinto.direccion ? (
                        <Text
                          style={{
                            fontFamily: fontFamilies.bodyRegular,
                            fontSize: 12,
                            color: colors.textoSecundario,
                          }}
                          selectable
                        >
                          {recinto.direccion}
                        </Text>
                      ) : null}
                    </View>

                    <View
                      style={{
                        flexShrink: 0,
                        backgroundColor: tieneCoordinador
                          ? colors.moradoPrincipal
                          : colors.blancoPuro,
                        borderColor: tieneCoordinador
                          ? colors.moradoPrincipal
                          : colors.moradoPrincipal,
                        borderWidth: 1,
                        borderRadius: radius.full,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: fontFamilies.bodyBold,
                          fontSize: 11,
                          color: tieneCoordinador
                            ? colors.amarilloPrincipal
                            : colors.moradoPrincipal,
                        }}
                      >
                        {tieneCoordinador ? 'CUBIERTO' : 'PENDIENTE'}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      borderTopWidth: 1,
                      borderTopColor: tieneCoordinador ? colors.bordeNeutro : colors.advertenciaBorde,
                      paddingTop: 12,
                    }}
                  >
                    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                      <Text
                        style={{
                          fontFamily: fontFamilies.bodyBold,
                          fontSize: 11,
                          letterSpacing: 0.6,
                          textTransform: 'uppercase',
                          color: colors.textoSecundario,
                        }}
                        selectable
                      >
                        Coordinador de recinto
                      </Text>
                      <Text
                        numberOfLines={2}
                        style={{
                          fontFamily: fontFamilies.bodySemiBold,
                          fontSize: 14,
                          color: colors.grisCarbon,
                        }}
                        selectable
                      >
                        {tieneCoordinador
                          ? coordinador?.nombresCompletos ?? 'Coordinador asignado'
                          : 'Pendiente de asignación'}
                      </Text>
                    </View>
                    {!tieneCoordinador ? (
                      <AnimatedButton
                        title="Asignar"
                        variant="primaryAccent"
                        compact
                        onPress={() => abrirAsignacion(recinto)}
                      />
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* BottomSheet: Nuevo recinto */}
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
        backgroundStyle={{ backgroundColor: colors.blancoPuro, borderRadius: 24 }}
        handleIndicatorStyle={{ backgroundColor: colors.bordeLavanda, width: 44 }}
      >
        <BottomSheetScrollView
          className="flex-1"
          contentContainerClassName="gap-5 px-6 pb-10 pt-3"
          keyboardShouldPersistTaps="handled"
        >
          <View className="gap-1">
            <Text
              style={{
                fontFamily: fontFamilies.display,
                fontSize: 28,
                color: colors.moradoPrincipal,
                textTransform: 'uppercase',
              }}
              selectable
            >
              Nuevo recinto
            </Text>
            <Text className="font-body text-sm leading-5 text-texto-secundario" selectable>
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
          <AnimatedButton
            title={guardando || isSubmitting ? 'Guardando…' : 'Guardar recinto'}
            variant="primaryAccent"
            loading={guardando || isSubmitting}
            onPress={() => {
              void handleSubmit(onCreateVenue)();
            }}
          />
        </BottomSheetScrollView>
      </BottomSheetModal>

      {/* BottomSheet: Asignar coordinador */}
      <BottomSheetModal
        ref={coordinatorSheetRef}
        snapPoints={['60%']}
        enablePanDownToClose
        onDismiss={() => setRecintoSeleccionado(null)}
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...props}
            disappearsOnIndex={-1}
            appearsOnIndex={0}
          />
        )}
        backgroundStyle={{ backgroundColor: colors.blancoPuro, borderRadius: 24 }}
        handleIndicatorStyle={{ backgroundColor: colors.bordeLavanda, width: 44 }}
      >
        <BottomSheetScrollView
          className="flex-1"
          contentContainerClassName="gap-4 px-6 pb-10 pt-3"
        >
          <View className="gap-1">
            <Text
              style={{
                fontFamily: fontFamilies.display,
                fontSize: 28,
                color: colors.moradoPrincipal,
                textTransform: 'uppercase',
              }}
              selectable
            >
              Asignar coordinador
            </Text>
            <Text className="font-body text-sm leading-5 text-texto-secundario" selectable>
              {recintoSeleccionado?.nombre} admite una sola coordinación.
            </Text>
          </View>
          {cargandoPersonal ? (
            <ActivityIndicator size="large" color={colors.moradoPrincipal} />
          ) : coordinadoresDisponibles.length === 0 ? (
            <View className="gap-3 rounded-2xl bg-lavanda p-4">
              <Text className="font-body text-sm leading-5 text-texto" selectable>
                No hay coordinadores disponibles. Cree una cuenta subordinada y actualice la lista.
              </Text>
              <Link href="/(auth)/register-subordinate" asChild>
                <AnimatedButton title="Crear coordinador" variant="primary" compact />
              </Link>
              <AnimatedButton
                title="Actualizar coordinadores"
                variant="outline"
                compact
                onPress={() => void dispatch(cargarCoordinadoresRecinto())}
              />
            </View>
          ) : (
            coordinadoresDisponibles.map((coordinador, idx) => (
              <Pressable
                key={coordinador.id}
                accessibilityRole="button"
                disabled={guardando}
                onPress={() => void onAssignCoordinator(coordinador.id)}
                style={({ pressed }) => ({
                  minHeight: 60,
                  justifyContent: 'center',
                  gap: 2,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: colors.bordeLavanda,
                  backgroundColor: pressed
                    ? colors.lavandaSuave
                    : idx % 2 === 1
                      ? colors.vainillaClaro
                      : colors.blancoPuro,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                })}
              >
                <Text className="font-body-bold text-base text-texto" selectable>
                  {coordinador.nombresCompletos}
                </Text>
                <Text className="font-body text-xs text-texto-secundario" selectable>
                  C.I. {coordinador.cedula}
                </Text>
              </Pressable>
            ))
          )}
          {error ? (
            <Text className="font-body-semibold text-xs leading-5 text-alerta" selectable>
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

function FilterChip({
  label,
  active,
  compact = false,
  onPress,
}: {
  label: string;
  active: boolean;
  compact?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={{
        minHeight: touchTarget.minHeight,
        paddingHorizontal: compact ? 12 : 16,
        borderRadius: radius.full,
        backgroundColor: active ? colors.moradoPrincipal : colors.blancoPuro,
        borderWidth: 1.5,
        borderColor: active ? colors.moradoPrincipal : colors.bordeLavanda,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        numberOfLines={1}
        style={{
          fontFamily: active ? fontFamilies.bodyBold : fontFamilies.bodySemiBold,
          fontSize: compact ? 12 : 13,
          color: active ? colors.amarilloPrincipal : colors.grisCarbon,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
