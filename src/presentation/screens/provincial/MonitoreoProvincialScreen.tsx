import { router } from 'expo-router';
import { Picker } from '@expo/ui/community/picker';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import type { Dignidad } from '@/domain/entities/Candidato';
import type { IMonitoreoProvincial } from '@/domain/ports/IMonitoreoProvincial';
import { filtrarMonitoreo } from '@/domain/usecases/filtrarMonitoreo';
import { mapearResultadosAGrafico, mapearVotosBlancosNulos } from '@/presentation/components/monitoreo/chartUtils';
import { PieChartResultados } from '@/presentation/components/monitoreo/PieChartResultados';
import { volverSeguro } from '@/presentation/navigation/volverSeguro';
import { useAppDispatch, useAppSelector } from '@/presentation/store';
import { cargarMonitoreo } from '@/presentation/store/slices/monitoreoSlice';

export function MonitoreoProvincialScreen({ monitoreo }: { monitoreo: IMonitoreoProvincial }) {
  const dispatch = useAppDispatch();
  const { datos, cargando, error } = useAppSelector((state) => state.monitoreo);
  const [cantonElegido, setCanton] = useState<string | null>(null);
  const [recinto, setRecinto] = useState<string | null>(null);
  const [estado, setEstado] = useState('Conectando');

  useEffect(() => {
    let activo = true;
    let temporizador: ReturnType<typeof setTimeout> | undefined;
    const actualizar = () => {
      if (temporizador) clearTimeout(temporizador);
      temporizador = setTimeout(() => {
        if (activo) void dispatch(cargarMonitoreo());
      }, 400);
    };
    const cancelar = monitoreo.suscribir(actualizar, (nuevo) => {
      if (!activo) return;
      if (nuevo === 'SUBSCRIBED') {
        setEstado('En vivo');
        actualizar();
      } else if (nuevo === 'CHANNEL_ERROR' || nuevo === 'TIMED_OUT' || nuevo === 'CLOSED') {
        setEstado('Tiempo real desconectado; actualice para consultar los datos');
      }
    });
    void dispatch(cargarMonitoreo());
    return () => {
      activo = false;
      if (temporizador) clearTimeout(temporizador);
      cancelar();
    };
  }, [dispatch, monitoreo]);

  const cantones = useMemo(() => [...new Set(datos?.avances.map((a) => a.canton) ?? [])].sort(), [datos]);
  const canton = cantonElegido && cantones.includes(cantonElegido) ? cantonElegido : cantones[0];
  const avances = datos?.avances.filter((a) => a.canton === canton) ?? [];
  const recintoActivo = avances.some((a) => a.recintoId === recinto) ? recinto : null;
  const seleccion = datos && canton ? filtrarMonitoreo(datos, canton, recintoActivo) : null;
  const recintosVisibles = seleccion?.avances ?? [];
  const resultados = seleccion?.resultados ?? [];
  const actas = seleccion?.actas ?? [];

  return (
    <ScrollView className="flex-1 bg-fondo" contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="gap-5 px-5 pb-12 pt-6"
      refreshControl={<RefreshControl refreshing={cargando} onRefresh={() => void dispatch(cargarMonitoreo())} />}>
      <Pressable accessibilityRole="button" onPress={() => volverSeguro('/(provincial)/provincial')} className="min-h-11 justify-center">
        <Text className="font-bold text-primario">Volver</Text>
      </Pressable>
      <Text className="text-3xl font-bold text-texto" selectable>Monitoreo provincial</Text>
      <Text className="text-sm text-slate-600" selectable>{estado}</Text>
      {error ? (
        <View className="gap-2 rounded-xl border border-red-200 bg-red-50 p-4">
          <Text className="text-red-800" selectable>{error}</Text>
          <Pressable accessibilityRole="button" onPress={() => void dispatch(cargarMonitoreo())}>
            <Text className="font-bold text-red-900">Reintentar</Text>
          </Pressable>
        </View>
      ) : null}
      {!datos && cargando ? <ActivityIndicator size="large" color="#1B365D" /> : null}
      {datos && cantones.length === 0 ? <Text className="text-slate-600">No hay recintos disponibles.</Text> : null}
      {datos && seleccion && cantones.length > 0 ? (
        <>
          <Text className="text-xl font-bold text-texto">Resultados gráficos</Text>
          <Text className="text-sm text-slate-600" selectable>
            {canton} · {recintoActivo ? avances.find((item) => item.recintoId === recintoActivo)?.nombre : 'Total cantonal'}
          </Text>
          <Text className="text-sm leading-5 text-slate-600">
            Porcentajes sobre el total de votos registrados, incluidos blancos y nulos.
          </Text>
          {(['ALCALDE', 'PREFECTO'] as Dignidad[]).map((dignidad) => {
            const candidatosOrdenados = [...new Set(
              datos.resultados.filter((resultado) => resultado.dignidad === dignidad).map((resultado) => resultado.candidatoId),
            )].sort();
            return (
              <PieChartResultados
                key={dignidad}
                titulo={dignidad === 'ALCALDE' ? 'Alcaldía' : 'Prefectura'}
                datos={[
                  ...mapearResultadosAGrafico(
                    resultados.filter((resultado) => resultado.dignidad === dignidad),
                    candidatosOrdenados,
                  ),
                  ...mapearVotosBlancosNulos(
                    seleccion.votosBlancosNulos[dignidad].blancos,
                    seleccion.votosBlancosNulos[dignidad].nulos,
                  ),
                ]}
              />
            );
          })}
          <Text className="text-lg font-bold text-texto">Cantón</Text>
          <View className="flex-row flex-wrap gap-2">
            {cantones.map((item) => (
              <Filtro key={item} texto={item} activo={item === canton} onPress={() => { setCanton(item); setRecinto(null); }} />
            ))}
          </View>
          <Text className="text-lg font-bold text-texto">Recinto</Text>
          <View>
            <Picker
              selectedValue={recintoActivo ?? ''}
              onValueChange={(valor) => setRecinto(valor === '' ? null : valor)}
              testID="selector-recinto"
            >
              <Picker.Item label="Total cantonal" value="" />
              {avances.map((item) => (
                <Picker.Item key={item.recintoId} label={item.nombre} value={item.recintoId} />
              ))}
            </Picker>
            <Text pointerEvents="none" accessible={false} className="absolute right-4 top-4 text-slate-600">▼</Text>
          </View>
          <Text className="text-xl font-bold text-texto">Avance de mesas</Text>
          <Text className="text-sm text-slate-600">Una mesa reportada tiene al menos una acta enviada.</Text>
          {recintosVisibles.map((a) => (
            <View key={a.recintoId} className="gap-1 rounded-xl border border-slate-200 bg-white p-4">
              <Text className="font-bold text-texto" selectable>{a.nombre} · {a.parroquia}</Text>
              <Text className="text-slate-700" selectable>{a.mesasReportadas} de {a.totalMesas} mesas con reportes · {a.mesasFaltantes} sin reportes</Text>
              <Text className="text-sm text-slate-600" selectable>{a.actasReportadas} actas enviadas · {a.actasFaltantes} faltantes</Text>
              {a.alertas > 0 ? <Text className="font-bold text-red-700" selectable>! {a.alertas} actas con alerta GPS</Text> : null}
            </View>
          ))}
          {(['ALCALDE', 'PREFECTO'] as Dignidad[]).map((dignidad) => (
            <View key={dignidad} className="gap-2">
              <Text className="text-xl font-bold text-texto">{dignidad === 'ALCALDE' ? 'Alcaldía' : 'Prefectura'}</Text>
              {resultados.filter((r) => r.dignidad === dignidad).map((r) => (
                <View key={r.candidatoId} className="flex-row justify-between gap-3 border-b border-slate-200 py-2">
                  <Text className="flex-1 text-texto" selectable>{r.candidato} · {r.organizacion} ({r.lista})</Text>
                  <Text className="font-bold text-texto" selectable>{r.votos.toLocaleString()}</Text>
                </View>
              ))}
              {resultados.every((r) => r.dignidad !== dignidad) ? <Text className="text-slate-600">Sin resultados disponibles.</Text> : null}
            </View>
          ))}
          <Text className="text-xl font-bold text-texto">Actas para auditoría</Text>
          {actas.length === 0 ? <Text className="text-slate-600">No hay actas enviadas en esta selección.</Text> : null}
          {actas.map((a) => (
            <Pressable key={a.id} accessibilityRole="button"
              onPress={() => router.push({ pathname: '/(provincial)/auditoria', params: { actaId: a.id } })}
              className="min-h-14 flex-row items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <Text className="flex-1 text-texto" selectable>
                {avances.find((r) => r.recintoId === a.recintoId)?.nombre} · Mesa {a.mesa} {a.genero} · {a.dignidad}
              </Text>
              {a.alerta ? <Text className="rounded-full bg-red-700 px-3 py-1 font-bold text-white">!</Text> : null}
            </Pressable>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

function Filtro({ texto, activo, onPress }: { texto: string; activo: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: activo }} onPress={onPress}
      className={`min-h-11 justify-center rounded-xl border px-3 ${activo ? 'border-primario bg-primario' : 'border-slate-300 bg-white'}`}>
      <Text className={activo ? 'font-bold text-white' : 'font-semibold text-texto'}>{texto}</Text>
    </Pressable>
  );
}
