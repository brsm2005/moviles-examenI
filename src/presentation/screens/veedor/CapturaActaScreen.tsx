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
import { volverSeguro } from '@/presentation/navigation/volverSeguro';
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

function nombreMesa(mesa: MesaJrv): string {
  const genero = mesa.genero === 'FEMENINO' ? 'F' : mesa.genero === 'MASCULINO' ? 'M' : 'Mixta';
  return `${mesa.numero} ${genero}`;
}

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
  const [todosLosCandidatos, setTodosLosCandidatos] = useState<Candidato[]>([]);
  const [linternaActiva, setLinternaActiva] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [camaraLista, setCamaraLista] = useState(false);
  const [errorCamara, setErrorCamara] = useState<string | null>(null);
  const [intentoCamara, setIntentoCamara] = useState(0);
  const [intentoCatalogo, setIntentoCatalogo] = useState(0);
  const [cargandoMesas, setCargandoMesas] = useState(true);
  const [errorMesas, setErrorMesas] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackContent | null>(null);

  const mesaSeleccionada = useMemo(
    () => mesas.find((mesa) => mesa.id === mesaId) ?? null,
    [mesaId, mesas],
  );
  const candidatos = useMemo(
    () => todosLosCandidatos.filter((candidato) => candidato.dignidad === dignidad),
    [dignidad, todosLosCandidatos],
  );
  const cargandoCandidatos = cargandoMesas;

  useEffect(() => {
    let activa = true;

    const cargarCatalogo = async () => {
      setMesas([]);
      setMesaId(null);
      setTodosLosCandidatos([]);
      setErrorMesas(null);
      setCargandoMesas(true);

      if (!perfil?.id) {
        setErrorMesas('La sesión no está disponible. Vuelva a iniciar sesión.');
        setCargandoMesas(false);
        return;
      }

      try {
        const sincronizado = await territorioRepository.sincronizarCatalogoTerritorial();
        const [mesasAsignadas, candidatosDisponibles] = await Promise.all([
          territorioRepository.listarMesasAsignadas(),
          territorioRepository.listarCandidatos(),
        ]);
        if (activa) {
          setMesas(mesasAsignadas);
          setMesaId(mesasAsignadas[0]?.id ?? null);
          setTodosLosCandidatos(candidatosDisponibles);
          setErrorMesas(
            mesasAsignadas.length === 0
              ? sincronizado
                ? 'No tiene mesas asignadas.'
                : 'No hay mesas asignadas guardadas en este dispositivo. Conéctese para actualizar.'
              : null,
          );
        }
      } catch (error) {
        if (activa) {
          const mensaje = error instanceof Error ? error.message : 'Error desconocido.';
          setErrorMesas(`No se pudo cargar el catálogo electoral: ${mensaje}`);
          await crashReportingService.registrarError(
            error instanceof Error ? error : new Error(mensaje),
            {
              operacion: 'cargar_catalogo_veedor',
              pantalla: 'captura_acta',
            },
          );
        }
      } finally {
        if (activa) setCargandoMesas(false);
      }
    };

    void cargarCatalogo();
    return () => {
      activa = false;
    };
  }, [crashReportingService, intentoCatalogo, perfil?.id, territorioRepository]);

  const mostrarError = useCallback((titulo: string, mensaje: string) => {
    setFeedback({ title: titulo, message: mensaje, tone: 'error' });
  }, []);

  const capturarActa = async () => {
    if (!cameraRef.current || !camaraLista) {
      mostrarError('Cámara no disponible', 'Espere a que la cámara esté lista e intente nuevamente.');
      return;
    }
    if (!mesaSeleccionada) {
      mostrarError('Mesa no disponible', 'Seleccione una mesa asignada antes de continuar.');
      return;
    }
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
          message: `La dignidad ${dignidad} ya fue registrada para la mesa ${nombreMesa(mesaSeleccionada)}.`,
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
        fotoStoragePath: null,
        ubicacion,
        alertaUbicacion: false,
        verificacionTerritorial: null,
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
          pathname: '/(actas)/verificacion',
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
          onPress={() => volverSeguro('/(veedor)/veedor')}
        >
          <Text className="font-semibold text-slate-600" selectable>
            Volver
          </Text>
        </Pressable>
      </View>
    );
  }

  const motivoBloqueo = cargando
    ? 'Procesando la captura.'
    : cargandoMesas
      ? 'Cargando mesas y candidatos.'
      : !mesaSeleccionada
        ? 'Se necesita una mesa asignada para tomar la foto.'
        : candidatos.length !== 5
          ? `Se requieren cinco candidatos para ${dignidad}; hay ${candidatos.length} disponibles.`
          : errorCamara
            ? 'La cámara no está disponible.'
            : !camaraLista
              ? 'Esperando a que la cámara esté lista.'
              : null;

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
                  accessibilityLabel={`Mesa ${mesa.numero}, ${
                    mesa.genero === 'FEMENINO' ? 'femenina' : mesa.genero === 'MASCULINO' ? 'masculina' : 'mixta'
                  }`}
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
                    {nombreMesa(mesa)}
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
              : `Se requieren cinco candidatos para ${dignidad}; hay ${candidatos.length} disponibles.`}
          </Text>
          {!cargandoMesas && (errorMesas || candidatos.length !== 5) ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setIntentoCatalogo((intento) => intento + 1)}
              className="min-h-11 justify-center"
            >
              <Text className="font-semibold text-primario">Actualizar mesas y candidatos</Text>
            </Pressable>
          ) : null}
        </View>

        <View className="overflow-hidden rounded-2xl bg-slate-900">
          <View className="h-[360px]">
            <CameraView
              key={intentoCamara}
              ref={cameraRef}
              style={{ flex: 1 }}
              facing="back"
              mode="picture"
              enableTorch={linternaActiva}
              animateShutter
              onCameraReady={() => {
                setErrorCamara(null);
                setCamaraLista(true);
              }}
              onMountError={({ message }) => {
                const detalle = message || 'Error desconocido al iniciar la cámara.';
                setCamaraLista(false);
                setErrorCamara(detalle);
                void crashReportingService.registrarError(new Error(detalle), {
                  operacion: 'iniciar_camara',
                  pantalla: 'captura_acta',
                });
              }}
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

        {errorCamara ? (
          <View className="gap-2">
            <Text className="text-sm text-red-700" selectable>
              No se pudo iniciar la cámara: {errorCamara}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setErrorCamara(null);
                setCamaraLista(false);
                setIntentoCamara((intento) => intento + 1);
              }}
              className="min-h-11 justify-center"
            >
              <Text className="font-semibold text-primario">Reintentar cámara</Text>
            </Pressable>
          </View>
        ) : null}

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
            disabled={motivoBloqueo !== null}
            className={`min-h-12 flex-1 items-center justify-center rounded-xl px-4 ${
              motivoBloqueo ? 'bg-slate-400' : 'bg-primario'
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
        {motivoBloqueo ? (
          <Text className="text-sm text-slate-600" selectable>{motivoBloqueo}</Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          className="min-h-11 items-center justify-center"
          onPress={() => volverSeguro('/(veedor)/veedor')}
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
