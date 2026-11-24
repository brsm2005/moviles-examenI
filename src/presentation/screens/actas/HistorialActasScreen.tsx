import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import type { Acta, EstadoActa } from '@/domain/entities/Acta';
import type { IActaProcessingService } from '@/domain/ports/IActaProcessingService';
import type { ICrashReportingService } from '@/domain/ports/ICrashReportingService';
import { FeedbackBottomSheet, type FeedbackContent } from '@/presentation/components/auth/FeedbackBottomSheet';
import { useAppDispatch, useAppSelector } from '@/presentation/store';
import { avisarActaLista } from '@/presentation/store/slices/actaSlice';
import { cargarHistorialActas } from '@/presentation/store/slices/historialSlice';

type PestanaHistorial = 'pendientes' | 'enviadas';

const estadosPendientes: EstadoActa[] = [
  'PENDING_OCR',
  'PROCESSING_OCR',
  'NEEDS_CONFIRMATION',
  'PENDING_SYNC',
];

const etiquetasEstado: Record<EstadoActa, string> = {
  PENDING_OCR: 'OCR en espera',
  PROCESSING_OCR: 'Procesando OCR',
  NEEDS_CONFIRMATION: 'Lista para revisar',
  PENDING_SYNC: 'Pendiente de envío',
  SYNCED: 'Enviada',
};

function obtenerEtiqueta(acta: Acta): string {
  return `${acta.dignidad} · Mesa ${acta.mesaJrvId}`;
}

export function HistorialActasScreen({
  processingService,
  crashReportingService,
}: {
  processingService: IActaProcessingService;
  crashReportingService: ICrashReportingService;
}) {
  const dispatch = useAppDispatch();
  const perfil = useAppSelector((state) => state.auth.perfil);
  const { actas, cargando, cargado, error } = useAppSelector(
    (state) => state.historial,
  );
  const [pestana, setPestana] = useState<PestanaHistorial>('pendientes');
  const [reintentandoId, setReintentandoId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackContent | null>(null);
  const reintentoActivo = useRef(false);
  const sesionActual = useRef(perfil?.id);
  const montada = useRef(true);

  useEffect(() => {
    montada.current = true;
    return () => { montada.current = false; };
  }, []);

  useEffect(() => {
    sesionActual.current = perfil?.id;
    return () => { sesionActual.current = undefined; };
  }, [perfil?.id]);

  const cargar = useCallback(() => {
    if (perfil?.id) void dispatch(cargarHistorialActas(perfil.id));
  }, [dispatch, perfil]);

  useFocusEffect(cargar);

  const actasVisibles = useMemo(
    () =>
      actas.filter((acta) =>
        pestana === 'pendientes'
          ? estadosPendientes.includes(acta.estado)
          : acta.estado === 'SYNCED',
      ),
    [actas, pestana],
  );

  const abrirActa = (acta: Acta) => {
    router.push({
      pathname: '/(actas)/verificacion',
      params: { actaId: acta.id },
    });
  };

  const reintentarOcr = async (acta: Acta) => {
    if (!perfil || acta.creadoPor !== perfil.id || acta.estado !== 'PENDING_OCR' || reintentoActivo.current) {
      return;
    }

    reintentoActivo.current = true;
    setReintentandoId(acta.id);
    try {
      const resultado = await processingService.procesarActa(acta.id);
      if (sesionActual.current !== perfil.id) return;
      if (resultado.estado === 'NEEDS_CONFIRMATION') {
        dispatch(avisarActaLista(resultado.id));
      } else {
        setFeedback({
          title: resultado.estado === 'PENDING_OCR' ? 'OCR pendiente' : 'Estado actualizado',
          message: resultado.estado === 'PENDING_OCR'
            ? 'No hay conexión a internet. El acta permanece guardada y se reintentará al recuperar la conexión.'
            : 'El estado del acta ha cambiado. Consulte el historial actualizado.',
          tone: 'error',
        });
      }
    } catch (error) {
      const fallo = error instanceof Error ? error : new Error('No se pudo procesar el acta.');
      await crashReportingService.registrarError(fallo, {
        operacion: 'reintentar_ocr_acta',
        pantalla: 'historial_actas',
        actaId: acta.id,
      });
      if (sesionActual.current === perfil.id) {
        setFeedback({
          title: 'No se pudo procesar el acta',
          message: `${fallo.message} Consulte el estado en el historial y vuelva a intentarlo si sigue pendiente.`,
          tone: 'error',
        });
      }
    } finally {
      if (sesionActual.current === perfil.id) {
        await dispatch(cargarHistorialActas(perfil.id));
      }
      reintentoActivo.current = false;
      if (montada.current) setReintentandoId(null);
    }
  };

  return (
    <View className="flex-1 bg-fondo">
      <ScrollView
        className="flex-1"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-5 px-5 pb-10 pt-5"
        refreshControl={
          <RefreshControl refreshing={cargando} onRefresh={cargar} />
        }
      >
        <View className="gap-1">
          <Text className="text-xs font-bold tracking-[2px] text-secundario" selectable>
            REGISTRO ELECTORAL
          </Text>
          <Text className="text-3xl font-bold text-texto" selectable>
            Historial de actas
          </Text>
          <Text className="text-sm leading-5 text-slate-600" selectable>
            Revise el procesamiento pendiente o consulte las actas enviadas de sus mesas.
          </Text>
        </View>

        <View
          accessibilityRole="tablist"
          className="flex-row rounded-2xl bg-slate-200 p-1"
        >
          <BotonPestana
            activa={pestana === 'pendientes'}
            etiqueta="Pendientes"
            cantidad={actas.filter((acta) => estadosPendientes.includes(acta.estado)).length}
            onPress={() => setPestana('pendientes')}
          />
          <BotonPestana
            activa={pestana === 'enviadas'}
            etiqueta="Enviadas"
            cantidad={actas.filter((acta) => acta.estado === 'SYNCED').length}
            onPress={() => setPestana('enviadas')}
          />
        </View>

        {error ? (
          <View className="gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
            <Text className="text-sm leading-5 text-red-800" selectable>
              {error}
            </Text>
            <Pressable
              accessibilityRole="button"
              className="min-h-11 justify-center"
              onPress={cargar}
            >
              <Text className="font-bold text-red-900" selectable>
                Reintentar
              </Text>
            </Pressable>
          </View>
        ) : null}

        {!cargado && cargando ? (
          <View className="items-center gap-3 py-12">
            <ActivityIndicator size="large" color="#1B365D" />
            <Text className="text-sm text-slate-600" selectable>
              Cargando actas guardadas…
            </Text>
          </View>
        ) : actasVisibles.length === 0 ? (
          <View className="gap-2 rounded-2xl border border-slate-200 bg-white p-5">
            <Text className="text-lg font-bold text-texto" selectable>
              {pestana === 'pendientes'
                ? 'Sin actas pendientes'
                : 'Aún no hay actas enviadas'}
            </Text>
            <Text className="text-sm leading-5 text-slate-600" selectable>
              {pestana === 'pendientes'
                ? 'Las capturas y el OCR diferido aparecerán aquí. Cuando el OCR termine, recibirá un aviso para verificar los valores.'
                : 'Las actas confirmadas y sincronizadas aparecerán en esta pestaña.'}
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {actasVisibles.map((acta) => (
              <TarjetaActa
                key={acta.id}
                acta={acta}
                onPress={() => abrirActa(acta)}
                onReintentar={
                  perfil?.id === acta.creadoPor && acta.estado === 'PENDING_OCR'
                    ? () => void reintentarOcr(acta)
                    : undefined
                }
                reintentando={reintentandoId === acta.id}
                reintentoDeshabilitado={reintentandoId !== null}
              />
            ))}
          </View>
        )}
      </ScrollView>
      <FeedbackBottomSheet content={feedback} onDismiss={() => setFeedback(null)} />
    </View>
  );
}

interface BotonPestanaProps {
  activa: boolean;
  etiqueta: string;
  cantidad: number;
  onPress: () => void;
}

function BotonPestana({
  activa,
  etiqueta,
  cantidad,
  onPress,
}: BotonPestanaProps) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: activa }}
      className={`min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl px-3 ${
        activa ? 'bg-white' : 'bg-transparent'
      }`}
      onPress={onPress}
    >
      <Text
        className={`font-bold ${activa ? 'text-texto' : 'text-slate-600'}`}
        selectable
      >
        {etiqueta}
      </Text>
      <Text
        className={`rounded-full px-2 py-0.5 text-xs font-bold ${
          activa ? 'bg-blue-50 text-primario' : 'bg-slate-300 text-slate-700'
        }`}
        selectable
      >
        {cantidad}
      </Text>
    </Pressable>
  );
}

interface TarjetaActaProps {
  acta: Acta;
  onPress: () => void;
  onReintentar?: () => void;
  reintentando: boolean;
  reintentoDeshabilitado: boolean;
}

function TarjetaActa({ acta, onPress, onReintentar, reintentando, reintentoDeshabilitado }: TarjetaActaProps) {
  const sePuedeAbrir =
    acta.estado === 'NEEDS_CONFIRMATION' ||
    acta.estado === 'PENDING_SYNC' ||
    acta.estado === 'SYNCED';

  const contenido = (
    <View className="gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <Text className="text-base font-bold text-texto" selectable>
            {obtenerEtiqueta(acta)}
          </Text>
          <Text className="text-xs text-slate-500" selectable>
            Actualizada {new Date(acta.actualizadoEn).toLocaleString()}
          </Text>
        </View>
        <Text
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            acta.estado === 'NEEDS_CONFIRMATION'
              ? 'bg-amber-100 text-amber-900'
              : acta.estado === 'SYNCED'
                ? 'bg-emerald-100 text-emerald-900'
                : 'bg-blue-100 text-blue-900'
          }`}
          selectable
        >
          {etiquetasEstado[acta.estado]}
        </Text>
      </View>
      {acta.alertaUbicacion ? (
        <Text className="text-sm font-bold text-amber-900" selectable>
          ! Ubicación marcada para revisión
        </Text>
      ) : null}
      {acta.estado === 'NEEDS_CONFIRMATION' ? (
        <Text className="text-sm font-semibold text-primario" selectable>
          El OCR terminó. Revise y confirme manualmente.
        </Text>
      ) : acta.estado === 'PENDING_SYNC' ? (
        <Text className="text-sm text-slate-600" selectable>
          Verifique la conexión; el envío se reintentará automáticamente.
        </Text>
      ) : null}
      {sePuedeAbrir ? (
        <Text className="text-sm font-bold text-primario" selectable>
          {acta.estado === 'SYNCED' ? 'Consultar o corregir' : 'Abrir acta'}
        </Text>
      ) : null}
      {onReintentar ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Reintentar OCR, ${obtenerEtiqueta(acta)}`}
          accessibilityState={{ disabled: reintentoDeshabilitado, busy: reintentando }}
          disabled={reintentoDeshabilitado}
          onPress={onReintentar}
          className={`min-h-11 items-center justify-center rounded-xl px-4 ${
            reintentoDeshabilitado ? 'bg-slate-400' : 'bg-primario'
          }`}
        >
          <Text className="font-bold text-white" selectable>
            {reintentando ? 'Procesando OCR…' : 'Reintentar OCR'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );

  return sePuedeAbrir ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${obtenerEtiqueta(acta)}, ${etiquetasEstado[acta.estado]}`}
      className="rounded-2xl"
      onPress={onPress}
    >
      {contenido}
    </Pressable>
  ) : (
    contenido
  );
}
