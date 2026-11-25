import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { Link, router } from 'expo-router';
import LottieView from 'lottie-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontFamilies, radius, shadows, touchTarget } from '@theme/tokens';
import type { MesaJrv } from '@/domain/entities/MesaJrv';
import {
  FeedbackBottomSheet,
  type FeedbackContent,
} from '@/presentation/components/auth/FeedbackBottomSheet';
import { AnimatedButton } from '@/presentation/components/ui/AnimatedButton';
import { AnimatedProgressBar } from '@/presentation/components/ui/AnimatedProgressBar';
import { useAppDispatch, useAppSelector } from '@/presentation/store';
import { signOut } from '@/presentation/store/slices/authSlice';
import {
  asignarVeedorMesas,
  cargarCatalogoTerritorial,
  cargarMesasRecinto,
  cargarVeedoresDisponibles,
  clearTerritorioError,
  reemplazarVeedorMesas,
} from '@/presentation/store/slices/territorioSlice';
import { hapticSelection } from '@/presentation/utils/haptics';

const loadingAnimation = require('../../../../assets/animations/loading-dots.json');

type FiltroMesas = 'todas' | 'sin_veedor' | 'asignadas';

function mostrarError(error: unknown): string {
  return error instanceof Error ? error.message : 'Intente nuevamente.';
}

export function RecintoTerritoryScreen() {
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const perfil = useAppSelector((state) => state.auth.perfil);
  const {
    recintos,
    mesas,
    veedoresDisponibles,
    cargandoCatalogo,
    cargandoPersonal,
    guardando,
    error,
    catalogoOffline,
  } = useAppSelector((state) => state.territorio);
  const [mesasSeleccionadas, setMesasSeleccionadas] = useState<string[]>([]);
  const [filtroMesas, setFiltroMesas] = useState<FiltroMesas>('todas');
  const [veedorSalienteId, setVeedorSalienteId] = useState<string | null>(null);
  const [veedorEntranteId, setVeedorEntranteId] = useState('');
  const [feedback, setFeedback] = useState<FeedbackContent | null>(null);
  const assignSheetRef = useRef<BottomSheetModal>(null);
  const replacementSheetRef = useRef<BottomSheetModal>(null);

  const recintoId =
    perfil?.recintoId ??
    recintos.find((recinto) => recinto.coordinadorRecintoId === perfil?.id)?.id ??
    null;
  const recinto = recintos.find((item) => item.id === recintoId) ?? null;

  const mesasAsignadasCount = mesas.filter((m) => m.veedorIds.length > 0).length;
  const mesasSinVeedorCount = mesas.length - mesasAsignadasCount;
  const porcentajeCobertura =
    mesas.length > 0 ? Math.round((mesasAsignadasCount / mesas.length) * 100) : 0;

  const mesasVisibles = useMemo(
    () =>
      mesas.filter((m) => {
        if (filtroMesas === 'sin_veedor') return m.veedorIds.length === 0;
        if (filtroMesas === 'asignadas') return m.veedorIds.length > 0;
        return true;
      }),
    [mesas, filtroMesas],
  );

  useEffect(() => {
    let active = true;

    const cargarVista = async () => {
      const catalogoAction = await dispatch(cargarCatalogoTerritorial());
      if (!active || !cargarCatalogoTerritorial.fulfilled.match(catalogoAction)) {
        return;
      }

      const currentRecintoId =
        perfil?.recintoId ??
        catalogoAction.payload.recintos.find(
          (item) => item.coordinadorRecintoId === perfil?.id,
        )?.id;
      if (!currentRecintoId) return;

      const mesasAction = await dispatch(cargarMesasRecinto(currentRecintoId));
      if (active && cargarMesasRecinto.fulfilled.match(mesasAction)) {
        void dispatch(cargarVeedoresDisponibles());
      }
    };

    void cargarVista();
    return () => {
      active = false;
    };
  }, [dispatch, perfil?.id, perfil?.recintoId]);

  const toggleMesa = (mesaId: string) => {
    hapticSelection();
    setMesasSeleccionadas((current) =>
      current.includes(mesaId)
        ? current.filter((id) => id !== mesaId)
        : [...current, mesaId],
    );
  };

  const onAssignVeedores = async (veedorId: string) => {
    if (!recintoId || mesasSeleccionadas.length === 0) return;
    try {
      await dispatch(
        asignarVeedorMesas({
          recintoId,
          mesaIds: mesasSeleccionadas,
          veedorId,
        }),
      ).unwrap();
      assignSheetRef.current?.dismiss();
      setFeedback({
        title: 'Mesas asignadas',
        message: `Se asignaron ${mesasSeleccionadas.length} mesa(s) al veedor seleccionado.`,
        tone: 'success',
      });
      setMesasSeleccionadas([]);
    } catch (assignmentError) {
      setFeedback({
        title: 'No se pudieron asignar las mesas',
        message: mostrarError(assignmentError),
        tone: 'error',
      });
    }
  };

  const onReplaceVeedor = async () => {
    if (!recintoId || !veedorSalienteId || !veedorEntranteId) return;
    try {
      const result = await dispatch(
        reemplazarVeedorMesas({
          recintoId,
          veedorSalienteId,
          veedorEntranteId,
        }),
      ).unwrap();
      replacementSheetRef.current?.dismiss();
      setFeedback({
        title: 'Reemplazo completado',
        message:
          result.cantidad > 0
            ? `El nuevo veedor ya tiene ${result.cantidad} mesa(s). Las actas existentes conservan la autoría original.`
            : 'No se modificaron mesas porque el veedor saliente ya no tenía mesas asignadas.',
        tone: result.cantidad > 0 ? 'success' : 'error',
      });
      setVeedorSalienteId(null);
      setVeedorEntranteId('');
      void dispatch(cargarVeedoresDisponibles());
    } catch (replacementError) {
      setFeedback({
        title: 'No se pudo reemplazar al veedor',
        message: mostrarError(replacementError),
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

  const openReplacement = (mesa: MesaJrv) => {
    const assignedVeedor = mesa.veedorIds[0];
    if (!assignedVeedor) return;
    dispatch(clearTerritorioError());
    setVeedorSalienteId(assignedVeedor);
    setVeedorEntranteId('');
    replacementSheetRef.current?.present();
  };

  return (
    <>
      <ScrollView
        className="flex-1 bg-malva"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-5 px-5 pb-12 pt-5"
      >
        {/* Cabecera operativa en Morado Principal */}
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
          <View className="gap-1">
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
              Panel de mesas JRV
            </Text>
            <Text
              style={{
                fontFamily: fontFamilies.bodyMedium,
                fontSize: 13,
                lineHeight: 19,
                color: colors.malvaPalido,
              }}
              selectable
            >
              Supervise cada junta, cubra mesas sin veedor y gestione reemplazos inmediatos.
            </Text>
          </View>

          <View className="flex-row flex-wrap gap-2">
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/(actas)/historial')}
              style={{
                minHeight: touchTarget.minHeight,
                paddingHorizontal: 14,
                borderRadius: radius.md,
                backgroundColor: colors.amarilloPrincipal,
                alignItems: 'center',
                justifyContent: 'center',
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
                Historial de actas
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/ajustes')}
              style={{
                minHeight: touchTarget.minHeight,
                paddingHorizontal: 14,
                borderRadius: radius.md,
                backgroundColor: colors.moradoOscuro,
                borderWidth: 1,
                borderColor: colors.moradoBorde,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontFamily: fontFamilies.bodyBold,
                  fontSize: 13,
                  color: colors.blancoPuro,
                }}
                selectable
              >
                Ajustes
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar sesión"
              onPress={onSignOut}
              style={{
                minHeight: touchTarget.minHeight,
                paddingHorizontal: 14,
                borderRadius: radius.md,
                backgroundColor: colors.moradoOscuro,
                borderWidth: 1,
                borderColor: colors.moradoBorde,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontFamily: fontFamilies.bodyBold,
                  fontSize: 13,
                  color: colors.blancoPuro,
                }}
                selectable
              >
                Salir
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Tarjeta resumen del recinto en Lavanda Suave (#E4D4EC) */}
        {recinto ? (
          <View
            style={{
              backgroundColor: colors.lavandaSuave,
              borderColor: colors.bordeLavanda,
              borderWidth: 1,
              borderRadius: radius.xl,
              borderCurve: 'continuous',
              padding: 16,
              gap: 12,
            }}
          >
            <View className="gap-1">
              <Text
                style={{
                  fontFamily: fontFamilies.bodyBold,
                  fontSize: 11,
                  letterSpacing: 0.9,
                  textTransform: 'uppercase',
                  color: colors.moradoPrincipal,
                }}
                selectable
              >
                Recinto asignado
              </Text>
              <Text
                style={{
                  fontFamily: fontFamilies.bodyBold,
                  fontSize: 18,
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
                {recinto.canton} · {recinto.provincia}
              </Text>
            </View>

            <AnimatedProgressBar
              percentage={porcentajeCobertura}
              fillColor={colors.moradoPrincipal}
              trackColor={colors.blancoPuro}
              height={10}
            />

            <View className="flex-row gap-3">
              <View
                style={{
                  flex: 1,
                  backgroundColor: colors.blancoPuro,
                  borderRadius: radius.md,
                  padding: 12,
                }}
              >
                <Text
                  style={{
                    fontFamily: fontFamilies.display,
                    fontSize: 30,
                    lineHeight: 32,
                    color: colors.moradoPrincipal,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {mesasAsignadasCount}
                </Text>
                <Text className="font-body-semibold text-xs text-texto">
                  Con veedor
                </Text>
              </View>
              <View
                style={{
                  flex: 1,
                  backgroundColor:
                    mesasSinVeedorCount > 0 ? colors.cremaLimon : colors.blancoPuro,
                  borderWidth: mesasSinVeedorCount > 0 ? 1 : 0,
                  borderColor: colors.advertenciaBorde,
                  borderRadius: radius.md,
                  padding: 12,
                }}
              >
                <Text
                  style={{
                    fontFamily: fontFamilies.display,
                    fontSize: 30,
                    lineHeight: 32,
                    color: colors.moradoPrincipal,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {mesasSinVeedorCount}
                </Text>
                <Text className="font-body-semibold text-xs text-texto">
                  Sin veedor
                </Text>
              </View>
            </View>

            {catalogoOffline ? (
              <View className="rounded-xl bg-crema px-3 py-2">
                <Text className="font-body-bold text-xs text-texto" selectable>
                  Catálogo disponible sin conexión; los cambios requieren internet.
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {error ? (
          <View className="gap-3 rounded-2xl border border-red-300 bg-red-50 p-4">
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
                if (recintoId) {
                  void dispatch(cargarMesasRecinto(recintoId));
                  void dispatch(cargarVeedoresDisponibles());
                }
              }}
            />
          </View>
        ) : null}

        {/* Encabezado de sección + CTA Crear Veedor */}
        <View className="flex-row items-center justify-between gap-3">
          <Text
            style={{
              fontFamily: fontFamilies.display,
              fontSize: 28,
              letterSpacing: 0.7,
              color: colors.moradoPrincipal,
              textTransform: 'uppercase',
            }}
            selectable
          >
            Mesas JRV ({mesasVisibles.length})
          </Text>
          <Link href="/(auth)/register-subordinate" asChild>
            <AnimatedButton title="Crear veedor" variant="outline" compact />
          </Link>
        </View>

        {/* Filtros de estado operativo */}
        {mesas.length > 0 ? (
          <View className="flex-row flex-wrap gap-2">
            {(
              [
                ['todas', `Todas (${mesas.length})`],
                ['sin_veedor', `Sin veedor (${mesasSinVeedorCount})`],
                ['asignadas', `Cubiertas (${mesasAsignadasCount})`],
              ] as const
            ).map(([key, label]) => {
              const active = filtroMesas === key;
              return (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    hapticSelection();
                    setFiltroMesas(key);
                  }}
                  style={{
                    minHeight: touchTarget.minHeight,
                    paddingHorizontal: 14,
                    borderRadius: radius.full,
                    backgroundColor: active ? colors.moradoPrincipal : colors.blancoPuro,
                    borderWidth: 1.5,
                    borderColor: active ? colors.moradoPrincipal : colors.bordeLavanda,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontFamily: active ? fontFamilies.bodyBold : fontFamilies.bodySemiBold,
                      fontSize: 12,
                      color: active ? colors.amarilloPrincipal : colors.grisCarbon,
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {cargandoCatalogo && mesas.length === 0 ? (
          <View className="items-center gap-3 rounded-2xl bg-white p-8">
            <ActivityIndicator size="large" color={colors.moradoPrincipal} />
            <Text className="text-center font-body text-texto-secundario" selectable>
              Cargando mesas…
            </Text>
          </View>
        ) : !recintoId ? (
          <View className="gap-2 rounded-2xl border border-primario bg-crema p-5">
            <Text
              style={{
                fontFamily: fontFamilies.display,
                fontSize: 24,
                color: colors.moradoPrincipal,
                textTransform: 'uppercase',
              }}
              selectable
            >
              Sin recinto asignado
            </Text>
            <Text className="font-body text-sm leading-6 text-texto" selectable>
              Solicite a la coordinación provincial que vincule su cuenta con un recinto.
            </Text>
          </View>
        ) : mesasVisibles.length === 0 ? (
          <View className="gap-2 rounded-2xl border border-dashed border-borde-lavanda bg-white p-6">
            <Text
              style={{
                fontFamily: fontFamilies.display,
                fontSize: 24,
                color: colors.moradoPrincipal,
                textTransform: 'uppercase',
              }}
              selectable
            >
              {mesas.length === 0 ? 'No hay mesas cargadas' : 'Sin mesas en este filtro'}
            </Text>
            <Text className="font-body text-sm leading-6 text-texto-secundario" selectable>
              {mesas.length === 0
                ? 'Las mesas del recinto aparecerán aquí al sincronizar el catálogo electoral.'
                : 'Cambie el filtro para consultar el resto de juntas del recinto.'}
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {mesasVisibles.map((mesa, index) => {
              const assignedVeedorId = mesa.veedorIds[0];
              const assignedVeedor = veedoresDisponibles.find(
                (person) => person.id === assignedVeedorId,
              );
              const selectable = !assignedVeedorId;
              const selected = mesasSeleccionadas.includes(mesa.id);

              // Alerta en Crema Limón (#FAF9C8) para juntas sin veedor;
              // listado alterno en Vainilla Claro (#FCFCE6) y Blanco (#FFFFFF).
              const cardBackground = selected
                ? colors.lavandaSuave
                : selectable
                  ? colors.cremaLimon
                  : index % 2 === 1
                    ? colors.vainillaClaro
                    : colors.blancoPuro;
              const cardBorder = selected
                ? colors.moradoPrincipal
                : selectable
                  ? colors.advertenciaBorde
                  : colors.bordeLavanda;

              return (
                <View
                  key={mesa.id}
                  style={{
                    backgroundColor: cardBackground,
                    borderColor: cardBorder,
                    borderWidth: selected ? 2 : 1,
                    borderRadius: radius.lg,
                    borderCurve: 'continuous',
                    padding: 16,
                    gap: 12,
                  }}
                >
                  <View className="flex-row items-center justify-between gap-3">
                    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                      <Text
                        style={{
                          fontFamily: fontFamilies.display,
                          fontSize: 28,
                          lineHeight: 30,
                          letterSpacing: 0.6,
                          color: colors.moradoPrincipal,
                          fontVariant: ['tabular-nums'],
                        }}
                        selectable
                      >
                        JRV · MESA {mesa.numero}
                      </Text>
                      <Text
                        style={{
                          fontFamily: fontFamilies.bodyMedium,
                          fontSize: 13,
                          color: colors.grisCarbon,
                        }}
                        selectable
                      >
                        {mesa.genero.toLowerCase()} · {mesa.totalElectoresPadron} electores
                      </Text>
                    </View>

                    <View
                      style={{
                        flexShrink: 0,
                        backgroundColor: selectable
                          ? colors.blancoPuro
                          : colors.moradoPrincipal,
                        borderWidth: 1,
                        borderColor: colors.moradoPrincipal,
                        borderRadius: radius.full,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: fontFamilies.bodyBold,
                          fontSize: 11,
                          color: selectable
                            ? colors.moradoPrincipal
                            : colors.amarilloPrincipal,
                        }}
                        selectable
                      >
                        {selectable ? 'SIN VEEDOR' : '2 ACTAS'}
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
                      borderTopColor: selectable
                        ? colors.advertenciaBorde
                        : colors.bordeNeutro,
                      paddingTop: 12,
                    }}
                  >
                    <Text
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontFamily: fontFamilies.bodySemiBold,
                        fontSize: 14,
                        color: colors.grisCarbon,
                      }}
                      selectable
                    >
                      {assignedVeedorId
                        ? assignedVeedor?.nombresCompletos ?? 'Veedor asignado'
                        : 'Sin veedor asignado · Requiere cobertura'}
                    </Text>

                    {selectable ? (
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: selected }}
                        onPress={() => toggleMesa(mesa.id)}
                        style={{
                          minHeight: touchTarget.minHeight,
                          minWidth: 112,
                          paddingHorizontal: 14,
                          borderRadius: radius.md,
                          backgroundColor: selected
                            ? colors.moradoPrincipal
                            : colors.blancoPuro,
                          borderWidth: 1.5,
                          borderColor: colors.moradoPrincipal,
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: fontFamilies.bodyBold,
                            fontSize: 13,
                            color: selected
                              ? colors.amarilloPrincipal
                              : colors.moradoPrincipal,
                          }}
                          selectable
                        >
                          {selected ? '✓ Seleccionada' : 'Seleccionar'}
                        </Text>
                      </Pressable>
                    ) : (
                      <AnimatedButton
                        title="Reemplazar"
                        variant="lavender"
                        compact
                        onPress={() => openReplacement(mesa)}
                      />
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Barra fija inferior de asignación rápida en campo */}
      {mesasSeleccionadas.length > 0 ? (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: colors.bordeLavanda,
            backgroundColor: colors.blancoPuro,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 12),
          }}
        >
          <AnimatedButton
            title={`Asignar veedor a ${mesasSeleccionadas.length} mesa(s)`}
            variant="yellowAction"
            haptic="medium"
            onPress={() => {
              dispatch(clearTerritorioError());
              assignSheetRef.current?.present();
            }}
          />
        </View>
      ) : null}

      {/* BottomSheet: Asignar mesas */}
      <BottomSheetModal
        ref={assignSheetRef}
        snapPoints={['58%']}
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
              Asignar mesas
            </Text>
            <Text className="font-body text-sm leading-5 text-texto-secundario" selectable>
              Se asignarán {mesasSeleccionadas.length} mesa(s). Un veedor puede cubrir tantas mesas como se requiera.
            </Text>
          </View>
          {cargandoPersonal ? (
            <ActivityIndicator size="large" color={colors.moradoPrincipal} />
          ) : veedoresDisponibles.length === 0 ? (
            <View className="gap-3 rounded-2xl bg-lavanda p-4">
              <Text className="font-body text-sm leading-5 text-texto" selectable>
                No hay veedores activos registrados por usted.
              </Text>
              <Link href="/(auth)/register-subordinate" asChild>
                <AnimatedButton title="Crear veedor" variant="primary" compact />
              </Link>
              <AnimatedButton
                title="Actualizar veedores"
                variant="outline"
                compact
                onPress={() => void dispatch(cargarVeedoresDisponibles())}
              />
            </View>
          ) : (
            veedoresDisponibles.map((veedor, idx) => (
              <Pressable
                key={veedor.id}
                accessibilityRole="button"
                disabled={guardando}
                onPress={() => void onAssignVeedores(veedor.id)}
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
                  {veedor.nombresCompletos}
                </Text>
                <Text className="font-body text-xs text-texto-secundario" selectable>
                  C.I. {veedor.cedula}
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

      {/* BottomSheet: Reemplazo inmediato */}
      <BottomSheetModal
        ref={replacementSheetRef}
        snapPoints={['72%']}
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
        <BottomSheetView className="flex-1 gap-4 px-6 pb-8 pt-3">
          <View className="gap-1.5">
            <Text
              style={{
                fontFamily: fontFamilies.display,
                fontSize: 28,
                color: colors.moradoPrincipal,
                textTransform: 'uppercase',
              }}
              selectable
            >
              Reemplazo inmediato
            </Text>
            <Text className="font-body text-sm leading-5 text-texto-secundario" selectable>
              Todas las mesas del veedor saliente pasarán al nuevo. Las actas previas mantienen su autoría.
            </Text>
            <View className="mt-1 rounded-xl bg-crema px-3 py-2">
              <Text className="font-body-bold text-sm text-texto" selectable>
                Saliente:{' '}
                {veedoresDisponibles.find(
                  (veedor) => veedor.id === veedorSalienteId,
                )?.nombresCompletos ?? 'veedor asignado'}
              </Text>
            </View>
          </View>
          <View className="max-h-64 gap-2">
            <BottomSheetScrollView
              contentContainerClassName="gap-2 pb-2"
              keyboardShouldPersistTaps="handled"
            >
              {veedoresDisponibles
                .filter((veedor) => veedor.id !== veedorSalienteId)
                .map((veedor) => {
                  const isSelected = veedorEntranteId === veedor.id;
                  return (
                    <Pressable
                      key={veedor.id}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                      onPress={() => {
                        hapticSelection();
                        setVeedorEntranteId(veedor.id);
                      }}
                      style={{
                        minHeight: 58,
                        justifyContent: 'center',
                        gap: 2,
                        borderRadius: radius.md,
                        borderWidth: isSelected ? 2 : 1,
                        borderColor: isSelected
                          ? colors.moradoPrincipal
                          : colors.bordeLavanda,
                        backgroundColor: isSelected
                          ? colors.lavandaSuave
                          : colors.blancoPuro,
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                      }}
                    >
                      <Text className="font-body-bold text-base text-texto" selectable>
                        {veedor.nombresCompletos}
                      </Text>
                      <Text className="font-body text-xs text-texto-secundario" selectable>
                        C.I. {veedor.cedula}
                      </Text>
                    </Pressable>
                  );
                })}
            </BottomSheetScrollView>
          </View>
          {guardando ? (
            <View className="items-center">
              <LottieView
                source={loadingAnimation}
                autoPlay
                loop
                style={{ width: 68, height: 48 }}
              />
              <Text className="font-body text-sm text-texto-secundario" selectable>
                Actualizando mesas…
              </Text>
            </View>
          ) : null}
          {!cargandoPersonal && veedoresDisponibles.length <= 1 ? (
            <Text className="font-body text-sm leading-5 text-texto-secundario" selectable>
              Se necesita otro veedor activo para completar el reemplazo.
            </Text>
          ) : null}
          <AnimatedButton
            title="Confirmar reemplazo"
            variant="primaryAccent"
            disabled={!veedorEntranteId || guardando}
            loading={guardando}
            onPress={() => void onReplaceVeedor()}
          />
          {error ? (
            <Text className="font-body-semibold text-xs leading-5 text-alerta" selectable>
              {error}
            </Text>
          ) : null}
        </BottomSheetView>
      </BottomSheetModal>

      <FeedbackBottomSheet
        content={feedback}
        onDismiss={() => setFeedback(null)}
      />
    </>
  );
}
