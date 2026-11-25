import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import LottieView from 'lottie-react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
  type Control,
  type SubmitErrorHandler,
} from 'react-hook-form';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import type { Acta } from '@/domain/entities/Acta';
import type { Candidato } from '@/domain/entities/Candidato';
import type { IActaRepository } from '@/domain/ports/IActaRepository';
import type { IActaProcessingService } from '@/domain/ports/IActaProcessingService';
import type { ICrashReportingService } from '@/domain/ports/ICrashReportingService';
import type { IImageQualityService } from '@/domain/ports/IImageQualityService';
import type { IPhotoStorageService } from '@/domain/ports/IPhotoStorageService';
import type { ITerritorioRepository } from '@/domain/ports/ITerritorioRepository';
import type { ActaVerificacion, ActaVerificacionInput } from '@/domain/schemas/actaVerificacionSchema';
import { actaVerificacionSchema } from '@/domain/schemas/actaVerificacionSchema';
import type { FeedbackContent } from '@/presentation/components/auth/FeedbackBottomSheet';
import { FeedbackBottomSheet } from '@/presentation/components/auth/FeedbackBottomSheet';
import { volverSeguro } from '@/presentation/navigation/volverSeguro';
import { useAppSelector } from '@/presentation/store';

const errorAnimation = require('../../../../assets/animations/status-error.json');

interface VerificacionActaScreenProps {
  actaRepository: IActaRepository;
  territorioRepository: ITerritorioRepository;
  photoStorageService: IPhotoStorageService;
  imageQualityService: IImageQualityService;
  crashReportingService: ICrashReportingService;
  processingService: IActaProcessingService;
}

function mostrarError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'No se pudo completar la verificación del acta.';
}

function numeroDeCampo(valor: string): number | null {
  return /^\d+$/.test(valor.trim()) ? Number(valor.trim()) : null;
}

export function VerificacionActaScreen({
  actaRepository,
  territorioRepository,
  photoStorageService,
  imageQualityService,
  crashReportingService,
  processingService,
}: VerificacionActaScreenProps) {
  const params = useLocalSearchParams<{ actaId?: string | string[] }>();
  const actaId = Array.isArray(params.actaId) ? params.actaId[0] : params.actaId;
  const perfil = useAppSelector((state) => state.auth.perfil);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [acta, setActa] = useState<Acta | null>(null);
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackContent | null>(null);
  const [irAtrasAlCerrar, setIrAtrasAlCerrar] = useState(false);
  const [detalleCuadre, setDetalleCuadre] = useState<{
    suma: number;
    total: number;
  } | null>(null);
  //const [cuadreEnTiempoReal, setCuadreEnTiempoReal] = useState({
    //suma: 0,
    //totalSufragantes: 0,
    //cuadra: false,
  //});
  const cameraRef = useRef<CameraView>(null);
  const cuadreSheetRef = useRef<BottomSheetModal>(null);
  const procesamientoActivo = useRef(false);
  const capturaActiva = useRef(false);

  const {
    control,
    handleSubmit,
    getValues,
    reset,
    formState: { isSubmitting },
  } = useForm<ActaVerificacionInput, undefined, ActaVerificacion>({
    resolver: zodResolver(actaVerificacionSchema),
    defaultValues: {
      totalSufragantes: '',
      votosBlancos: '',
      votosNulos: '',
      votosCandidatos: [],
    },
    mode: 'onChange',
  });
  const { fields } = useFieldArray({ control, name: 'votosCandidatos' });

  // Escucha tecla por tecla sin generar nuevas referencias en cada render
  const [totalSufragantesStr, votosBlancosStr, votosNulosStr, votosCandidatosList] =
    useWatch({
      control,
      name: [
        'totalSufragantes',
        'votosBlancos',
        'votosNulos',
        'votosCandidatos',
      ],
    });

  const cuadreEnTiempoReal = useMemo(() => {
    const totalSufragantes = numeroDeCampo(totalSufragantesStr ?? '') ?? 0;
    const votosBlancos = numeroDeCampo(votosBlancosStr ?? '') ?? 0;
    const votosNulos = numeroDeCampo(votosNulosStr ?? '') ?? 0;
    const votosCandidatos = (votosCandidatosList ?? []).reduce(
      (sum, voto) => sum + (numeroDeCampo(voto?.votos ?? '') ?? 0),
      0,
    );

    const suma = votosCandidatos + votosBlancos + votosNulos;
    const cuadra = suma === totalSufragantes;

    return { suma, totalSufragantes, cuadra };
  }, [totalSufragantesStr, votosBlancosStr, votosNulosStr, votosCandidatosList]);

  useEffect(() => {
    let activa = true;

    const cargar = async () => {
      if (!actaId) {
        setFeedback({
          title: 'No se encontró el acta',
          message: 'Vuelva al historial e intente abrirla nuevamente.',
          tone: 'error',
        });
        setCargando(false);
        return;
      }
      if (
        !perfil ||
        (perfil.rol !== 'VEEDOR' && perfil.rol !== 'COORDINADOR_RECINTO')
      ) {
        setFeedback({
          title: 'Acceso no disponible',
          message: 'Solo el veedor asignado o el coordinador del recinto pueden revisar esta acta.',
          tone: 'error',
        });
        setCargando(false);
        return;
      }

      try {
        const actaCargada = await actaRepository.obtenerPorId(actaId);
        if (!actaCargada) {
          throw new Error(
            'No se encontró el acta en este dispositivo ni en su ámbito de acceso.',
          );
        }
        if (
          actaCargada.estado !== 'SYNCED' &&
          actaCargada.creadoPor !== perfil.id
        ) {
          throw new Error('Solo quien registró un acta pendiente puede confirmarla.');
        }
        const listaCandidatos = await territorioRepository.obtenerCandidatosPorIds(
          actaCargada.votosCandidatos.map((voto) => voto.candidatoId),
        );
        if (!activa) return;

        setActa(actaCargada);
        setFotoUri(actaCargada.fotoUri);
        setCandidatos(listaCandidatos);
        reset({
          totalSufragantes: actaCargada.totalSufragantes === null
            ? ''
            : String(actaCargada.totalSufragantes),
          votosBlancos: actaCargada.votosBlancos === null
            ? ''
            : String(actaCargada.votosBlancos),
          votosNulos: actaCargada.votosNulos === null
            ? ''
            : String(actaCargada.votosNulos),
          votosCandidatos: actaCargada.votosCandidatos.map((voto) => ({
            candidatoId: voto.candidatoId,
            votos: voto.votos === null ? '' : String(voto.votos),
          })),
        });
      } catch (error) {
        await crashReportingService.registrarError(
          error instanceof Error ? error : new Error(mostrarError(error)),
          {
            operacion: 'abrir_verificacion_acta',
            pantalla: 'verificacion_acta',
            actaId,
          },
        );
        if (activa) {
          setFeedback({
            title: 'No se pudo abrir la verificación',
            message: mostrarError(error),
            tone: 'error',
          });
        }
      } finally {
        if (activa) setCargando(false);
      }
    };

    void cargar();
    return () => {
      activa = false;
    };
  }, [
    actaId,
    actaRepository,
    crashReportingService,
    perfil,
    reset,
    territorioRepository,
  ]);

  const candidatosPorId = useMemo(
    () => new Map(candidatos.map((candidato) => [candidato.id, candidato])),
    [candidatos],
  );
  const hayCamposNulos = Boolean(
    acta &&
      (acta.totalSufragantes === null ||
        acta.votosBlancos === null ||
        acta.votosNulos === null ||
        acta.votosCandidatos.some((voto) => voto.votos === null)),
  );

  const guardarResultados = async (resultados: ActaVerificacion) => {
    if (!acta || !perfil || !fotoUri) return;
    setGuardando(true);
    try {
      if (acta.estado === 'SYNCED') {
        await actaRepository.corregirActaSincronizada(
          acta.id,
          resultados,
          fotoUri,
          perfil.id,
        );
        setActa({
          ...acta,
          ...resultados,
          fotoUri,
          actualizadoPor: perfil.id,
          actualizadoEn: new Date().toISOString(),
        });
        setIrAtrasAlCerrar(true);
        setFeedback({
          title: 'Corrección registrada',
          message:
            'Los resultados y la evidencia se actualizaron en Supabase. La acción quedó registrada en la bitácora de auditoría.',
          tone: 'success',
        });
        return;
      }

      if (acta.estado === 'NEEDS_CONFIRMATION') {
        await actaRepository.confirmarParaSincronizacion(
          acta.id,
          resultados,
          perfil.id,
        );
        setActa({
          ...acta,
          ...resultados,
          estado: 'PENDING_SYNC',
          actualizadoPor: perfil.id,
          actualizadoEn: new Date().toISOString(),
        });
      }
      await actaRepository.sincronizarPendiente(acta.id);
      const actualizada = await actaRepository.obtenerPorId(acta.id);
      if (actualizada) setActa(actualizada);
      const sincronizada = actualizada?.estado === 'SYNCED';
      setIrAtrasAlCerrar(sincronizada);
      setFeedback({
        title: sincronizada ? 'Acta enviada' : 'Confirmación guardada',
        message: sincronizada
          ? 'El acta y sus votos se guardaron en Supabase.'
          : 'La revisión humana quedó guardada en el dispositivo y se enviará automáticamente cuando vuelva la conexión.',
        tone: 'success',
      });
    } catch (error) {
      await crashReportingService.registrarError(
        error instanceof Error ? error : new Error(mostrarError(error)),
        {
          operacion: acta.estado === 'SYNCED' ? 'corregir_acta' : 'sincronizar_acta',
          pantalla: 'verificacion_acta',
          actaId: acta.id,
        },
      );
      setFeedback({
        title: acta.estado === 'SYNCED'
          ? 'No se pudo guardar la corrección'
          : 'El acta quedó pendiente de envío',
        message: mostrarError(error),
        tone: 'error',
      });
    } finally {
      setGuardando(false);
    }
  };

  const revisarErrores: SubmitErrorHandler<ActaVerificacionInput> = (
    _errors,
  ) => {
    const values = getValues();
    const parsed = actaVerificacionSchema.safeParse(values);
    if (parsed.success) return;
    const mismatch = parsed.error.issues.find((issue) =>
      issue.message.startsWith('El detalle suma '),
    );
    if (mismatch) {
      const total = numeroDeCampo(values.totalSufragantes);
      const votos = [
        ...values.votosCandidatos.map(({ votos: voto }) => numeroDeCampo(voto)),
        numeroDeCampo(values.votosBlancos),
        numeroDeCampo(values.votosNulos),
      ];
      if (total !== null && votos.every((voto) => voto !== null)) {
        setDetalleCuadre({
          suma: votos.reduce<number>((suma, voto) => suma + (voto ?? 0), 0),
          total,
        });
        requestAnimationFrame(() => cuadreSheetRef.current?.present());
        return;
      }
    }

    setFeedback({
      title: 'Revise los valores del acta',
      message: parsed.error.issues[0]?.message ?? 'Complete todos los campos correctamente.',
      tone: 'error',
    });
  };

  const procesarFotografia = async (foto: string, reiniciar: boolean) => {
    if (!acta || procesamientoActivo.current) return;
    procesamientoActivo.current = true;
    setGuardando(true);
    try {
      if (reiniciar) {
        await actaRepository.reiniciarOcr(acta.id, foto);
        setActa({ ...acta, estado: 'PENDING_OCR', fotoUri: foto, verificacionTerritorial: null });
        setFotoUri(foto);
      }
      const resultado = await processingService.procesarActa(acta.id, false);
      setActa(resultado);
      setFotoUri(resultado.fotoUri);
      if (resultado.estado === 'PENDING_OCR') {
        setFeedback({
          title: 'OCR pendiente',
          message: 'La fotografía está guardada. Se necesita conexión para procesar el OCR.',
          tone: 'error',
        });
      } else if (resultado.estado === 'NEEDS_CONFIRMATION') {
        reset({
          totalSufragantes: resultado.totalSufragantes === null ? '' : String(resultado.totalSufragantes),
          votosBlancos: resultado.votosBlancos === null ? '' : String(resultado.votosBlancos),
          votosNulos: resultado.votosNulos === null ? '' : String(resultado.votosNulos),
          votosCandidatos: resultado.votosCandidatos.map((voto) => ({
            candidatoId: voto.candidatoId,
            votos: voto.votos === null ? '' : String(voto.votos),
          })),
        });
      }
    } catch (error) {
      await crashReportingService.registrarError(
        error instanceof Error ? error : new Error(mostrarError(error)),
        { operacion: 'procesar_ocr_acta', pantalla: 'verificacion_acta', actaId: acta.id },
      );
      setFeedback({
        title: 'No se pudo procesar el acta',
        message: mostrarError(error),
        tone: 'error',
      });
    } finally {
      procesamientoActivo.current = false;
      setGuardando(false);
    }
  };

  const capturarNuevaFoto = async () => {
    if (!acta || capturaActiva.current || procesamientoActivo.current) return;
    capturaActiva.current = true;
    setGuardando(true);
    try {
      if (!cameraPermission?.granted) {
        const permiso = await requestCameraPermission();
        if (!permiso.granted) {
          setFeedback({
            title: 'Permiso de cámara requerido',
            message: 'Habilite la cámara para reemplazar la fotografía del acta.',
            tone: 'error',
          });
          return;
        }
      }

      if (!camaraActiva) {
        setCamaraActiva(true);
        return;
      }

      const foto = await cameraRef.current?.takePictureAsync({ quality: 0.9 });
      if (!foto) throw new Error('La cámara no produjo una fotografía.');
      const vertical = await photoStorageService.asegurarImagenVertical(foto.uri);
      const nitidez = await imageQualityService.analizarNitidez(vertical);
      if (nitidez.esBorrosa) {
        throw new Error(
          'La fotografía está borrosa. Mantenga el teléfono firme y vuelva a tomarla.',
        );
      }
      const reemplazoUri = await photoStorageService.guardarFoto(
        `${acta.id}-correccion-${Date.now()}`,
        vertical,
      );
      setCamaraActiva(false);
      if (acta.estado === 'SYNCED') {
        setFotoUri(reemplazoUri);
      } else {
        await procesarFotografia(reemplazoUri, true);
      }
    } catch (error) {
      await crashReportingService.registrarError(
        error instanceof Error ? error : new Error(mostrarError(error)),
        {
          operacion: 'reemplazar_foto_acta',
          pantalla: 'verificacion_acta',
          actaId: acta.id,
        },
      );
      setFeedback({
        title: 'No se reemplazó la fotografía',
        message: mostrarError(error),
        tone: 'error',
      });
    } finally {
      capturaActiva.current = false;
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <View className="flex-1 items-center justify-center bg-malva">
        <ActivityIndicator size="large" color="#6F2C91" />
      </View>
    );
  }

  const puedeEditar =
    acta?.estado === 'NEEDS_CONFIRMATION' || acta?.estado === 'SYNCED';
  const puedeEnviar = puedeEditar || acta?.estado === 'PENDING_SYNC';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <View className="flex-1 bg-malva">
        <ScrollView
          className="flex-1"
          contentInsetAdjustmentBehavior="automatic"
          contentContainerClassName="gap-5 px-5 pb-12 pt-5"
          keyboardShouldPersistTaps="handled"
        >
          {/* Cabecera Morado Principal */}
          <View className="gap-2 rounded-2xl bg-primario p-5">
            <Text className="font-display text-3xl uppercase tracking-wider text-white" selectable>
              {acta?.estado === 'SYNCED'
                ? 'Editar acta enviada'
                : 'Verificar y confirmar acta'}
            </Text>
            <Text className="font-body text-sm leading-5 text-malva" selectable>
              Confirme cada cifra con la fotografía. Los campos resaltados en crema requieren llenado manual.
            </Text>
            {acta ? (
              <View className="mt-1 self-start rounded-full bg-primario-oscuro px-3 py-1">
                <Text className="font-body-bold text-xs text-amarillo" selectable>
                  {acta.dignidad} · Mesa {acta.mesaJrvId} · {acta.estado}
                </Text>
              </View>
            ) : null}
          </View>

          {!acta ? (
            <View className="rounded-2xl border border-red-300 bg-red-50 p-4">
              <Text className="font-body-semibold text-sm text-red-800" selectable>
                No se pudo cargar el acta solicitada.
              </Text>
            </View>
          ) : !puedeEditar && acta.estado !== 'PENDING_SYNC' ? (
            <View className="gap-3 rounded-2xl border border-borde-lavanda bg-lavanda p-5">
              <Text className="font-display text-2xl uppercase text-primario" selectable>
                {acta.estado === 'PENDING_OCR'
                  ? 'OCR en espera'
                  : 'Procesando imagen'}
              </Text>
              <Text className="font-body text-sm leading-5 text-texto" selectable>
                El acta aparecerá lista para revisión cuando termine la extracción automática. No se enviará sin su confirmación.
              </Text>
              {acta.estado === 'PENDING_OCR' ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={guardando}
                  onPress={() => void procesarFotografia(acta.fotoUri, false)}
                  className="min-h-12 items-center justify-center rounded-xl bg-primario px-4"
                >
                  <Text className="font-body-bold text-amarillo" selectable>
                    {guardando ? 'Procesando OCR…' : 'Reintentar OCR'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <>
              {/* Tarjeta de evidencia fotográfica */}
              <View className="gap-3 rounded-2xl border border-borde-lavanda bg-white p-4">
                <View className="flex-row items-center justify-between gap-3">
                  <Text className="flex-1 font-display text-2xl uppercase text-primario" selectable>
                    Fotografía del acta
                  </Text>
                  <View className="rounded-full bg-lavanda px-3 py-1">
                    <Text className="font-body-bold text-xs text-primario" selectable>
                      Pellizque para zoom
                    </Text>
                  </View>
                </View>

                {camaraActiva ? (
                  <View className="gap-3">
                    <View className="overflow-hidden rounded-xl border-2 border-primario">
                      <CameraView
                        ref={cameraRef}
                        style={{ height: 320 }}
                        facing="back"
                        mode="picture"
                      />
                    </View>
                    <View className="flex-row gap-3">
                      <Pressable
                        accessibilityRole="button"
                        disabled={guardando}
                        className="min-h-12 flex-1 items-center justify-center rounded-xl bg-amarillo px-3"
                        onPress={() => void capturarNuevaFoto()}
                      >
                        <Text className="font-body-bold text-primario" selectable>
                          Tomar fotografía
                        </Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        disabled={guardando}
                        className="min-h-12 items-center justify-center rounded-xl border border-borde-lavanda bg-white px-4"
                        onPress={() => setCamaraActiva(false)}
                      >
                        <Text className="font-body-bold text-texto" selectable>
                          Cancelar
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <>
                    {fotoUri ? (
                      <VistaFoto uri={fotoUri} />
                    ) : (
                      <View className="h-56 items-center justify-center rounded-xl bg-gris-claro">
                        <Text className="font-body text-sm text-texto-secundario" selectable>
                          No hay una fotografía disponible.
                        </Text>
                      </View>
                    )}
                    {puedeEditar ? (
                      <Pressable
                        accessibilityRole="button"
                        disabled={guardando}
                        className="min-h-12 items-center justify-center rounded-xl border-[1.5px] border-primario bg-white px-4"
                        onPress={() => void capturarNuevaFoto()}
                      >
                        <Text className="font-body-bold text-sm text-primario" selectable>
                          Reemplazar fotografía con la cámara
                        </Text>
                      </Pressable>
                    ) : null}
                  </>
                )}
              </View>

              {hayCamposNulos ? (
                <View className="rounded-2xl border border-primario bg-crema p-4">
                  <Text className="font-body-bold text-sm text-primario" selectable>
                    Campos resaltados: el OCR no pudo leerlos
                  </Text>
                  <Text className="mt-1 font-body text-sm leading-5 text-texto" selectable>
                    Complete esos valores manualmente antes de confirmar.
                  </Text>
                </View>
              ) : null}

              {acta.alertaUbicacion ? (
                <View className="rounded-2xl border border-primario bg-crema p-4">
                  <Text className="font-body-bold text-sm text-texto" selectable>
                    ! La ubicación registrada requiere revisión.
                  </Text>
                </View>
              ) : null}

              {/* Formulario ergonómico de dígitos de votación */}
              <View className="gap-3.5 rounded-2xl border border-borde-lavanda bg-white p-4">
                <Text className="font-display text-2xl uppercase tracking-wide text-primario" selectable>
                  Resultados electorales
                </Text>

                <CampoNumero
                  control={control}
                  name="totalSufragantes"
                  etiqueta="Total de sufragantes"
                  ilegible={acta.totalSufragantes === null}
                  editable={puedeEditar}
                  destacado
                />

                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <CampoNumero
                      control={control}
                      name="votosBlancos"
                      etiqueta="Votos blancos"
                      ilegible={acta.votosBlancos === null}
                      editable={puedeEditar}
                    />
                  </View>
                  <View className="flex-1">
                    <CampoNumero
                      control={control}
                      name="votosNulos"
                      etiqueta="Votos nulos"
                      ilegible={acta.votosNulos === null}
                      editable={puedeEditar}
                    />
                  </View>
                </View>

                <View className="gap-3 pt-2">
                  <Text className="font-display text-xl uppercase tracking-wide text-primario" selectable>
                    Votos por candidato
                  </Text>
                  {fields.map((field, indice) => (
                    <CampoNumero
                      key={field.id}
                      control={control}
                      name={`votosCandidatos.${indice}.votos`}
                      etiqueta={
                        candidatosPorId.get(field.candidatoId)?.nombresCompletos ??
                        `Candidato ${indice + 1}`
                      }
                      ilegible={acta.votosCandidatos[indice]?.votos === null}
                      editable={puedeEditar}
                      alterno={indice % 2 === 1}
                    />
                  ))}
                </View>

                {/* Panel de cuadre aritmético en tiempo real */}
                <View
                  className={`mt-2 gap-1.5 rounded-2xl border-[1.5px] p-4 ${
                    cuadreEnTiempoReal.totalSufragantes === 0
                      ? 'border-primario bg-crema'
                      : cuadreEnTiempoReal.cuadra
                        ? 'border-green-400 bg-green-50'
                        : 'border-red-400 bg-red-50'
                  }`}
                >
                  <View className="flex-row items-center justify-between gap-2">
                    <Text
                      className={`font-display text-2xl uppercase ${
                        cuadreEnTiempoReal.totalSufragantes === 0
                          ? 'text-primario'
                          : cuadreEnTiempoReal.cuadra
                            ? 'text-green-800'
                            : 'text-red-800'
                      }`}
                      selectable
                    >
                      {cuadreEnTiempoReal.totalSufragantes === 0
                        ? 'Verificación de cuadre'
                        : cuadreEnTiempoReal.cuadra
                          ? '✓ Cuadre correcto'
                          : '✗ Cuadre incorrecto'}
                    </Text>
                    <Text
                      className="font-display text-2xl text-texto"
                      style={{ fontVariant: ['tabular-nums'] }}
                    >
                      {cuadreEnTiempoReal.suma} / {cuadreEnTiempoReal.totalSufragantes}
                    </Text>
                  </View>
                  <Text
                    className={`font-body text-sm leading-5 ${
                      cuadreEnTiempoReal.totalSufragantes === 0
                        ? 'text-texto'
                        : cuadreEnTiempoReal.cuadra
                          ? 'text-green-900'
                          : 'text-red-900'
                    }`}
                    selectable
                  >
                    {cuadreEnTiempoReal.totalSufragantes === 0
                      ? 'Complete los campos para verificar que la suma de votos coincida.'
                      : cuadreEnTiempoReal.cuadra
                        ? `La suma de votos (${cuadreEnTiempoReal.suma}) coincide con el total de sufragantes.`
                        : `Suma: ${cuadreEnTiempoReal.suma} · Total: ${cuadreEnTiempoReal.totalSufragantes} · Diferencia: ${Math.abs(cuadreEnTiempoReal.suma - cuadreEnTiempoReal.totalSufragantes)}`}
                  </Text>
                </View>
              </View>

              {acta.estado === 'PENDING_SYNC' ? (
                <View className="rounded-2xl border border-primario bg-crema p-4">
                  <Text className="font-body-semibold text-sm leading-5 text-texto" selectable>
                    La verificación ya está guardada localmente. Reintente el envío o espere a que vuelva la conexión.
                  </Text>
                </View>
              ) : null}

              {puedeEnviar ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={guardando || isSubmitting || camaraActiva}
                  className={`min-h-14 items-center justify-center rounded-xl px-4 ${
                    guardando || isSubmitting || camaraActiva ? 'bg-gris-claro' : 'bg-primario'
                  }`}
                  onPress={() => void handleSubmit(guardarResultados, revisarErrores)()}
                >
                  {guardando || isSubmitting ? (
                    <ActivityIndicator color="#EAE84B" />
                  ) : (
                    <Text
                      className={`font-display text-2xl uppercase tracking-wider ${
                        guardando || isSubmitting || camaraActiva
                          ? 'text-texto-secundario'
                          : 'text-amarillo'
                      }`}
                      selectable
                    >
                      {acta.estado === 'SYNCED'
                        ? 'Guardar corrección y auditoría'
                        : acta.estado === 'PENDING_SYNC'
                          ? 'Reintentar envío'
                          : 'Confirmar y enviar acta'}
                    </Text>
                  )}
                </Pressable>
              ) : null}
            </>
          )}

          <Pressable
            accessibilityRole="button"
            className="min-h-12 items-center justify-center rounded-xl border border-borde-lavanda bg-white"
            onPress={() => volverSeguro('/(actas)/historial')}
          >
            <Text className="font-body-bold text-primario" selectable>
              Volver al historial
            </Text>
          </Pressable>
        </ScrollView>

        <BottomSheetModal
          ref={cuadreSheetRef}
          snapPoints={['48%']}
          enablePanDownToClose
          backdropComponent={(props) => (
            <BottomSheetBackdrop
              {...props}
              disappearsOnIndex={-1}
              appearsOnIndex={0}
            />
          )}
          backgroundStyle={{ backgroundColor: '#FFFFFF', borderRadius: 24 }}
          handleIndicatorStyle={{ backgroundColor: '#D4BFE0', width: 44 }}
        >
          <BottomSheetView className="flex-1 items-center justify-center gap-3 px-6 pb-8">
            <LottieView
              source={errorAnimation}
              autoPlay
              style={{ width: 76, height: 76 }}
            />
            <Text className="text-center font-display text-3xl uppercase text-primario" selectable>
              El cuadre no coincide
            </Text>
            <Text
              className="text-center font-body-semibold text-base leading-6 text-texto"
              style={{ fontVariant: ['tabular-nums'] }}
              selectable
            >
              La suma de votos es {detalleCuadre?.suma ?? 0}; el total de sufragantes es {detalleCuadre?.total ?? 0}.
            </Text>
            <View className="rounded-xl bg-crema px-4 py-2">
              <Text
                className="text-center font-body-bold text-sm text-texto"
                style={{ fontVariant: ['tabular-nums'] }}
                selectable
              >
                Diferencia: {Math.abs((detalleCuadre?.suma ?? 0) - (detalleCuadre?.total ?? 0))} votos. Corrija las cifras antes de enviar.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              className="mt-2 min-h-12 w-full items-center justify-center rounded-xl bg-primario px-6"
              onPress={() => cuadreSheetRef.current?.dismiss()}
            >
              <Text className="font-body-bold text-amarillo" selectable>
                Revisar valores
              </Text>
            </Pressable>
          </BottomSheetView>
        </BottomSheetModal>

        <FeedbackBottomSheet
          content={feedback}
          onDismiss={() => {
            setFeedback(null);
            if (irAtrasAlCerrar) {
              setIrAtrasAlCerrar(false);
              volverSeguro('/(actas)/historial');
            }
          }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

interface CampoNumeroProps {
  control: Control<ActaVerificacionInput, undefined, ActaVerificacion>;
  name:
    | 'totalSufragantes'
    | 'votosBlancos'
    | 'votosNulos'
    | `votosCandidatos.${number}.votos`;
  etiqueta: string;
  ilegible: boolean;
  editable: boolean;
  destacado?: boolean;
  alterno?: boolean;
}

function CampoNumero({
  control,
  name,
  etiqueta,
  ilegible,
  editable,
  destacado = false,
  alterno = false,
}: CampoNumeroProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <View
          className={`gap-1.5 rounded-xl p-2.5 ${
            ilegible
              ? 'bg-crema'
              : destacado
                ? 'bg-lavanda'
                : alterno
                  ? 'bg-vainilla'
                  : 'bg-white'
          }`}
        >
          <Text
            className={`font-body-bold text-sm ${
              destacado ? 'text-primario' : 'text-texto'
            }`}
            selectable
          >
            {etiqueta}
          </Text>
          <TextInput
            accessibilityLabel={etiqueta}
            accessibilityHint={
              ilegible ? 'El OCR no leyó este valor; complételo manualmente.' : undefined
            }
            className={`min-h-14 rounded-xl border-[1.5px] px-4 font-display text-3xl text-texto focus:border-primario ${
              ilegible
                ? 'border-primario bg-white'
                : fieldState.error
                  ? 'border-alerta bg-red-50'
                  : destacado
                    ? 'border-primario bg-white'
                    : 'border-borde-lavanda bg-white'
            } ${editable ? '' : 'opacity-70'}`}
            style={{ fontVariant: ['tabular-nums'] }}
            keyboardType="number-pad"
            editable={editable}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            placeholder={ilegible ? 'Ilegible · ingrese' : '0'}
            placeholderTextColor="#52465B"
            selectionColor="#6F2C91"
            selectTextOnFocus
          />
          {fieldState.error ? (
            <Text className="font-body-semibold text-xs text-alerta" selectable>
              {fieldState.error.message}
            </Text>
          ) : null}
        </View>
      )}
    />
  );
}

function VistaFoto({ uri }: { uri: string }) {
  const escala = useSharedValue(1);
  const escalaInicial = useSharedValue(1);
  const estiloAnimado = useAnimatedStyle(() => ({
    transform: [{ scale: escala.get() }],
  }));
  const gesto = Gesture.Pinch()
    .onStart(() => {
      escalaInicial.set(escala.get());
    })
    .onUpdate((evento) => {
      escala.set(Math.min(4, Math.max(1, escalaInicial.get() * evento.scale)));
    });

  return (
    <View className="h-72 overflow-hidden rounded-xl border border-borde-lavanda bg-gris-claro">
      <GestureDetector gesture={gesto}>
        <Animated.View className="h-full w-full" style={estiloAnimado}>
          <Image
            source={{ uri }}
            contentFit="contain"
            transition={0}
            style={{ width: '100%', height: '100%' }}
            accessibilityLabel="Fotografía del acta; pellizque para ampliar"
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
