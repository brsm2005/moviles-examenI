import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { colors } from '@theme/tokens';
import type { Perfil } from '@/domain/entities/Perfil';
import { FeedbackBottomSheet, type FeedbackContent } from '@/presentation/components/auth/FeedbackBottomSheet';
import { CrearPersonalBottomSheet } from '@/presentation/components/personal/CrearPersonalBottomSheet';
import { EditarNombreBottomSheet } from '@/presentation/components/personal/EditarNombreBottomSheet';
import { AnimatedButton } from '@/presentation/components/ui/AnimatedButton';
import { useAppDispatch, useAppSelector } from '@/presentation/store';
import {
  cargarSubordinados,
  clearPersonalError,
  clearUltimoCreado,
  eliminarPersonal,
} from '@/presentation/store/slices/personalSlice';

export function GestionPersonalScreen({ perfil }: { perfil: Perfil }) {
  const dispatch = useAppDispatch();
  const { subordinados, cargando, error, ultimoCreado } = useAppSelector(
    (state) => state.personal,
  );

  const [feedbackContent, setFeedbackContent] = useState<FeedbackContent | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [abrirCrear, setAbrirCrear] = useState(false);
  const previousUltimoCreado = useRef<string | null>(null);

  const rolSubordinado: 'COORDINADOR_RECINTO' | 'VEEDOR' | null =
    perfil.rol === 'COORDINADOR_PROVINCIAL'
      ? 'COORDINADOR_RECINTO'
      : perfil.rol === 'COORDINADOR_RECINTO'
        ? 'VEEDOR'
        : null;

  const nombreRolSubordinado =
    rolSubordinado === 'COORDINADOR_RECINTO'
      ? 'Coordinador de Recinto'
      : rolSubordinado === 'VEEDOR'
        ? 'Veedor'
        : null;

  useFocusEffect(
    useCallback(() => {
      void dispatch(cargarSubordinados());
    }, [dispatch]),
  );

  useEffect(() => {
    if (ultimoCreado && ultimoCreado.id !== previousUltimoCreado.current) {
      previousUltimoCreado.current = ultimoCreado.id;
      setFeedbackContent({
        title: 'Usuario creado',
        message: `Se envió el correo de verificación a ${ultimoCreado.email}. El usuario debe confirmar su correo y cambiar la contraseña temporal al ingresar.`,
        tone: 'success',
      });
      setAbrirCrear(false);
      dispatch(clearUltimoCreado());
    }
  }, [ultimoCreado, dispatch]);

  if (!rolSubordinado || !nombreRolSubordinado) {
    return (
      <View className="flex-1 items-center justify-center bg-malva px-6">
        <Text className="font-body text-texto-secundario">
          No tiene subordinados para gestionar
        </Text>
      </View>
    );
  }

  const handleEliminar = async (id: string) => {
    try {
      await dispatch(eliminarPersonal(id)).unwrap();
      setFeedbackContent({
        title: 'Usuario desactivado',
        message: 'El acceso del usuario ha sido revocado',
        tone: 'success',
      });
    } catch (err) {
      setFeedbackContent({
        title: 'Error al desactivar',
        message:
          err instanceof Error ? err.message : 'No se pudo desactivar el usuario',
        tone: 'error',
      });
    }
  };

  return (
    <View className="flex-1 bg-malva">
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-5 px-5 pb-12 pt-5"
        refreshControl={
          <RefreshControl
            refreshing={cargando}
            tintColor={colors.moradoPrincipal}
            colors={[colors.moradoPrincipal]}
            onRefresh={() => void dispatch(cargarSubordinados())}
          />
        }
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          className="min-h-12 self-start justify-center rounded-xl border border-borde-lavanda bg-white px-4"
        >
          <Text className="font-body-bold text-sm text-primario">← Volver</Text>
        </Pressable>

        <View className="gap-2 rounded-2xl bg-primario p-5">
          <Text className="font-display text-3xl uppercase tracking-wider text-white">
            Gestión de {nombreRolSubordinado}s
          </Text>
          <Text className="font-body text-sm text-malva">
            Administre los {nombreRolSubordinado}s bajo su responsabilidad
          </Text>
        </View>

        {error ? (
          <View className="gap-2 rounded-2xl border border-red-300 bg-red-50 p-4">
            <Text className="font-body text-sm text-red-800">{error}</Text>
            <AnimatedButton
              title="Descartar"
              variant="danger"
              compact
              onPress={() => dispatch(clearPersonalError())}
            />
          </View>
        ) : null}

        <AnimatedButton
          title={`Crear nuevo ${nombreRolSubordinado}`}
          variant="yellowAction"
          haptic="medium"
          onPress={() => setAbrirCrear(true)}
        />

        {cargando && subordinados.length === 0 ? (
          <View className="items-center justify-center py-12">
            <ActivityIndicator size="large" color={colors.moradoPrincipal} />
          </View>
        ) : null}

        {!cargando && subordinados.length === 0 ? (
          <View className="rounded-2xl border border-borde-lavanda bg-white p-8">
            <Text className="text-center font-body text-texto-secundario">
              No hay {nombreRolSubordinado}s registrados aún
            </Text>
          </View>
        ) : null}

        {subordinados.map((personal, idx) => (
          <View
            key={personal.id}
            className={`gap-3 rounded-2xl border p-4 ${
              idx % 2 === 1
                ? 'border-beige-borde bg-vainilla'
                : 'border-borde-lavanda bg-white'
            }`}
          >
            <View className="gap-1">
              <Text className="font-body-bold text-lg text-texto" selectable>
                {personal.nombresCompletos}
              </Text>
              <Text className="font-body text-sm text-texto-secundario" selectable>
                {personal.email}
              </Text>
              {personal.telefono ? (
                <Text className="font-body text-sm text-texto-secundario" selectable>
                  {personal.telefono}
                </Text>
              ) : null}
            </View>

            <View className="flex-row gap-2">
              <AnimatedButton
                title="Editar"
                variant="outline"
                compact
                style={{ flex: 1 }}
                onPress={() => setEditandoId(personal.id)}
              />
              <AnimatedButton
                title="Desactivar"
                variant="danger"
                compact
                style={{ flex: 1 }}
                onPress={() => void handleEliminar(personal.id)}
              />
            </View>
          </View>
        ))}
      </ScrollView>

      <CrearPersonalBottomSheet
        rolEsperado={rolSubordinado}
        rolNombre={nombreRolSubordinado}
        recintoId={perfil.recintoId || undefined}
        isOpen={abrirCrear}
        onDismiss={() => setAbrirCrear(false)}
      />

      {editandoId ? (
        <EditarNombreBottomSheet
          personalId={editandoId}
          nombreActual={
            subordinados.find((p) => p.id === editandoId)?.nombresCompletos || ''
          }
          telefonoActual={
            subordinados.find((p) => p.id === editandoId)?.telefono || ''
          }
          isOpen={editandoId !== null}
          onDismiss={() => setEditandoId(null)}
          onSuccess={() => {
            setFeedbackContent({
              title: 'Cambios guardados',
              message: 'La información ha sido actualizada',
              tone: 'success',
            });
          }}
        />
      ) : null}

      <FeedbackBottomSheet
        content={feedbackContent}
        onDismiss={() => setFeedbackContent(null)}
      />
    </View>
  );
}
