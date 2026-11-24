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
import type { Perfil } from '@/domain/entities/Perfil';
import { FeedbackBottomSheet, type FeedbackContent } from '@/presentation/components/auth/FeedbackBottomSheet';
import { CrearPersonalBottomSheet } from '@/presentation/components/personal/CrearPersonalBottomSheet';
import { EditarNombreBottomSheet } from '@/presentation/components/personal/EditarNombreBottomSheet';
import { useAppDispatch, useAppSelector } from '@/presentation/store';
import {
  cargarSubordinados,
  clearPersonalError,
  eliminarPersonal,
  clearUltimoCreado,
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

  // Determinar rol esperado para subordinados
  const rolSubordinado: 'COORDINADOR_RECINTO' | 'VEEDOR' | null =
    perfil.rol === 'COORDINADOR_PROVINCIAL' ? 'COORDINADOR_RECINTO' : perfil.rol === 'COORDINADOR_RECINTO' ? 'VEEDOR' : null;

  const nombreRolSubordinado =
    rolSubordinado === 'COORDINADOR_RECINTO' ? 'Coordinador de Recinto' : rolSubordinado === 'VEEDOR' ? 'Veedor' : null;

  // Recargar al enfocar pantalla
  useFocusEffect(
    useCallback(() => {
      void dispatch(cargarSubordinados());
    }, [dispatch]),
  );

  // Mostrar feedback cuando se crea un usuario
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
      <View className="flex-1 items-center justify-center bg-fondo">
        <Text className="text-slate-600">No tiene subordinados para gestionar</Text>
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
    <View className="flex-1 bg-fondo">
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-5 px-5 pb-12 pt-6"
        refreshControl={
          <RefreshControl
            refreshing={cargando}
            onRefresh={() => void dispatch(cargarSubordinados())}
          />
        }
      >
        {/* Header */}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          className="min-h-11 justify-center"
        >
          <Text className="font-bold text-primario">Volver</Text>
        </Pressable>

        <View className="gap-2">
          <Text className="text-3xl font-bold text-texto">Gestión de {nombreRolSubordinado}s</Text>
          <Text className="text-sm text-slate-600">
            Administre los {nombreRolSubordinado}s bajo su responsabilidad
          </Text>
        </View>

        {/* Error mensaje */}
        {error ? (
          <View className="rounded-xl border border-red-200 bg-red-50 p-4">
            <Text className="text-sm text-red-800">{error}</Text>
            <Pressable
              onPress={() => dispatch(clearPersonalError())}
              className="mt-2"
            >
              <Text className="font-semibold text-red-900">Descartar</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Botón crear */}
        <Pressable
          onPress={() => setAbrirCrear(true)}
          className="min-h-12 items-center justify-center rounded-xl bg-primario px-4"
        >
          <Text className="font-bold text-white">
            Crear nuevo {nombreRolSubordinado}
          </Text>
        </Pressable>

        {/* Loading */}
        {cargando && subordinados.length === 0 ? (
          <View className="items-center justify-center py-12">
            <ActivityIndicator size="large" color="#1B365D" />
          </View>
        ) : null}

        {/* Sin datos */}
        {!cargando && subordinados.length === 0 ? (
          <View className="rounded-2xl border border-slate-200 bg-white p-8">
            <Text className="text-center text-slate-600">
              No hay {nombreRolSubordinado}s registrados aún
            </Text>
          </View>
        ) : null}

        {/* Lista de subordinados */}
        {subordinados.map((personal) => (
          <View
            key={personal.id}
            className="gap-3 rounded-2xl border border-slate-200 bg-white p-4"
          >
            <View className="gap-1">
              <Text className="text-lg font-bold text-texto">{personal.nombresCompletos}</Text>
              <Text className="text-sm text-slate-600">{personal.email}</Text>
              {personal.telefono ? (
                <Text className="text-sm text-slate-600">{personal.telefono}</Text>
              ) : null}
            </View>

            <View className="gap-2">
              <Pressable
                onPress={() => setEditandoId(personal.id)}
                className="min-h-11 items-center justify-center rounded-xl border border-primario bg-transparent px-4"
              >
                <Text className="font-semibold text-primario">Editar información</Text>
              </Pressable>

              <Pressable
                onPress={() => void handleEliminar(personal.id)}
                className="min-h-11 items-center justify-center rounded-xl bg-red-50 px-4"
              >
                <Text className="font-semibold text-red-700">Desactivar acceso</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Bottom Sheets */}
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
