import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import type { Acta } from '@/domain/entities/Acta';
import type { Candidato } from '@/domain/entities/Candidato';
import type { IActaRepository } from '@/domain/ports/IActaRepository';
import type { ICrashReportingService } from '@/domain/ports/ICrashReportingService';
import type { ITerritorioRepository } from '@/domain/ports/ITerritorioRepository';
import { actaVotosConfirmacionSchema } from '@/domain/schemas/actaVotosSchema';
import { FeedbackBottomSheet, type FeedbackContent } from '@/presentation/components/auth/FeedbackBottomSheet';
import { useAppSelector } from '@/presentation/store';

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
      setConfirmada(true);
      setFeedback({
        title: 'Confirmación guardada',
        message:
          'La revisión humana quedó registrada localmente. El acta está pendiente de sincronización.',
        tone: 'success',
      });
    } catch (error) {
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
      <View className="flex-1 items-center justify-center bg-fondo">
        <ActivityIndicator size="large" color="#1B365D" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-fondo">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-5 pb-8 pt-6"
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-1">
          <Text className="text-xs font-bold tracking-[2px] text-secundario" selectable>
            REVISIÓN HUMANA
          </Text>
          <Text className="text-2xl font-bold text-texto" selectable>
            Confirme los resultados
          </Text>
          <Text className="text-sm leading-5 text-slate-600" selectable>
            Corrija los dígitos y complete los campos ilegibles. No se sincronizará sin su confirmación.
          </Text>
          {acta ? (
            <Text className="mt-1 text-xs text-slate-500" selectable>
              Mesa {acta.mesaJrvId} · {acta.dignidad}
            </Text>
          ) : null}
        </View>

        {!acta || !formulario ? (
          <Text className="text-sm text-red-700" selectable>
            No se pudieron cargar los datos locales del acta.
          </Text>
        ) : acta.estado !== 'NEEDS_CONFIRMATION' ? (
          <Text className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900" selectable>
            El acta se encuentra en estado {acta.estado}; no está disponible para confirmación.
          </Text>
        ) : (
          <>
            <CampoNumero
              etiqueta="Total de sufragantes"
              valor={formulario.totalSufragantes}
              onChangeText={(valor) => actualizarCampo('totalSufragantes', valor)}
            />
            <CampoNumero
              etiqueta="Votos blancos"
              valor={formulario.votosBlancos}
              onChangeText={(valor) => actualizarCampo('votosBlancos', valor)}
            />
            <CampoNumero
              etiqueta="Votos nulos"
              valor={formulario.votosNulos}
              onChangeText={(valor) => actualizarCampo('votosNulos', valor)}
            />
            <View className="gap-3">
              <Text className="font-bold text-texto" selectable>
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
                  onChangeText={(valor) =>
                    actualizarVotoCandidato(indice, valor)
                  }
                />
              ))}
            </View>
            {acta.alertaUbicacion ? (
              <Text className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900" selectable>
                ! La ubicación de esta acta requiere revisión.
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              disabled={guardando || confirmada}
              className={`min-h-12 items-center justify-center rounded-xl px-4 ${
                guardando || confirmada ? 'bg-slate-400' : 'bg-primario'
              }`}
              onPress={() => void confirmar()}
            >
              {guardando ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="font-bold text-white" selectable>
                  Confirmar revisión humana
                </Text>
              )}
            </Pressable>
          </>
        )}

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
        onDismiss={() => {
          setFeedback(null);
          if (confirmada) router.back();
        }}
      />
    </View>
  );
}

interface CampoNumeroProps {
  etiqueta: string;
  valor: string;
  onChangeText: (valor: string) => void;
}

function CampoNumero({ etiqueta, valor, onChangeText }: CampoNumeroProps) {
  return (
    <View className="gap-1">
      <Text className="text-sm font-semibold text-texto" selectable>
        {etiqueta}
      </Text>
      <TextInput
        accessibilityLabel={etiqueta}
        className="min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-base text-texto"
        keyboardType="number-pad"
        value={valor}
        onChangeText={onChangeText}
        placeholder="Ingrese el valor"
        selectTextOnFocus
      />
    </View>
  );
}
