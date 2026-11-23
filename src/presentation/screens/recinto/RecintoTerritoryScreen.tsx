import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { Link, router } from 'expo-router';
import LottieView from 'lottie-react-native';
import { useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import type { MesaJrv } from '@/domain/entities/MesaJrv';
import {
  FeedbackBottomSheet,
  type FeedbackContent,
} from '@/presentation/components/auth/FeedbackBottomSheet';
import { useAppDispatch, useAppSelector } from '@/presentation/store';
import {
  asignarVeedorMesas,
  cargarCatalogoTerritorial,
  cargarMesasRecinto,
  cargarVeedoresDisponibles,
  clearTerritorioError,
  reemplazarVeedorMesas,
} from '@/presentation/store/slices/territorioSlice';
import { signOut } from '@/presentation/store/slices/authSlice';

const loadingAnimation = require('../../../../assets/animations/loading-dots.json');

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
        className="flex-1 bg-fondo"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-6 px-5 pb-12 pt-6"
      >
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-2">
            <Text className="text-xs font-bold tracking-[2px] text-secundario" selectable>
              COORDINACIÓN DE RECINTO
            </Text>
            <Text className="text-3xl font-bold text-texto" selectable>
              Mesas y veedores
            </Text>
            <Text className="text-base leading-6 text-slate-600" selectable>
              Asigne un veedor a varias mesas y reemplace de inmediato a quien se ausente.
            </Text>
          </View>
          <View className="gap-2">
            <Pressable
              accessibilityRole="button"
              className="min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-3"
              onPress={() => router.push('/ajustes')}
            >
              <Text className="text-xs font-bold text-texto" selectable>Ajustes</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              className="min-h-11 items-center justify-center rounded-xl border border-primario bg-white px-3"
              onPress={() => router.push('/(actas)/historial')}
            >
              <Text className="text-xs font-bold text-primario" selectable>
                Historial
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar sesión"
              className="min-h-11 min-w-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-3"
              onPress={onSignOut}
            >
              <Text className="text-xs font-bold text-texto" selectable>
                Salir
              </Text>
            </Pressable>
          </View>
        </View>

        {recinto ? (
          <View className="gap-1 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <Text className="text-xs font-bold uppercase tracking-wide text-secundario" selectable>
              Recinto asignado
            </Text>
            <Text className="text-lg font-bold text-texto" selectable>
              {recinto.nombre}
            </Text>
            <Text className="text-sm text-slate-600" selectable>
              {recinto.canton} · {recinto.provincia}
            </Text>
            {catalogoOffline ? (
              <Text className="mt-1 text-xs font-bold text-amber-900" selectable>
                Catálogo disponible sin conexión; los cambios requieren internet.
              </Text>
            ) : null}
          </View>
        ) : null}

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
                if (recintoId) {
                  void dispatch(cargarMesasRecinto(recintoId));
                  void dispatch(cargarVeedoresDisponibles());
                }
              }}
            >
              <Text className="font-bold text-red-900" selectable>
                Reintentar carga
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View className="flex-row items-center justify-between gap-3">
          <Text className="text-xl font-bold text-texto" selectable>
            Mesas JRV
          </Text>
          <Link href="/(auth)/register-subordinate" asChild>
            <Pressable
              accessibilityRole="button"
              className="min-h-11 justify-center rounded-lg border border-primario bg-white px-3"
            >
              <Text className="text-sm font-bold text-primario" selectable>
                Crear veedor
              </Text>
            </Pressable>
          </Link>
        </View>

        {cargandoCatalogo && mesas.length === 0 ? (
          <View className="items-center gap-3 rounded-2xl bg-white p-8">
            <ActivityIndicator size="large" color="#1B365D" />
            <Text className="text-center text-slate-600" selectable>
              Cargando mesas…
            </Text>
          </View>
        ) : !recintoId ? (
          <View className="gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <Text className="text-lg font-bold text-texto" selectable>
              Sin recinto asignado
            </Text>
            <Text className="leading-6 text-slate-700" selectable>
              Solicite a la coordinación provincial que vincule su cuenta con un recinto.
            </Text>
          </View>
        ) : mesas.length === 0 ? (
          <View className="gap-2 rounded-2xl border border-dashed border-slate-300 bg-white p-6">
            <Text className="text-lg font-bold text-texto" selectable>
              No hay mesas cargadas
            </Text>
            <Text className="leading-6 text-slate-600" selectable>
              Las mesas del recinto aparecerán aquí al sincronizar el catálogo electoral.
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {mesas.map((mesa) => {
              const assignedVeedorId = mesa.veedorIds[0];
              const assignedVeedor = veedoresDisponibles.find(
                (person) => person.id === assignedVeedorId,
              );
              const selectable = !assignedVeedorId;
              const selected = mesasSeleccionadas.includes(mesa.id);
              return (
                <View
                  key={mesa.id}
                  className={`gap-3 rounded-2xl border p-4 ${
                    selected
                      ? 'border-primario bg-blue-50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <View className="flex-row items-center justify-between gap-3">
                    <View className="flex-1 gap-1">
                      <Text className="text-lg font-bold text-texto" selectable>
                        Mesa {mesa.numero}
                      </Text>
                      <Text className="text-sm text-slate-600" selectable>
                        {mesa.genero.toLowerCase()} · {mesa.totalElectoresPadron} electores
                      </Text>
                    </View>
                    <Text className="rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700" selectable>
                      2 actas
                    </Text>
                  </View>
                  <View className="flex-row items-center justify-between gap-3 border-t border-slate-100 pt-3">
                    <Text className="flex-1 text-sm text-slate-600" selectable>
                      {assignedVeedorId
                        ? assignedVeedor?.nombresCompletos ??
                          'Veedor asignado'
                        : 'Sin veedor asignado'}
                    </Text>
                    {selectable ? (
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: selected }}
                        className="min-h-11 min-w-24 items-center justify-center rounded-lg bg-blue-50 px-3"
                        onPress={() => toggleMesa(mesa.id)}
                      >
                        <Text className="text-sm font-bold text-primario" selectable>
                          {selected ? 'Seleccionada' : 'Seleccionar'}
                        </Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        accessibilityRole="button"
                        className="min-h-11 items-center justify-center rounded-lg bg-amber-50 px-3"
                        onPress={() => openReplacement(mesa)}
                      >
                        <Text className="text-sm font-bold text-amber-900" selectable>
                          Reemplazar
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {mesasSeleccionadas.length > 0 ? (
        <View
          className="border-t border-slate-200 bg-white px-5"
          style={{ paddingBottom: Math.max(insets.bottom, 12), paddingTop: 12 }}
        >
          <Pressable
            accessibilityRole="button"
            className="min-h-12 items-center justify-center rounded-xl bg-primario px-4"
            onPress={() => {
              dispatch(clearTerritorioError());
              assignSheetRef.current?.present();
            }}
          >
            <Text className="font-bold text-white" selectable>
              Asignar veedor a {mesasSeleccionadas.length} mesa(s)
            </Text>
          </Pressable>
        </View>
      ) : null}

      <BottomSheetModal
        ref={assignSheetRef}
        snapPoints={['55%']}
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
          contentContainerClassName="gap-4 px-6 pb-10 pt-3"
        >
          <View className="gap-2">
            <Text className="text-2xl font-bold text-texto" selectable>
              Asignar mesas
            </Text>
            <Text className="text-base leading-6 text-slate-600" selectable>
              Se asignarán {mesasSeleccionadas.length} mesa(s). Un veedor puede cubrir tantas mesas como se requiera.
            </Text>
          </View>
          {cargandoPersonal ? (
            <ActivityIndicator size="large" color="#1B365D" />
          ) : veedoresDisponibles.length === 0 ? (
            <View className="gap-3 rounded-2xl bg-blue-50 p-4">
              <Text className="leading-6 text-slate-700" selectable>
                No hay veedores activos registrados por usted.
              </Text>
              <Link href="/(auth)/register-subordinate" asChild>
                <Pressable
                  accessibilityRole="button"
                  className="min-h-11 items-center justify-center rounded-lg bg-primario px-3"
                >
                  <Text className="font-bold text-white" selectable>
                    Crear veedor
                  </Text>
                </Pressable>
              </Link>
              <Pressable
                accessibilityRole="button"
                className="min-h-11 justify-center"
                onPress={() => void dispatch(cargarVeedoresDisponibles())}
              >
                <Text className="font-bold text-primario" selectable>
                  Actualizar veedores
                </Text>
              </Pressable>
            </View>
          ) : (
            veedoresDisponibles.map((veedor) => (
              <Pressable
                key={veedor.id}
                accessibilityRole="button"
                className="min-h-16 justify-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-3"
                disabled={guardando}
                onPress={() => void onAssignVeedores(veedor.id)}
              >
                <Text className="font-bold text-texto" selectable>
                  {veedor.nombresCompletos}
                </Text>
                <Text className="text-sm text-slate-500" selectable>
                  C.I. {veedor.cedula}
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

      <BottomSheetModal
        ref={replacementSheetRef}
        snapPoints={['70%']}
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
        <BottomSheetView className="flex-1 gap-4 px-6 pb-8 pt-3">
          <View className="gap-2">
            <Text className="text-2xl font-bold text-texto" selectable>
              Reemplazo inmediato
            </Text>
            <Text className="text-base leading-6 text-slate-600" selectable>
              Todas las mesas del veedor saliente pasarán al nuevo. Las actas previas mantienen su autoría.
            </Text>
            <Text className="font-semibold text-texto" selectable>
              Saliente:{' '}
              {veedoresDisponibles.find(
                (veedor) => veedor.id === veedorSalienteId,
              )?.nombresCompletos ?? 'veedor asignado'}
            </Text>
          </View>
          <View className="max-h-64 gap-2">
            <BottomSheetScrollView
              contentContainerClassName="gap-2 pb-2"
              keyboardShouldPersistTaps="handled"
            >
              {veedoresDisponibles
                .filter((veedor) => veedor.id !== veedorSalienteId)
                .map((veedor) => (
                  <Pressable
                    key={veedor.id}
                    accessibilityRole="radio"
                    accessibilityState={{
                      selected: veedorEntranteId === veedor.id,
                    }}
                    className={`min-h-14 justify-center gap-1 rounded-xl border px-4 py-2 ${
                      veedorEntranteId === veedor.id
                        ? 'border-primario bg-blue-50'
                        : 'border-slate-200 bg-white'
                    }`}
                    onPress={() => setVeedorEntranteId(veedor.id)}
                  >
                    <Text className="font-bold text-texto" selectable>
                      {veedor.nombresCompletos}
                    </Text>
                    <Text className="text-xs text-slate-500" selectable>
                      C.I. {veedor.cedula}
                    </Text>
                  </Pressable>
                ))}
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
              <Text className="text-sm text-slate-600" selectable>
                Actualizando mesas…
              </Text>
            </View>
          ) : null}
          {!cargandoPersonal && veedoresDisponibles.length <= 1 ? (
            <Text className="text-sm leading-5 text-slate-600" selectable>
              Se necesita otro veedor activo para completar el reemplazo.
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            className="min-h-12 items-center justify-center rounded-xl bg-primario px-4"
            disabled={!veedorEntranteId || guardando}
            onPress={() => void onReplaceVeedor()}
          >
            <Text className="font-bold text-white" selectable>
              Confirmar reemplazo
            </Text>
          </Pressable>
          {error ? (
            <Text className="text-sm leading-5 text-red-700" selectable>
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
