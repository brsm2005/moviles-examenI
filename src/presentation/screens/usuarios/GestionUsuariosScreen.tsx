import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import type { PersonalTerritorial } from '@/domain/entities/PersonalTerritorial';
import { routeForRole } from '@/presentation/navigation/roleRoutes';
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
      const accion = perfil.rol === 'COORDINADOR_PROVINCIAL'
        ? cargarCoordinadoresRecinto()
        : cargarVeedoresDisponibles();

      void dispatch(accion).unwrap().then(
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
      ).finally(() => {
        if (activo) setCargando(false);
      });

      return () => { activo = false; };
    }, [dispatch, inicializando, perfil]),
  );

  if (inicializando) return <ActivityIndicator />;
  if (!perfil) return <Redirect href="/(auth)/login" />;
  if (perfil.mustChangePassword) return <Redirect href="/(auth)/change-password" />;
  if (perfil.rol === 'VEEDOR') return <Redirect href={routeForRole(perfil.rol)} />;

  const esProvincial = perfil.rol === 'COORDINADOR_PROVINCIAL';

  return (
    <View className="flex-1 bg-fondo">
      <View className="gap-4 px-6 py-6">
        <Pressable accessibilityRole="button" onPress={() => router.back()} className="min-h-11 justify-center">
          <Text className="font-bold text-primario">← Volver</Text>
        </Pressable>
        <Text className="text-3xl font-bold text-texto">
          {esProvincial ? 'Coordinadores de recinto' : 'Veedores'}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/(auth)/register-subordinate')}
          className="min-h-12 items-center justify-center rounded-xl bg-primario px-4"
        >
          <Text className="font-bold text-white">
            {esProvincial ? 'Registrar coordinador' : 'Registrar veedor'}
          </Text>
        </Pressable>
        {error ? <Text className="text-sm text-red-700">{error}</Text> : null}
      </View>
      {cargando ? (
        <ActivityIndicator size="large" />
      ) : (
        <FlatList
          data={usuarios}
          keyExtractor={(item) => item.id}
          contentContainerClassName="gap-3 px-6 pb-6"
          renderItem={({ item }) => (
            <View className="gap-1 rounded-2xl border border-slate-200 bg-white p-4">
              <Text className="text-lg font-bold text-texto">{item.nombresCompletos}</Text>
              <Text className="text-sm text-slate-600">{item.email}</Text>
            </View>
          )}
          ListEmptyComponent={
            !error ? <Text className="text-center text-slate-600">No hay usuarios registrados.</Text> : null
          }
        />
      )}
    </View>
  );
}
