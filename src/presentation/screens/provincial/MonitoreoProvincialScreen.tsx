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

  const totalActasEsperadas = recintosVisibles.reduce((sum, a) => sum +a.totalMesas * 2, 0);
  const totalActasReportadas = recintosVisibles.reduce((sum, a) => sum +a.actasReportadas, 0);
  const porcentajeAvance =totalActasEsperadas > 0? Math.min(100, Math.round((totalActasReportadas /
    totalActasEsperadas) * 100)): 0;const esEnVivo = estado === 'En vivo';

  return (
    <ScrollView
      className="flex-1 bg-malva"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="gap-5 px-5 pb-12 pt-5"
      refreshControl={
        <RefreshControl
          refreshing={cargando}
          tintColor="#6F2C91"
          colors={['#6F2C91']}
          onRefresh={() => void dispatch(cargarMonitoreo())}
        />
      }
    >
      <Pressable
        accessibilityRole="button"
        onPress={() => volverSeguro('/(provincial)/provincial')}
        className="min-h-12 self-start flex-row items-center justify-center rounded-xl border border-borde-lavanda bg-white px-4"
      >
        <Text className="font-body-bold text-sm text-primario">← Volver a territorio</Text>
      </Pressable>

      {/* Cabecera ejecutiva Exit Poll en Morado Principal */}
      <View
        className="gap-3 rounded-2xl bg-primario p-5"
        style={{ borderCurve: 'continuous' }}
      >
        <View className="flex-row flex-wrap items-center justify-between gap-2">
          <View
            className={`flex-row items-center gap-2 rounded-full px-3 py-1.5 ${
              esEnVivo ? 'bg-primario-oscuro' : 'bg-crema'
            }`}
          >
            <View
              className={`h-2.5 w-2.5 rounded-full ${
                esEnVivo ? 'bg-amarillo' : 'bg-primario'
              }`}
            />
            <Text
              className={`font-body-bold text-xs uppercase tracking-wider ${
                esEnVivo ? 'text-amarillo' : 'text-texto'
              }`}
              selectable
            >
              {estado}
            </Text>
          </View>
          {datos && seleccion ? (
            <View className="rounded-full bg-primario-oscuro px-3 py-1">
              <Text
                className="font-display text-lg tracking-wide text-amarillo"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {porcentajeAvance}% ESCRUTADO
              </Text>
            </View>
          ) : null}
        </View>

        <Text
          className="font-display text-4xl uppercase leading-10 tracking-wider text-white"
          selectable
        >
          Monitoreo provincial · Exit Poll
        </Text>

        {datos && seleccion && cantones.length > 0 ? (
          <Text className="font-body-semibold text-sm text-malva" selectable>
            {canton} · {recintoActivo ? avances.find((item) => item.recintoId === recintoActivo)?.nombre : 'Total cantonal'}
          </Text>
        ) : null}
      </View>

      {error ? (
        <View className="gap-3 rounded-2xl border border-red-300 bg-red-50 p-4">
          <Text className="font-body text-sm text-red-800" selectable>{error}</Text>
          <Pressable
            accessibilityRole="button"
            className="min-h-12 items-center justify-center rounded-xl bg-primario px-4"
            onPress={() => void dispatch(cargarMonitoreo())}
          >
            <Text className="font-body-bold text-white">Reintentar</Text>
          </Pressable>
        </View>
      ) : null}

      {!datos && cargando ? (
        <View className="items-center gap-3 rounded-2xl bg-white p-8">
          <ActivityIndicator size="large" color="#6F2C91" />
          <Text className="font-body text-sm text-texto-secundario">
            Cargando resultados en tiempo real…
          </Text>
        </View>
      ) : null}

      {datos && cantones.length === 0 ? (
        <View className="gap-2 rounded-2xl border border-borde-lavanda bg-white p-6">
          <Text className="font-display text-2xl uppercase text-primario">
            Sin datos territoriales
          </Text>
          <Text className="font-body text-sm text-texto-secundario">
            No hay recintos disponibles.
          </Text>
        </View>
      ) : null}

      {datos && seleccion && cantones.length > 0 ? (
        <>
          {/* Panel de filtros territoriales en Lavanda Suave */}
          <View
            className="gap-4 rounded-2xl border border-borde-lavanda bg-lavanda p-4"
            style={{ borderCurve: 'continuous' }}
          >
            <View className="gap-2">
              <Text className="font-display text-xl uppercase tracking-wide text-primario">
                Cantón
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {cantones.map((item) => (
                  <Filtro
                    key={item}
                    texto={item}
                    activo={item === canton}
                    onPress={() => {
                      setCanton(item);
                      setRecinto(null);
                    }}
                  />
                ))}
              </View>
            </View>

            <View className="gap-2">
              <Text className="font-display text-xl uppercase tracking-wide text-primario">
                Recinto
              </Text>
              <View className="relative overflow-hidden rounded-xl border border-borde-lavanda bg-white">
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
                <Text
                  pointerEvents="none"
                  accessible={false}
                  className="absolute right-4 top-4 font-body-bold text-primario"
                >
                  ▼
                </Text>
              </View>
            </View>
          </View>

          {/* Resultados gráficos y barras Exit Poll */}
          <View className="gap-2">
            <Text className="font-display text-3xl uppercase tracking-wide text-primario">
              Resultados gráficos
            </Text>
            <Text className="font-body text-xs leading-5 text-texto-secundario">
              Porcentajes sobre el total de votos registrados, incluidos blancos y nulos.
            </Text>
          </View>

          {(['ALCALDE', 'PREFECTO'] as Dignidad[]).map((dignidad) => {
            const candidatosOrdenados = [...new Set(
              datos.resultados
                .filter((resultado) => resultado.dignidad === dignidad)
                .map((resultado) => resultado.candidatoId),
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

          {/* Avance de mesas por recinto */}
          <View className="gap-2 pt-2">
            <Text className="font-display text-3xl uppercase tracking-wide text-primario">
              Avance de mesas
            </Text>
            <Text className="font-body text-sm text-texto-secundario">
                  Cada mesa requiere 2 actas (Alcaldía y Prefectura). El
                  avance se calcula sobre el total de actas esperadas.
                </Text>
              </View>
    
              {recintosVisibles.map((a, index) => {
                const totalActasRecinto = a.totalMesas * 2;
                const pctRecinto =
                  totalActasRecinto > 0
                    ? Math.min(100, Math.round((a.actasReportadas /
                    totalActasRecinto) * 100))
                    : 0;
                const ancho = `${Math.max(0, Math.min(100, pctRecinto))}%` as
                const;
                return (
                  <View
                    key={a.recintoId}
                    className={`gap-2.5 rounded-2xl border p-4 ${
                      index % 2 === 1
                        ? 'border-beige-borde bg-vainilla'
                        : 'border-borde-lavanda bg-white'
                    }`}
                    style={{ borderCurve: 'continuous' }}
                  >
                    <View className="flex-row items-start justify-between
                    gap-3">
                      <Text
                        className="min-w-0 flex-1 font-body-bold text-base
                        text-texto"
                        selectable
                      >
                        {a.nombre} · {a.parroquia}
                      </Text>
                      <Text
                        className="shrink-0 font-display text-2xl
                        text-primario"
                        style={{ fontVariant: ['tabular-nums'] }}
                      >
                        {pctRecinto}%
                      </Text>
                    </View>
    
                    <View className="h-2.5 w-full overflow-hidden
                    rounded-full bg-gris-claro">
                      <View
                        className="h-full rounded-full bg-primario"
                        style={{ width: ancho }}
                      />
                    </View>
    
                    <Text
                      className="font-body-semibold text-sm text-texto"
                      style={{ fontVariant: ['tabular-nums'] }}
                      selectable
                    >
                      {a.actasReportadas} de {totalActasRecinto} actas
                      enviadas · {a.actasFaltantes} faltantes
                    </Text>
                    <Text
                      className="font-body text-xs text-texto-secundario"
                      style={{ fontVariant: ['tabular-nums'] }}
                      selectable
                    >
                      {a.mesasReportadas} de {a.totalMesas} mesas con
                      reportes · {a.mesasFaltantes} sin reportes
                    </Text>

                {a.alertas > 0 ? (
                  <View className="flex-row items-center gap-2 rounded-xl bg-crema px-3 py-2">
                    <View className="h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primario">
                      <Text className="font-body-bold text-xs text-amarillo">!</Text>
                    </View>
                    <Text className="flex-1 font-body-bold text-xs text-texto" selectable>
                      ! {a.alertas} actas con alerta GPS
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          })}

          {/* Conteo tabular detallado */}
          {(['ALCALDE', 'PREFECTO'] as Dignidad[]).map((dignidad) => (
            <View
              key={dignidad}
              className="gap-2 rounded-2xl border border-borde-lavanda bg-white p-4"
              style={{ borderCurve: 'continuous' }}
            >
              <Text className="font-display text-2xl uppercase tracking-wide text-primario">
                {dignidad === 'ALCALDE' ? 'Alcaldía' : 'Prefectura'}
              </Text>
              {resultados
                .filter((r) => r.dignidad === dignidad)
                .map((r, idx) => (
                  <View
                    key={r.candidatoId}
                    className={`flex-row items-center justify-between gap-3 rounded-xl px-3 py-2.5 ${
                      idx % 2 === 1 ? 'bg-vainilla' : 'bg-white'
                    }`}
                  >
                    <Text
                      className="min-w-0 flex-1 font-body-semibold text-sm text-texto"
                      selectable
                    >
                      {r.candidato} · {r.organizacion} ({r.lista})
                    </Text>
                    <Text
                      className="shrink-0 font-display text-2xl text-primario"
                      style={{ fontVariant: ['tabular-nums'] }}
                      selectable
                    >
                      {r.votos.toLocaleString()}
                    </Text>
                  </View>
                ))}
              {resultados.every((r) => r.dignidad !== dignidad) ? (
                <Text className="font-body text-sm text-texto-secundario">
                  Sin resultados disponibles.
                </Text>
              ) : null}
            </View>
          ))}

          {/* Actas para auditoría */}
          <Text className="pt-2 font-display text-3xl uppercase tracking-wide text-primario">
            Actas para auditoría
          </Text>
          {actas.length === 0 ? (
            <View className="rounded-2xl border border-borde-lavanda bg-white p-5">
              <Text className="font-body text-sm text-texto-secundario">
                No hay actas enviadas en esta selección.
              </Text>
            </View>
          ) : null}

          {actas.map((a, index) => (
            <Pressable
              key={a.id}
              accessibilityRole="button"
              onPress={() =>
                router.push({ pathname: '/(provincial)/auditoria', params: { actaId: a.id } })
              }
              className={`min-h-14 flex-row items-center justify-between gap-3 rounded-2xl border p-4 ${
                a.alerta
                  ? 'border-primario bg-crema'
                  : index % 2 === 1
                    ? 'border-beige-borde bg-vainilla'
                    : 'border-borde-lavanda bg-white'
              }`}
              style={{ borderCurve: 'continuous' }}
            >
              <Text
                className="min-w-0 flex-1 font-body-semibold text-sm text-texto"
                selectable
              >
                {avances.find((r) => r.recintoId === a.recintoId)?.nombre} · Mesa {a.mesa} {a.genero} · {a.dignidad}
              </Text>
              {a.alerta ? (
                <Text className="shrink-0 overflow-hidden rounded-full bg-primario px-3 py-1 font-body-bold text-amarillo">
                  !
                </Text>
              ) : null}
            </Pressable>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

function Filtro({ texto, activo, onPress }: { texto: string; activo: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
      onPress={onPress}
      className={`min-h-12 justify-center rounded-xl border px-4 ${
        activo
          ? 'border-primario bg-primario'
          : 'border-borde-lavanda bg-white'
      }`}
    >
      <Text className={activo ? 'font-body-bold text-amarillo' : 'font-body-semibold text-texto'}>
        {texto}
      </Text>
    </Pressable>
  );
}
