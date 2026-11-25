import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors, fontFamilies, radius } from '@theme/tokens';
import type { DetalleActaAuditada, IMonitoreoProvincial } from '@/domain/ports/IMonitoreoProvincial';
import { AnimatedButton } from '@/presentation/components/ui/AnimatedButton';
import { volverSeguro } from '@/presentation/navigation/volverSeguro';

function mapaHtml(latitud: number, longitud: number): string {
  if (
    !Number.isFinite(latitud) ||
    !Number.isFinite(longitud) ||
    Math.abs(latitud) > 90 ||
    Math.abs(longitud) > 180
  ) {
    throw new Error('Las coordenadas del acta no son válidas.');
  }
  return `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>html,body,#map{height:100%;margin:0} #aviso{position:absolute;z-index:1000;top:8px;left:8px;background:#F4EFE2;color:#222222;padding:8px 12px;border-radius:8px;font:600 13px sans-serif}</style>
</head><body><div id="map"></div><div id="aviso">Cargando mapa. Se necesita conexión a internet.</div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
if (typeof L !== 'undefined') {
  var map = L.map('map').setView([${latitud}, ${longitud}], 16);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  L.circleMarker([${latitud}, ${longitud}], {radius: 10, color: '#6F2C91', weight: 3, fillColor: '#EAE84B', fillOpacity: 0.95}).addTo(map);
  document.getElementById('aviso').remove();
}
</script></body></html>`;
}

export function AuditoriaActaScreen({ monitoreo }: { monitoreo: IMonitoreoProvincial }) {
  const { actaId } = useLocalSearchParams<{ actaId?: string }>();
  const [resultado, setResultado] = useState<{
    actaId: string | undefined;
    intento: number;
    detalle: DetalleActaAuditada | null;
    error: string | null;
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
    void consulta
      .then((acta) => {
        mapaHtml(acta.latitud, acta.longitud);
        if (activo) setResultado({ actaId, intento, detalle: acta, error: null });
      })
      .catch((fallo: unknown) => {
        if (activo) {
          setResultado({
            actaId,
            intento,
            detalle: null,
            error:
              fallo instanceof Error
                ? fallo.message
                : 'No se pudo consultar el acta. Compruebe su conexión.',
          });
        }
      });
    return () => {
      activo = false;
    };
  }, [actaId, intento, monitoreo]);

  return (
    <ScrollView
      className="flex-1 bg-malva"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="gap-5 px-5 pb-12 pt-5"
    >
      <Pressable
        accessibilityRole="button"
        onPress={() => volverSeguro('/(provincial)/monitoreo')}
        className="min-h-12 self-start justify-center rounded-xl border border-borde-lavanda bg-white px-4"
      >
        <Text className="font-body-bold text-sm text-primario">← Volver al Exit Poll</Text>
      </Pressable>

      <Text
        style={{
          fontFamily: fontFamilies.display,
          fontSize: 34,
          letterSpacing: 0.8,
          color: colors.moradoPrincipal,
          textTransform: 'uppercase',
        }}
        selectable
      >
        Auditoría de acta
      </Text>

      {cargando ? (
        <View className="items-center gap-3 rounded-2xl bg-white p-8">
          <ActivityIndicator size="large" color={colors.moradoPrincipal} />
          <Text className="font-body text-sm text-texto-secundario">
            Cargando evidencia y geolocalización…
          </Text>
        </View>
      ) : null}

      {error ? (
        <View className="gap-3 rounded-2xl border border-red-300 bg-red-50 p-4">
          <Text className="font-body text-sm text-red-800" selectable>
            {error}
          </Text>
          <AnimatedButton title="Reintentar" variant="danger" compact onPress={reintentar} />
        </View>
      ) : null}

      {!cargando && detalle ? (
        <>
          <View
            style={{
              backgroundColor: colors.moradoPrincipal,
              borderRadius: radius.lg,
              padding: 16,
              gap: 4,
            }}
          >
            <Text
              style={{
                fontFamily: fontFamilies.display,
                fontSize: 26,
                letterSpacing: 0.7,
                color: colors.amarilloPrincipal,
                textTransform: 'uppercase',
              }}
              selectable
            >
              Mesa {detalle.mesa} {detalle.genero}
            </Text>
            <Text
              style={{
                fontFamily: fontFamilies.bodySemiBold,
                fontSize: 14,
                color: colors.blancoPuro,
              }}
              selectable
            >
              Dignidad: {detalle.dignidad}
            </Text>
          </View>

          {detalle.alerta ? (
            <View
              accessibilityLabel="Alerta de ubicación"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                borderRadius: radius.lg,
                borderWidth: 1.5,
                borderColor: colors.moradoPrincipal,
                backgroundColor: colors.cremaLimon,
                padding: 14,
              }}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: radius.full,
                  backgroundColor: colors.moradoPrincipal,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Text
                  style={{
                    fontFamily: fontFamilies.display,
                    fontSize: 22,
                    color: colors.amarilloPrincipal,
                  }}
                >
                  !
                </Text>
              </View>
              <Text
                style={{
                  flex: 1,
                  fontFamily: fontFamilies.bodyBold,
                  fontSize: 14,
                  color: colors.grisCarbon,
                }}
                selectable
              >
                Alerta de ubicación ·{' '}
                {detalle.distancia !== null
                  ? `${detalle.distancia.toLocaleString()} m del centroide`
                  : 'Distancia no disponible'}
              </Text>
            </View>
          ) : (
            <View
              style={{
                backgroundColor: colors.lavandaSuave,
                borderRadius: radius.md,
                padding: 12,
              }}
            >
              <Text className="font-body-semibold text-sm text-primario">
                Sin alerta de ubicación · Coordenadas dentro del perímetro.
              </Text>
            </View>
          )}

          <View className="gap-3 rounded-2xl border border-borde-lavanda bg-white p-4">
            <Text
              style={{
                fontFamily: fontFamilies.display,
                fontSize: 24,
                letterSpacing: 0.6,
                color: colors.moradoPrincipal,
                textTransform: 'uppercase',
              }}
            >
              Fotografía original
            </Text>
            {fotoError ? (
              <View className="gap-3 rounded-xl bg-red-50 p-4">
                <Text className="font-body text-sm text-red-800">
                  No se pudo cargar la fotografía.
                </Text>
                <AnimatedButton title="Reintentar" variant="danger" compact onPress={reintentar} />
              </View>
            ) : (
              <Image
                source={{ uri: detalle.fotoUrl }}
                contentFit="contain"
                accessibilityLabel="Fotografía original del acta"
                onError={() => setFotoError(true)}
                style={{
                  width: '100%',
                  height: 360,
                  backgroundColor: colors.grisClaro,
                  borderRadius: radius.md,
                }}
              />
            )}
          </View>

          <View className="gap-2 rounded-2xl border border-borde-lavanda bg-white p-4">
            <Text
              style={{
                fontFamily: fontFamilies.display,
                fontSize: 24,
                letterSpacing: 0.6,
                color: colors.moradoPrincipal,
                textTransform: 'uppercase',
              }}
            >
              Ubicación de captura
            </Text>
            <Text
              className="font-body-semibold text-xs text-texto-secundario"
              style={{ fontVariant: ['tabular-nums'] }}
              selectable
            >
              {detalle.latitud}, {detalle.longitud}
            </Text>
            <View
              className="mt-1 overflow-hidden rounded-xl border border-borde-lavanda"
              style={{ height: 320 }}
            >
              <WebView
                source={{ html: mapaHtml(detalle.latitud, detalle.longitud) }}
                originWhitelist={['*']}
                onShouldStartLoadWithRequest={(request) => request.url === 'about:blank'}
                accessibilityLabel="Mapa de la ubicación de captura"
              />
            </View>
            <Text className="font-body text-xs text-texto-secundario">
              El mapa y sus mosaicos requieren conexión a internet. © OpenStreetMap contributors.
            </Text>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}
