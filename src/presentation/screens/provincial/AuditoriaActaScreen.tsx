import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { DetalleActaAuditada, IMonitoreoProvincial } from '@/domain/ports/IMonitoreoProvincial';
import { volverSeguro } from '@/presentation/navigation/volverSeguro';

function mapaHtml(latitud: number, longitud: number): string {
  if (!Number.isFinite(latitud) || !Number.isFinite(longitud) ||
      Math.abs(latitud) > 90 || Math.abs(longitud) > 180) {
    throw new Error('Las coordenadas del acta no son válidas.');
  }
  return `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>html,body,#map{height:100%;margin:0} #aviso{position:absolute;z-index:1000;top:8px;left:8px;background:white;padding:8px;font:14px sans-serif}</style>
</head><body><div id="map"></div><div id="aviso">Cargando mapa. Se necesita conexión a internet.</div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
if (typeof L !== 'undefined') {
  var map = L.map('map').setView([${latitud}, ${longitud}], 16);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  L.circleMarker([${latitud}, ${longitud}], {radius: 8, color: '#1B365D', fillOpacity: 0.9}).addTo(map);
  document.getElementById('aviso').remove();
}
</script></body></html>`;
}

export function AuditoriaActaScreen({ monitoreo }: { monitoreo: IMonitoreoProvincial }) {
  const { actaId } = useLocalSearchParams<{ actaId?: string }>();
  const [resultado, setResultado] = useState<{
    actaId: string | undefined; intento: number;
    detalle: DetalleActaAuditada | null; error: string | null;
  } | null>(null);
  const [fotoError, setFotoError] = useState(false);
  const [intento, setIntento] = useState(0);

  const reintentar = useCallback(() => {
    setFotoError(false);
    setIntento((actual) => actual + 1);
  }, []);
  const actual = resultado?.actaId === actaId && resultado?.intento === intento ? resultado : null;
  const cargando = !actual;
  const detalle = actual?.detalle ?? null;
  const error = actual?.error ?? null;

  useEffect(() => {
    let activo = true;
    const consulta = !actaId || Array.isArray(actaId)
      ? Promise.reject(new Error('No se indicó un acta válida.'))
      : monitoreo.obtenerDetalle(actaId);
    void consulta.then((acta) => {
      mapaHtml(acta.latitud, acta.longitud);
      if (activo) setResultado({ actaId, intento, detalle: acta, error: null });
    }).catch((fallo: unknown) => {
      if (activo) {
        setResultado({
          actaId, intento, detalle: null,
          error: fallo instanceof Error ? fallo.message : 'No se pudo consultar el acta. Compruebe su conexión.',
        });
      }
    });
    return () => { activo = false; };
  }, [actaId, intento, monitoreo]);

  return (
    <ScrollView className="flex-1 bg-fondo" contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="gap-5 px-5 pb-12 pt-6">
      <Pressable accessibilityRole="button" onPress={() => volverSeguro('/(provincial)/monitoreo')} className="min-h-11 justify-center">
        <Text className="font-bold text-primario">Volver</Text>
      </Pressable>
      <Text className="text-3xl font-bold text-texto" selectable>Auditoría de acta</Text>
      {cargando ? <ActivityIndicator size="large" color="#1B365D" /> : null}
      {error ? (
        <View className="gap-2 rounded-xl border border-red-200 bg-red-50 p-4">
          <Text className="text-red-800" selectable>{error}</Text>
          <Pressable accessibilityRole="button" onPress={reintentar}><Text className="font-bold text-red-900">Reintentar</Text></Pressable>
        </View>
      ) : null}
      {!cargando && detalle ? (
        <>
          <Text className="text-base font-bold text-texto" selectable>
            Mesa {detalle.mesa} {detalle.genero} · {detalle.dignidad}
          </Text>
          {detalle.alerta ? (
            <View accessibilityLabel="Alerta de ubicación" className="flex-row items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <Text className="overflow-hidden rounded-full bg-red-700 px-3 py-1 text-lg font-bold text-white">!</Text>
              <Text className="flex-1 font-bold text-red-800" selectable>
                Alerta de ubicación · {detalle.distancia !== null ? `${detalle.distancia.toLocaleString()} m del centroide` : 'Distancia no disponible'}
              </Text>
            </View>
          ) : <Text className="text-slate-600">Sin alerta de ubicación.</Text>}
          <Text className="text-xl font-bold text-texto">Fotografía original</Text>
          {fotoError ? (
            <View className="gap-2 rounded-xl bg-red-50 p-4">
              <Text className="text-red-800">No se pudo cargar la fotografía.</Text>
              <Pressable accessibilityRole="button" onPress={reintentar}><Text className="font-bold text-red-900">Reintentar</Text></Pressable>
            </View>
          ) : (
            <Image source={{ uri: detalle.fotoUrl }} contentFit="contain"
              accessibilityLabel="Fotografía original del acta" onError={() => setFotoError(true)}
              style={{ width: '100%', height: 360, backgroundColor: '#e2e8f0', borderRadius: 12 }} />
          )}
          <Text className="text-xl font-bold text-texto">Ubicación de captura</Text>
          <Text className="text-sm text-slate-600" selectable>{detalle.latitud}, {detalle.longitud}</Text>
          <View className="overflow-hidden rounded-xl border border-slate-200" style={{ height: 320 }}>
            <WebView source={{ html: mapaHtml(detalle.latitud, detalle.longitud) }} originWhitelist={['*']}
              onShouldStartLoadWithRequest={(request) => request.url === 'about:blank'}
              accessibilityLabel="Mapa de la ubicación de captura" />
          </View>
          <Text className="text-xs text-slate-600">El mapa y sus mosaicos requieren conexión a internet. © OpenStreetMap contributors.</Text>
        </>
      ) : null}
    </ScrollView>
  );
}
