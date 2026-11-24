import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Redirect, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { router } from 'expo-router';
import { useAppDispatch, useAppSelector } from '@/presentation/store';
import { obtenerUsuarios } from '@/presentation/store/slices/usuariosSlice';
import {
  FeedbackBottomSheet,
  type FeedbackContent,
} from '@/presentation/components/auth/FeedbackBottomSheet';
import type { GestorUsuarios } from '@/domain/entities/GestorUsuarios';

export function GestionUsuariosScreen() {
  const dispatch = useAppDispatch();
  const { perfil, inicializando } = useAppSelector((state) => state.auth);
  const { usuarios, cargando, error, pagina, porPagina, total } = useAppSelector(
    (state) => state.usuarios
  );
  const [feedback, setFeedback] = useState<FeedbackContent | null>(null);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused && perfil) {
      const rolFiltrado =
        perfil.rol === 'COORDINADOR_PROVINCIAL'
          ? 'COORDINADOR_RECINTO'
          : perfil.rol === 'COORDINADOR_RECINTO'
            ? 'VEEDOR'
            : undefined;

      void dispatch(
        obtenerUsuarios({
          filtros: {
            rol: rolFiltrado,
            recintoId: perfil.rol === 'COORDINADOR_RECINTO' ? perfil.recintoId || undefined : undefined,
            activo: true,
          },
        })
      );
    }
  }, [isFocused, perfil, dispatch]);

  if (inicializando) return <ActivityIndicator />;
  if (!perfil) return <Redirect href="/(auth)/login" />;

  if (perfil.rol === 'VEEDOR') {
    return (
      <View className="flex-1 bg-fondo px-6 py-10">
        <Text className="text-xl font-bold text-texto">No tiene permisos para gestionar usuarios.</Text>
      </View>
    );
  }

  const renderUsuario = ({ item }: { item: GestorUsuarios }) => (
    <Pressable
      onPress={() => router.push(`/usuarios/${item.id}`)}
      className="mb-3 rounded-2xl border border-slate-200 bg-white p-4"
    >
      <Text className="text-lg font-bold text-texto">{item.nombresCompletos}</Text>
      <Text className="text-sm text-slate-600">{item.email}</Text>
      <Text className="text-xs text-slate-500">{item.rol.replaceAll('_', ' ')}</Text>
      <Text className={`mt-1 text-xs font-semibold ${item.activo ? 'text-green-600' : 'text-red-600'}`}>
        {item.activo ? '✓ Activo' : '✕ Inactivo'}
      </Text>
    </Pressable>
  );

  return (
    <View className="flex-1 bg-fondo">
      <View className="px-6 py-6">
        <Pressable
          onPress={() => router.back()}
          className="mb-4 min-h-10 justify-center"
        >
          <Text className="text-sm font-bold text-primario">← Volver</Text>
        </Pressable>
        <Text className="text-3xl font-bold text-texto">
          {perfil.rol === 'COORDINADOR_PROVINCIAL' ? 'Coordinadores de Recinto' : 'Veedores'}
        </Text>
        <Text className="mt-2 text-sm text-slate-600">Total: {total}</Text>
      </View>

      {error && (
        <View className="mx-6 rounded-lg border border-red-200 bg-red-50 p-3">
          <Text className="text-sm text-red-700">{error}</Text>
        </View>
      )}

      {cargando && usuarios.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={usuarios}
          keyExtractor={(item) => item.id}
          renderItem={renderUsuario}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center px-6 py-10">
              <Text className="text-center text-slate-600">No hay usuarios registrados.</Text>
            </View>
          }
          contentContainerClassName="px-6 pb-6"
          onEndReached={() => {
            if (pagina * porPagina < total && !cargando) {
              void dispatch(
                obtenerUsuarios({
                  filtros: {
                    rol:
                      perfil.rol === 'COORDINADOR_PROVINCIAL'
                        ? 'COORDINADOR_RECINTO'
                        : 'VEEDOR',
                    activo: true,
                  },
                  pagina: pagina + 1,
                })
              );
            }
          }}
        />
      )}

      <Pressable
        onPress={() => router.push('/usuarios/crear')}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-primario"
      >
        <Text className="text-2xl font-bold text-white">+</Text>
      </Pressable>

      <FeedbackBottomSheet content={feedback} onDismiss={() => setFeedback(null)} />
    </View>
  );
}
