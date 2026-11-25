import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import type { PersonalTerritorial } from '@/domain/entities/PersonalTerritorial';
import { routeForRole } from '@/presentation/navigation/roleRoutes';
import { volverSeguro } from '@/presentation/navigation/volverSeguro';
import { useAppDispatch, useAppSelector } from '@/presentation/store';
import {
  cargarCoordinadoresRecinto,
  cargarVeedoresDisponibles,
} from '@/presentation/store/slices/territorioSlice';

export function GestionUsuariosScreen() {
  const dispatch = useAppDispatch();
  const { perfil, inicializando } = useAppSelector((state) => state.auth);
  const [usuarios, setUsuarios] = useState<PersonalTerritorial[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (inicializando || !perfil || perfil.mustChangePassword || perfil.rol === 'VEEDOR') return;

      let activo = true;
      setUsuarios([]);
      setCargando(true);
      setError(null);
      const accion =
        perfil.rol === 'COORDINADOR_PROVINCIAL'
          ? cargarCoordinadoresRecinto()
          : cargarVeedoresDisponibles();

      void dispatch(accion)
        .unwrap()
        .then(
          (resultado) => {
            if (activo) setUsuarios(resultado);
          },
          (motivo: unknown) => {
            if (activo) {
              setError(
                typeof motivo === 'string'
                  ? motivo
                  : motivo instanceof Error
                    ? motivo.message
                    : 'No se pudo cargar el equipo.',
              );
            }
          },
        )
        .finally(() => {
          if (activo) setCargando(false);
        });

      return () => {
        activo = false;
      };
    }, [dispatch, inicializando, perfil]),
  );

  if (inicializando) return <ActivityIndicator color="#6F2C91" />;
  if (!perfil) return <Redirect href="/(auth)/login" />;
  if (perfil.mustChangePassword) return <Redirect href="/(auth)/change-password" />;
  if (perfil.rol === 'VEEDOR') return <Redirect href={routeForRole(perfil.rol)} />;

  const esProvincial = perfil.rol === 'COORDINADOR_PROVINCIAL';

  return (
    <View className="flex-1 bg-malva">
      <View className="gap-4 px-5 pb-4 pt-5">
        <Pressable
          accessibilityRole="button"
          onPress={() => volverSeguro('/ajustes')}
          className="min-h-12 self-start justify-center rounded-xl border border-borde-lavanda bg-white px-4"
        >
          <Text className="font-body-bold text-sm text-primario">← Volver</Text>
        </Pressable>

        <View className="gap-3 rounded-2xl bg-primario p-5">
          <View className="flex-row items-center justify-between gap-3">
            <Text className="min-w-0 flex-1 font-display text-3xl uppercase tracking-wider text-white">
              {esProvincial ? 'Coordinadores de recinto' : 'Veedores'}
            </Text>
            <View className="shrink-0 rounded-full bg-primario-oscuro px-3 py-1">
              <Text
                className="font-display text-xl text-amarillo"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {usuarios.length}
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(auth)/register-subordinate')}
            className="min-h-12 items-center justify-center rounded-xl bg-amarillo px-4"
          >
            <Text className="font-body-bold text-primario">
              {esProvincial ? 'Registrar coordinador' : 'Registrar veedor'}
            </Text>
          </Pressable>
        </View>

        {error ? (
          <View className="rounded-xl border border-red-300 bg-red-50 p-3">
            <Text className="font-body-semibold text-sm text-red-800">{error}</Text>
          </View>
        ) : null}
      </View>

      {cargando ? (
        <View className="items-center py-10">
          <ActivityIndicator size="large" color="#6F2C91" />
        </View>
      ) : (
        <FlatList
          data={usuarios}
          keyExtractor={(item) => item.id}
          contentContainerClassName="gap-3 px-5 pb-8"
          renderItem={({ item, index }) => (
            <View
              className={`gap-1.5 rounded-2xl border p-4 ${
                index % 2 === 1
                  ? 'border-beige-borde bg-vainilla'
                  : 'border-borde-lavanda bg-white'
              }`}
            >
              <Text className="font-body-bold text-base text-texto" selectable>
                {item.nombresCompletos}
              </Text>
              <Text className="font-body text-sm text-texto-secundario" selectable>
                {item.email}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            !error ? (
              <View className="rounded-2xl border border-borde-lavanda bg-white p-6">
                <Text className="text-center font-body text-texto-secundario">
                  No hay usuarios registrados.
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}
