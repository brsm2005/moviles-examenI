import { useEffect, useMemo, useState } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import { colors, fontFamilies, radius } from '@theme/tokens';
import type { Acta } from '@/domain/entities/Acta';
import type { Candidato } from '@/domain/entities/Candidato';
import type { IActaRepository } from '@/domain/ports/IActaRepository';
import type { ICrashReportingService } from '@/domain/ports/ICrashReportingService';
import type { ITerritorioRepository } from '@/domain/ports/ITerritorioRepository';
import { actaVotosConfirmacionSchema } from '@/domain/schemas/actaVotosSchema';
import { FeedbackBottomSheet, type FeedbackContent } from '@/presentation/components/auth/FeedbackBottomSheet';
import { AnimatedButton } from '@/presentation/components/ui/AnimatedButton';
import { useAppSelector } from '@/presentation/store';
import { hapticError, hapticSuccess } from '@/presentation/utils/haptics';

interface ConfirmarActaScreenProps {
  actaRepository: IActaRepository;
  territorioRepository: ITerritorioRepository;
  crashReportingService: ICrashReportingService;
}

interface FormularioVotos {
  totalSufragantes: string;
  votosBlancos: string;
  votosNulos: string;
  votosCandidatos: string[];
}

function textoNumero(value: number | null): string {
  return value === null ? '' : String(value);
}

function enteroOInvalido(value: string): number | null {
  if (!value.trim()) return null;
  if (!/^\d+$/.test(value.trim())) return Number.NaN;
  return Number(value);
}

function mensajeDeError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'No se pudo guardar la confirmación.';
}

export function ConfirmarActaScreen({
  actaRepository,
  territorioRepository,
  crashReportingService,
}: ConfirmarActaScreenProps) {
  const params = useLocalSearchParams<{ actaId?: string | string[] }>();
  const actaId = Array.isArray(params.actaId) ? params.actaId[0] : params.actaId;
  const usuarioId = useAppSelector((state) => state.auth.perfil?.id);
  const [acta, setActa] = useState<Acta | null>(null);
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [formulario, setFormulario] = useState<FormularioVotos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [confirmada, setConfirmada] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackContent | null>(null);

  const candidatosPorId = useMemo(
    () => new Map(candidatos.map((candidato) => [candidato.id, candidato])),
    [candidatos],
  );

  useEffect(() => {
    let activa = true;

    const cargarActa = async () => {
      if (!actaId) {
        setFeedback({
          title: 'No se encontró el acta',
          message: 'Vuelva a la captura e intente abrirla nuevamente.',
          tone: 'error',
        });
        setCargando(false);
        return;
      }

      try {
        const actaLocal = await actaRepository.obtenerPorId(actaId);
        if (!actaLocal) throw new Error('El acta no existe en el dispositivo.');
        const listaCandidatos = await territorioRepository.obtenerCandidatosPorIds(
          actaLocal.votosCandidatos.map((voto) => voto.candidatoId),
        );
        if (!activa) return;

        setActa(actaLocal);
        setCandidatos(listaCandidatos);
        setFormulario({
          totalSufragantes: textoNumero(actaLocal.totalSufragantes),
          votosBlancos: textoNumero(actaLocal.votosBlancos),
          votosNulos: textoNumero(actaLocal.votosNulos),
          votosCandidatos: actaLocal.votosCandidatos.map((voto) =>
            textoNumero(voto.votos),
          ),
        });
      } catch (error) {
        if (activa) {
          await crashReportingService.registrarError(
            error instanceof Error ? error : new Error(mensajeDeError(error)),
            {
              operacion: 'abrir_confirmacion_acta',
              pantalla: 'confirmacion_acta',
              actaId,
            },
          );
          setFeedback({
            title: 'No se pudo abrir la verificación',
            message: mensajeDeError(error),
            tone: 'error',
          });
        }
      } finally {
        if (activa) setCargando(false);
      }
    };

    void cargarActa();
    return () => {
      activa = false;
    };
  }, [
    actaId,
    actaRepository,
    crashReportingService,
    territorioRepository,
  ]);

  const actualizarCampo = (
    campo: keyof Omit<FormularioVotos, 'votosCandidatos'>,
    valor: string,
  ) => {
    setFormulario((actual) =>
      actual ? { ...actual, [campo]: valor } : actual,
    );
  };

  const actualizarVotoCandidato = (indice: number, valor: string) => {
    setFormulario((actual) => {
      if (!actual) return actual;
      const votosCandidatos = [...actual.votosCandidatos];
      votosCandidatos[indice] = valor;
      return { ...actual, votosCandidatos };
    });
  };

  const cuadreEnTiempoReal = useMemo(() => {
    if (!formulario) return { suma: 0, totalSufragantes: 0, cuadra: false };

    const totalSufragantes = enteroOInvalido(formulario.totalSufragantes) ?? 0;
    const votosBlancos = enteroOInvalido(formulario.votosBlancos) ?? 0;
    const votosNulos = enteroOInvalido(formulario.votosNulos) ?? 0;
    const votosCandidatos = formulario.votosCandidatos.reduce(
      (sum, votos) => sum + (enteroOInvalido(votos) ?? 0),
      0,
    );

    const suma = votosCandidatos + votosBlancos + votosNulos;
    const cuadra = suma === totalSufragantes;

    return { suma, totalSufragantes, cuadra };
  }, [formulario]);

  const confirmar = async () => {
    if (!acta || !formulario || !usuarioId) return;
    const resultados = {
      totalSufragantes: enteroOInvalido(formulario.totalSufragantes),
      votosBlancos: enteroOInvalido(formulario.votosBlancos),
      votosNulos: enteroOInvalido(formulario.votosNulos),
      votosCandidatos: acta.votosCandidatos.map((voto, indice) => ({
        candidatoId: voto.candidatoId,
        votos: enteroOInvalido(formulario.votosCandidatos[indice] ?? ''),
      })),
    };
    const validacion = actaVotosConfirmacionSchema.safeParse(resultados);
    if (!validacion.success) {
      hapticError();
      setFeedback({
        title: 'Revise los valores del acta',
        message: validacion.error.issues[0]?.message ?? 'Los votos no son válidos.',
        tone: 'error',
      });
      return;
    }

    setGuardando(true);
    try {
      await actaRepository.confirmarParaSincronizacion(
        acta.id,
        validacion.data,
        usuarioId,
      );
      hapticSuccess();
      setConfirmada(true);
      setFeedback({
        title: 'Confirmación guardada',
        message:
          'La revisión humana quedó registrada localmente. El acta está pendiente de sincronización.',
        tone: 'success',
      });
    } catch (error) {
      hapticError();
      await crashReportingService.registrarError(
        error instanceof Error ? error : new Error(mensajeDeError(error)),
        {
          operacion: 'confirmar_acta',
          pantalla: 'confirmacion_acta',
          actaId: acta.id,
        },
      );
      setFeedback({
        title: 'No se pudo confirmar el acta',
        message: mensajeDeError(error),
        tone: 'error',
      });
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: colors.malvaPalido }}
      >
        <ActivityIndicator size="large" color={colors.moradoPrincipal} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <View className="flex-1 bg-malva">
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-5 px-5 pb-10 pt-5"
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={{
              backgroundColor: colors.moradoPrincipal,
              borderRadius: radius.xl,
              padding: 20,
              gap: 6,
            }}
          >
            <Text
              style={{
                fontFamily: fontFamilies.display,
                fontSize: 32,
                letterSpacing: 0.8,
                color: colors.blancoPuro,
                textTransform: 'uppercase',
              }}
              selectable
            >
              Confirme los resultados
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
              Corrija los dígitos y complete los campos ilegibles. No se sincronizará sin su confirmación.
            </Text>
            {acta ? (
              <View
                style={{
                  alignSelf: 'flex-start',
                  marginTop: 6,
                  backgroundColor: colors.moradoOscuro,
                  borderRadius: radius.full,
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                }}
              >
                <Text
                  style={{
                    fontFamily: fontFamilies.bodyBold,
                    fontSize: 12,
                    color: colors.amarilloPrincipal,
                  }}
                  selectable
                >
                  Mesa {acta.mesaJrvId} · {acta.dignidad}
                </Text>
              </View>
            ) : null}
          </View>

          {!acta || !formulario ? (
            <View className="rounded-2xl border border-red-300 bg-red-50 p-4">
              <Text className="font-body-semibold text-sm text-red-800" selectable>
                No se pudieron cargar los datos locales del acta.
              </Text>
            </View>
          ) : acta.estado !== 'NEEDS_CONFIRMATION' ? (
            <View className="rounded-2xl border border-primario bg-crema p-4">
              <Text className="font-body-semibold text-sm text-texto" selectable>
                El acta se encuentra en estado {acta.estado}; no está disponible para confirmación.
              </Text>
            </View>
          ) : (
            <>
              <View className="gap-3.5 rounded-2xl border border-borde-lavanda bg-white p-4">
                <Text
                  style={{
                    fontFamily: fontFamilies.display,
                    fontSize: 24,
                    color: colors.moradoPrincipal,
                    textTransform: 'uppercase',
                  }}
                >
                  Totales del acta
                </Text>
                <CampoNumero
                  etiqueta="Total de sufragantes"
                  valor={formulario.totalSufragantes}
                  destacado
                  onChangeText={(valor) => actualizarCampo('totalSufragantes', valor)}
                />
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <CampoNumero
                      etiqueta="Votos blancos"
                      valor={formulario.votosBlancos}
                      onChangeText={(valor) => actualizarCampo('votosBlancos', valor)}
                    />
                  </View>
                  <View className="flex-1">
                    <CampoNumero
                      etiqueta="Votos nulos"
                      valor={formulario.votosNulos}
                      onChangeText={(valor) => actualizarCampo('votosNulos', valor)}
                    />
                  </View>
                </View>
              </View>

              <View className="gap-3 rounded-2xl border border-borde-lavanda bg-white p-4">
                <Text
                  style={{
                    fontFamily: fontFamilies.display,
                    fontSize: 24,
                    color: colors.moradoPrincipal,
                    textTransform: 'uppercase',
                  }}
                  selectable
                >
                  Votos por candidato
                </Text>
                {acta.votosCandidatos.map((voto, indice) => (
                  <CampoNumero
                    key={voto.candidatoId}
                    etiqueta={
                      candidatosPorId.get(voto.candidatoId)?.nombresCompletos ??
                      `Candidato ${indice + 1}`
                    }
                    valor={formulario.votosCandidatos[indice] ?? ''}
                    alterno={indice % 2 === 1}
                    onChangeText={(valor) =>
                      actualizarVotoCandidato(indice, valor)
                    }
                  />
                ))}
              </View>

              {/* Verificación de cuadre aritmético en tiempo real */}
              <View
                style={{
                  borderRadius: radius.lg,
                  borderWidth: 1.5,
                  padding: 16,
                  backgroundColor:
                    cuadreEnTiempoReal.totalSufragantes === 0
                      ? colors.cremaLimon
                      : cuadreEnTiempoReal.cuadra
                        ? colors.exitoFondo
                        : colors.errorFondo,
                  borderColor:
                    cuadreEnTiempoReal.totalSufragantes === 0
                      ? colors.advertenciaBorde
                      : cuadreEnTiempoReal.cuadra
                        ? colors.exitoBorde
                        : colors.errorBorde,
                  gap: 6,
                }}
              >
                <View className="flex-row items-center justify-between gap-2">
                  <Text
                    style={{
                      fontFamily: fontFamilies.display,
                      fontSize: 24,
                      color:
                        cuadreEnTiempoReal.totalSufragantes === 0
                          ? colors.moradoPrincipal
                          : cuadreEnTiempoReal.cuadra
                            ? colors.exito
                            : colors.error,
                      textTransform: 'uppercase',
                    }}
                    selectable
                  >
                    {cuadreEnTiempoReal.totalSufragantes === 0
                      ? 'Verificación de cuadre'
                      : cuadreEnTiempoReal.cuadra
                        ? '✓ Cuadre correcto'
                        : '✗ Cuadre incorrecto'}
                  </Text>
                  <Text
                    style={{
                      fontFamily: fontFamilies.display,
                      fontSize: 24,
                      color: colors.grisCarbon,
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {cuadreEnTiempoReal.suma} / {cuadreEnTiempoReal.totalSufragantes}
                  </Text>
                </View>
                <Text
                  style={{
                    fontFamily: fontFamilies.bodyMedium,
                    fontSize: 13,
                    lineHeight: 19,
                    color: colors.grisCarbon,
                  }}
                  selectable
                >
                  {cuadreEnTiempoReal.totalSufragantes === 0
                    ? 'Complete los campos para verificar que la suma de votos coincida.'
                    : cuadreEnTiempoReal.cuadra
                      ? `La suma de votos (${cuadreEnTiempoReal.suma}) coincide exactamente con el total de sufragantes.`
                      : `Suma: ${cuadreEnTiempoReal.suma} · Total: ${cuadreEnTiempoReal.totalSufragantes} · Diferencia: ${Math.abs(cuadreEnTiempoReal.suma - cuadreEnTiempoReal.totalSufragantes)}`}
                </Text>
              </View>

              {acta.alertaUbicacion ? (
                <View className="rounded-xl border border-primario bg-crema p-4">
                  <Text className="font-body-bold text-sm text-texto" selectable>
                    ! La ubicación de esta acta requiere revisión.
                  </Text>
                </View>
              ) : null}

              <AnimatedButton
                title="Confirmar revisión humana"
                variant="primaryAccent"
                disabled={guardando || confirmada}
                loading={guardando}
                haptic="medium"
                onPress={() => void confirmar()}
              />
            </>
          )}

          <Pressable
            accessibilityRole="button"
            className="min-h-12 items-center justify-center rounded-xl border border-borde-lavanda bg-white"
            onPress={() => router.back()}
          >
            <Text className="font-body-bold text-primario" selectable>
              Volver
            </Text>
          </Pressable>
        </ScrollView>
        <FeedbackBottomSheet
          content={feedback}
          onDismiss={() => {
            setFeedback(null);
            if (confirmada) router.back();
          }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

interface CampoNumeroProps {
  etiqueta: string;
  valor: string;
  destacado?: boolean;
  alterno?: boolean;
  onChangeText: (valor: string) => void;
}

function CampoNumero({
  etiqueta,
  valor,
  destacado = false,
  alterno = false,
  onChangeText,
}: CampoNumeroProps) {
  return (
    <View
      style={{
        gap: 6,
        borderRadius: radius.md,
        padding: destacado ? 12 : 10,
        backgroundColor: destacado
          ? colors.lavandaSuave
          : alterno
            ? colors.vainillaClaro
            : colors.blancoPuro,
      }}
    >
      <Text
        style={{
          fontFamily: fontFamilies.bodyBold,
          fontSize: 13,
          color: destacado ? colors.moradoPrincipal : colors.grisCarbon,
        }}
        selectable
      >
        {etiqueta}
      </Text>
      <TextInput
        accessibilityLabel={etiqueta}
        keyboardType="number-pad"
        value={valor}
        onChangeText={onChangeText}
        placeholder="0"
        placeholderTextColor={colors.textoSecundario}
        selectionColor={colors.moradoPrincipal}
        selectTextOnFocus
        style={{
          minHeight: 54,
          borderRadius: radius.md,
          borderWidth: 1.5,
          borderColor: destacado ? colors.moradoPrincipal : colors.bordeLavanda,
          backgroundColor: colors.blancoPuro,
          paddingHorizontal: 16,
          fontFamily: fontFamilies.display,
          fontSize: 30,
          letterSpacing: 1,
          fontVariant: ['tabular-nums'],
          color: colors.grisCarbon,
        }}
      />
    </View>
  );
}
