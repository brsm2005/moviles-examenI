import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import type { Acta } from '@/domain/entities/Acta';
import type { Candidato, Dignidad } from '@/domain/entities/Candidato';
import type { IActaRepository } from '@/domain/ports/IActaRepository';
import type { IActaProcessingService } from '@/domain/ports/IActaProcessingService';
import type { ICrashReportingService } from '@/domain/ports/ICrashReportingService';
import type { IImageQualityService } from '@/domain/ports/IImageQualityService';
import type { ILocationService } from '@/domain/ports/ILocationService';
import type { IPhotoStorageService } from '@/domain/ports/IPhotoStorageService';
import type { ITerritorioRepository } from '@/domain/ports/ITerritorioRepository';
import { FeedbackBottomSheet, type FeedbackContent } from '@/presentation/components/auth/FeedbackBottomSheet';
import { useAppSelector } from '@/presentation/store';
import type { MesaJrv } from '@/domain/entities/MesaJrv';

interface CapturaActaScreenProps {
  actaRepository: IActaRepository;
  territorioRepository: ITerritorioRepository;
  photoStorageService: IPhotoStorageService;
  imageQualityService: IImageQualityService;
  locationService: ILocationService;
  processingService: IActaProcessingService;
  crashReportingService: ICrashReportingService;
}

class FotoBorrosoError extends Error {}

const dignidades: Dignidad[] = ['ALCALDE', 'PREFECTO'];

function mensajeDeError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'No se pudo guardar la captura. Intente nuevamente.';
}

export function CapturaActaScreen({
  actaRepository,
  territorioRepository,
  photoStorageService,
  imageQualityService,
  locationService,
  processingService,
  crashReportingService,
}: CapturaActaScreenProps) {
  const perfil = useAppSelector((state) => state.auth.perfil);
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mesas, setMesas] = useState<MesaJrv[]>([]);
  const [mesaId, setMesaId] = useState<string | null>(null);
  const [dignidad, setDignidad] = useState<Dignidad>('ALCALDE');
  const [resultadoCandidatos, setResultadoCandidatos] = useState<{
    dignidad: Dignidad;
    candidatos: Candidato[];
  } | null>(null);
  const [linternaActiva, setLinternaActiva] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [cargandoMesas, setCargandoMesas] = useState(true);
  const [errorMesas, setErrorMesas] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackContent | null>(null);

  const mesaSeleccionada = useMemo(
    () => mesas.find((mesa) => mesa.id === mesaId) ?? null,
    [mesaId, mesas],
  );
  const candidatos = resultadoCandidatos?.dignidad === dignidad
    ? resultadoCandidatos.candidatos
    : [];
  const cargandoCandidatos = resultadoCandidatos?.dignidad !== dignidad;

  useEffect(() => {
    let activa = true;

    const cargarMesas = async () => {
      if (!perfil?.recintoId) {
        setErrorMesas('El perfil no tiene un recinto asignado.');
        setCargandoMesas(false);
        return;
      }

      try {
        const mesasAsignadas = await territorioRepository.listarMesasJrv(
          perfil.recintoId,
        );
        if (activa) {
          setMesas(mesasAsignadas);
          setMesaId(mesasAsignadas[0]?.id ?? null);
          setErrorMesas(
            mesasAsignadas.length === 0
              ? 'No hay mesas asignadas disponibles en este dispositivo.'
              : null,
          );
        }
      } catch (error) {
        if (activa) {
          setErrorMesas(mensajeDeError(error));
          await crashReportingService.registrarError(
            error instanceof Error ? error : new Error(mensajeDeError(error)),
            {
              operacion: 'consultar_mesas_veedor',
              pantalla: 'captura_acta',
            },
          );
        }
      } finally {
        if (activa) setCargandoMesas(false);
      }
    };

    void cargarMesas();
    return () => {
      activa = false;
    };
  }, [crashReportingService, perfil?.recintoId, territorioRepository]);

  useEffect(() => {
    let activa = true;

    const cargarCandidatos = async () => {
      try {
        const candidatosDisponibles =
          await territorioRepository.listarCandidatos(dignidad);
        if (activa) {
          setResultadoCandidatos({
            dignidad,
            candidatos: candidatosDisponibles,
          });
        }
      } catch (error) {
        if (activa) {
          setResultadoCandidatos({ dignidad, candidatos: [] });
          await crashReportingService.registrarError(
            error instanceof Error ? error : new Error(mensajeDeError(error)),
            {
              operacion: 'consultar_candidatos_acta',
              pantalla: 'captura_acta',
            },
          );
          setFeedback({
            title: 'No se pudo cargar la lista electoral',
            message: mensajeDeError(error),
            tone: 'error',
          });
        }
      }
    };

    void cargarCandidatos();

    return () => {
      activa = false;
    };
  }, [crashReportingService, dignidad, territorioRepository]);

  const mostrarError = useCallback((titulo: string, mensaje: string) => {
    setFeedback({ title: titulo, message: mensaje, tone: 'error' });
  }, []);

  const capturarActa = async () => {
    if (!cameraRef.current || !mesaSeleccionada) return;
    if (!perfil?.id) {
      mostrarError('Sesión no disponible', 'Vuelva a iniciar sesión e intente nuevamente.');
      return;
    }
    if (candidatos.length !== 5) {
      mostrarError(
        'Lista electoral incompleta',
        'Se requieren los cinco candidatos de esta dignidad para continuar.',
      );
      return;
    }

    setCargando(true);
    const actaId = uuidv4();
    let fotoGuardadaUri: string | null = null;
    let capturaPersistida = false;

    try {
      const actaExistente = await actaRepository.obtenerParaMesa(
        mesaSeleccionada.id,
        dignidad,
      );
      if (actaExistente) {
        setFeedback({
          title: 'Ya existe un acta para esta mesa',
          message: `La dignidad ${dignidad} ya fue registrada para ${mesaSeleccionada.codigo}.`,
          tone: 'error',
        });
        return;
      }

      await locationService.prepararCaptura();
      const [foto, ubicacion] = await Promise.all([
        cameraRef.current.takePictureAsync({ quality: 1 }),
        locationService.obtenerUbicacionActual(),
      ]);
      if (!foto) throw new Error('La cámara no produjo una fotografía.');

      const fotoVertical = await photoStorageService.asegurarImagenVertical(
        foto.uri,
      );
      const nitidez = await imageQualityService.analizarNitidez(fotoVertical);
      if (nitidez.esBorrosa) {
        throw new FotoBorrosoError(
          'La imagen está borrosa. Mantenga el teléfono firme y vuelva a tomar la foto.',
        );
      }

      fotoGuardadaUri = await photoStorageService.guardarFoto(
        actaId,
        fotoVertical,
      );
      const ahora = new Date().toISOString();
      const nuevaActa: Omit<Acta, 'estado'> = {
        id: actaId,
        mesaJrvId: mesaSeleccionada.id,
        dignidad,
        fotoUri: fotoGuardadaUri,
        ubicacion,
        alertaUbicacion: false,
        totalSufragantes: null,
        votosBlancos: null,
        votosNulos: null,
        votosCandidatos: candidatos.map((candidato) => ({
          candidatoId: candidato.id,
          votos: null,
        })),
        creadoPor: perfil.id,
        actualizadoPor: perfil.id,
        creadoEn: ahora,
        actualizadoEn: ahora,
      };

      await actaRepository.guardarCaptura(nuevaActa);
      capturaPersistida = true;

      let procesada: Acta | null = null;
      let falloOcr: string | null = null;
      try {
        procesada = await processingService.procesarActa(actaId, false);
      } catch (error) {
        falloOcr = mensajeDeError(error);
        await crashReportingService.registrarError(
          error instanceof Error ? error : new Error(mensajeDeError(error)),
          {
            operacion: 'iniciar_ocr_acta',
            pantalla: 'captura_acta',
            actaId,
          },
        );
      }

      if (procesada?.estado === 'NEEDS_CONFIRMATION') {
        router.replace({
          pathname: '/(veedor)/confirmacion',
          params: { actaId },
        });
        return;
      }

      setFeedback({
        title: falloOcr
          ? 'Captura guardada; OCR pendiente'
          : 'Captura guardada en el dispositivo',
        message: falloOcr
          ? `${falloOcr} La fotografía permanece en el dispositivo y se reintentará automáticamente.`
          : 'El OCR quedó en cola. Se procesará automáticamente cuando vuelva la conexión y requerirá su confirmación.',
        tone: falloOcr ? 'error' : 'success',
      });
    } catch (error) {
      if (fotoGuardadaUri && !capturaPersistida) {
        await photoStorageService.eliminarFoto(fotoGuardadaUri);
      }
      if (!(error instanceof FotoBorrosoError)) {
        await crashReportingService.registrarError(
          error instanceof Error ? error : new Error(mensajeDeError(error)),
          {
            operacion: 'capturar_acta',
            pantalla: 'captura_acta',
            actaId,
          },
        );
      }
      mostrarError(
        error instanceof FotoBorrosoError
          ? 'Vuelva a tomar la fotografía'
          : 'No se pudo completar la captura',
        mensajeDeError(error),
      );
    } finally {
      setCargando(false);
    }
  };

  if (!cameraPermission?.granted) {
    return (
      <View className="flex-1 justify-center gap-5 bg-fondo px-6">
        <Text className="text-2xl font-bold text-texto" selectable>
          Permiso de cámara requerido
        </Text>
        <Text className="text-base leading-6 text-slate-600" selectable>
          Las actas solo se capturan directamente con la cámara; no se permite seleccionar fotos de la galería.
        </Text>
        <Pressable
          accessibilityRole="button"
          className="min-h-12 items-center justify-center rounded-xl bg-primario px-4"
          onPress={() => void requestCameraPermission()}
        >
          <Text className="font-semibold text-white" selectable>
            Habilitar cámara
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          className="min-h-11 items-center justify-center"
          onPress={() => router.back()}
        >
          <Text className="font-semibold text-slate-600" selectable>
            Volver
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-fondo">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-5 pb-8 pt-6"
      >
        <View className="gap-1">
          <Text className="text-xs font-bold tracking-[2px] text-secundario" selectable>
            CAPTURA DE ACTA
          </Text>
          <Text className="text-2xl font-bold text-texto" selectable>
            Fotografía y verificación
          </Text>
          <Text className="text-sm leading-5 text-slate-600" selectable>
            Centre el acta dentro de la guía vertical. La foto y el GPS se guardan en este dispositivo.
          </Text>
        </View>

        <View className="gap-2">
          <Text className="font-semibold text-texto" selectable>
            Mesa asignada
          </Text>
          {cargandoMesas ? (
            <ActivityIndicator color="#1B365D" />
          ) : errorMesas ? (
            <Text className="text-sm text-red-700" selectable>
              {errorMesas}
            </Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
              {mesas.map((mesa) => (
                <Pressable
                  key={mesa.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: mesa.id === mesaId }}
                  className={`min-h-11 justify-center rounded-xl border px-4 ${
                    mesa.id === mesaId
                      ? 'border-primario bg-primario'
                      : 'border-slate-300 bg-white'
                  }`}
                  onPress={() => setMesaId(mesa.id)}
                >
                  <Text
                    className={`font-semibold ${
                      mesa.id === mesaId ? 'text-white' : 'text-texto'
                    }`}
                    selectable
                  >
                    {mesa.codigo}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        <View className="gap-2">
          <Text className="font-semibold text-texto" selectable>
            Dignidad
          </Text>
          <View className="flex-row gap-2">
            {dignidades.map((opcion) => (
              <Pressable
                key={opcion}
                accessibilityRole="button"
                accessibilityState={{ selected: dignidad === opcion }}
                className={`min-h-11 flex-1 items-center justify-center rounded-xl border ${
                  dignidad === opcion
                    ? 'border-primario bg-primario'
                    : 'border-slate-300 bg-white'
                }`}
                onPress={() => setDignidad(opcion)}
              >
                <Text
                  className={`font-semibold ${
                    dignidad === opcion ? 'text-white' : 'text-texto'
                  }`}
                  selectable
                >
                  {opcion}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text className="text-xs text-slate-500" selectable>
            {cargandoCandidatos
              ? 'Cargando candidatos...'
              : candidatos.length === 5
              ? `Candidatos cargados: ${candidatos.map((candidato) => candidato.nombresCompletos).join(', ')}`
              : 'No está disponible la lista completa de cinco candidatos.'}
          </Text>
        </View>

        <View className="overflow-hidden rounded-2xl bg-slate-900">
          <View className="h-[360px]">
            <CameraView
              ref={cameraRef}
              className="flex-1"
              facing="back"
              mode="picture"
              enableTorch={linternaActiva}
              animateShutter
            />
            <View
              pointerEvents="none"
              className="absolute bottom-8 left-10 right-10 top-8 items-center justify-center"
            >
              <View className="h-full w-[78%] rounded-lg border-2 border-white/80" />
              <Text className="absolute bottom-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
                Mantenga el acta en vertical
              </Text>
            </View>
          </View>
        </View>

        <View className="flex-row gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={linternaActiva ? 'Apagar linterna' : 'Encender linterna'}
            className="min-h-12 flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-4"
            onPress={() => setLinternaActiva((activa) => !activa)}
          >
            <Text className="font-semibold text-texto" selectable>
              {linternaActiva ? 'Apagar linterna' : 'Encender linterna'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tomar fotografía del acta"
            disabled={
              cargando ||
              cargandoCandidatos ||
              !mesaSeleccionada ||
              candidatos.length !== 5
            }
            className={`min-h-12 flex-1 items-center justify-center rounded-xl px-4 ${
              cargando ||
              cargandoCandidatos ||
              !mesaSeleccionada ||
              candidatos.length !== 5
                ? 'bg-slate-400'
                : 'bg-primario'
            }`}
            onPress={() => void capturarActa()}
          >
            {cargando ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="font-bold text-white" selectable>
                Tomar fotografía
              </Text>
            )}
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          className="min-h-11 items-center justify-center"
          onPress={() => router.back()}
        >
          <Text className="font-semibold text-slate-600" selectable>
            Volver
          </Text>
        </Pressable>
      </ScrollView>
      <FeedbackBottomSheet
        content={feedback}
        onDismiss={() => setFeedback(null)}
      />
    </View>
  );
}
