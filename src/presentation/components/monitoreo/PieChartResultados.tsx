import { View, Text } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

export interface ResultadoVoto {
  id: string;
  nombre: string;
  organizacion: string;
  votos: number;
  color: string;
}

interface PieChartResultadosProps {
  datos: ResultadoVoto[];
  titulo?: string;
  mostrarLeyenda?: boolean;
}

interface CalloutItem {
  id: string;
  nombreCorto: string;
  porcentaje: string;
  votos: number;
  color: string;
  lineColor: string;
  esLider: boolean;
  side: 'left' | 'right';
  rimX: number;
  rimY: number;
  elbowX: number;
  rawY: number;
  labelY: number;
}

const STAGE_W = 304;
const STAGE_H = 264;
const CENTER_STAGE_X = STAGE_W / 2; // 152
const CENTER_STAGE_Y = STAGE_H / 2; // 132
const SVG_SIZE = 152;
const VISUAL_RADIUS = (80 / 240) * SVG_SIZE; // ~50.67px
const BADGE_W = 84;
const BADGE_H = 38;
const MIN_VERTICAL_GAP = 42;

function acortarNombre(nombre: string): string {
  const limpio = nombre.trim();
  if (limpio === 'Votos blancos') return 'Blancos';
  if (limpio === 'Votos nulos') return 'Nulos';
  const partes = limpio.split(/\s+/);
  if (partes.length >= 2 && partes[0].length <= 10) {
    return `${partes[0]} ${partes[1][0]}.`;
  }
  return limpio.length > 11 ? `${limpio.slice(0, 10)}…` : limpio;
}

function colorLineaSeguro(color: string): string {
  // Evita líneas amarillo claro poco legibles sobre fondo malva pálido
  if (color.toUpperCase() === '#EAE84B') return '#8E8B14';
  return color;
}

function formatearCorto(valor: number): string {
  if (valor >= 1_000_000) return `${(valor / 1_000_000).toFixed(1)}M`;
  if (valor >= 10_000) return `${(valor / 1_000).toFixed(1)}k`;
  return valor.toLocaleString();
}

function distribuirVerticalmente(items: CalloutItem[]): CalloutItem[] {
  if (items.length === 0) return [];
  const ordenados = [...items].sort((a, b) => a.rawY - b.rawY);
  const minY = BADGE_H / 2 + 4;
  const maxY = STAGE_H - BADGE_H / 2 - 4;
  const gap =
    ordenados.length > 1
      ? Math.min(MIN_VERTICAL_GAP, (maxY - minY) / (ordenados.length - 1))
      : MIN_VERTICAL_GAP;

  const resultado = ordenados.map((item) => ({
    ...item,
    labelY: Math.max(minY, Math.min(maxY, item.rawY)),
  }));

  // Empuje descendente para evitar solapes
  for (let i = 1; i < resultado.length; i += 1) {
    if (resultado[i].labelY - resultado[i - 1].labelY < gap) {
      resultado[i].labelY = resultado[i - 1].labelY + gap;
    }
  }

  // Ajuste ascendente si el último sobrepasa el límite inferior
  const ultimo = resultado[resultado.length - 1];
  if (ultimo.labelY > maxY) {
    ultimo.labelY = maxY;
    for (let i = resultado.length - 2; i >= 0; i -= 1) {
      if (resultado[i + 1].labelY - resultado[i].labelY < gap) {
        resultado[i].labelY = Math.max(minY, resultado[i + 1].labelY - gap);
      }
    }
  }

  return resultado;
}

function SegmentoLinea({
  x1,
  y1,
  x2,
  y2,
  color,
  grosor,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  grosor: number;
}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  if (length < 0.5) return null;
  const angle = Math.atan2(dy, dx);
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: mx - length / 2,
        top: my - grosor / 2,
        width: length,
        height: grosor,
        backgroundColor: color,
        borderRadius: grosor,
        transform: [{ rotate: `${angle}rad` }],
      }}
    />
  );
}

export function PieChartResultados({
  datos,
  titulo = 'Resultados',
  mostrarLeyenda = true,
}: PieChartResultadosProps) {
  const totalVotos = datos.reduce((sum, d) => sum + d.votos, 0);

  if (totalVotos === 0) {
    return (
      <View
        className="gap-3 rounded-2xl border border-borde-lavanda bg-white p-5"
        style={{ borderCurve: 'continuous' }}
      >
        <View className="flex-row items-center justify-between gap-2">
          <Text className="font-display text-2xl uppercase tracking-wide text-primario">
            {titulo}
          </Text>
          <View className="rounded-full bg-crema px-3 py-1">
            <Text className="font-body-bold text-xs text-texto">0 votos</Text>
          </View>
        </View>
        <Text className="font-body text-sm text-texto-secundario">
          Sin votos registrados en esta selección.
        </Text>
      </View>
    );
  }

  const RADIUS = 80;
  const CENTER_X = 120;
  const CENTER_Y = 120;

  let currentAngle = -90;
  const slices: { data: ResultadoVoto; startAngle: number; endAngle: number }[] = [];

  datos
    .filter((d) => d.votos > 0)
    .forEach((d) => {
      const angle = (d.votos / totalVotos) * 360;
      const endAngle = currentAngle + angle;
      slices.push({ data: d, startAngle: currentAngle, endAngle });
      currentAngle = endAngle;
    });

  const candidatosValidos = datos.filter(
    (d) => d.id !== 'votos-blancos' && d.id !== 'votos-nulos',
  );
  const maxVotosCandidato = candidatosValidos.reduce(
    (max, item) => (item.votos > max ? item.votos : max),
    0,
  );
  const lider =
    maxVotosCandidato > 0
      ? candidatosValidos.find((item) => item.votos === maxVotosCandidato) ?? null
      : null;
  const liderId = lider?.id ?? null;
  const liderPorcentaje = lider ? ((lider.votos / totalVotos) * 100).toFixed(1) : null;

  const polarToCartesian = (
    centerX: number,
    centerY: number,
    radius: number,
    angleInDegrees: number,
  ): { x: number; y: number } => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  const createArcPath = (
    startAngle: number,
    endAngle: number,
    radius: number,
    centerX: number,
    centerY: number,
  ): string => {
    const start = polarToCartesian(centerX, centerY, radius, endAngle);
    const end = polarToCartesian(centerX, centerY, radius, startAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return `M ${centerX} ${centerY} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
  };

  // Calcula etiquetas con líneas guía y flechas desde el punto medio real de cada sector
  const calloutsCrudos: CalloutItem[] = slices.map((slice) => {
    const midAngle = (slice.startAngle + slice.endAngle) / 2;
    const rim = polarToCartesian(CENTER_STAGE_X, CENTER_STAGE_Y, VISUAL_RADIUS - 2, midAngle);
    const outer = polarToCartesian(CENTER_STAGE_X, CENTER_STAGE_Y, VISUAL_RADIUS + 14, midAngle);
    const side: 'left' | 'right' = outer.x >= CENTER_STAGE_X ? 'right' : 'left';
    const esLider = slice.data.id === liderId;

    return {
      id: slice.data.id,
      nombreCorto: acortarNombre(slice.data.nombre),
      porcentaje: ((slice.data.votos / totalVotos) * 100).toFixed(1),
      votos: slice.data.votos,
      color: slice.data.color,
      lineColor: esLider ? '#6F2C91' : colorLineaSeguro(slice.data.color),
      esLider,
      side,
      rimX: rim.x,
      rimY: rim.y,
      elbowX: side === 'right' ? Math.max(outer.x, CENTER_STAGE_X + VISUAL_RADIUS + 9) : Math.min(outer.x, CENTER_STAGE_X - VISUAL_RADIUS - 9),
      rawY: outer.y,
      labelY: outer.y,
    };
  });

  const calloutsIzquierda = distribuirVerticalmente(
    calloutsCrudos.filter((item) => item.side === 'left'),
  );
  const calloutsDerecha = distribuirVerticalmente(
    calloutsCrudos.filter((item) => item.side === 'right'),
  );
  const callouts = [...calloutsIzquierda, ...calloutsDerecha];

  return (
    <View
      className="gap-4 overflow-hidden rounded-2xl border border-borde-lavanda bg-white"
      style={{ borderCurve: 'continuous' }}
    >
      {/* Encabezado de tarjeta en Morado Principal */}
      <View className="flex-row items-center justify-between gap-3 bg-primario px-5 py-3.5">
        <View className="min-w-0 flex-1">
          <Text
            className="font-display text-2xl uppercase tracking-wider text-white"
            numberOfLines={1}
          >
            {titulo}
          </Text>
        </View>
        <View className="shrink-0 rounded-full bg-primario-oscuro px-3 py-1">
          <Text
            className="font-display text-lg tracking-wide text-amarillo"
            style={{ fontVariant: ['tabular-nums'] }}
            selectable
          >
            {totalVotos.toLocaleString()} VOTOS
          </Text>
        </View>
      </View>

      <View className="gap-4 px-3 pb-5">
        {/* Escenario Exit Poll: gráfico dona + líneas guía + flechas + etiquetas de porcentaje */}
        <View
          className="items-center rounded-2xl border border-borde-lavanda bg-malva py-3"
          style={{ borderCurve: 'continuous' }}
        >
          <View style={{ width: STAGE_W, height: STAGE_H, position: 'relative' }}>
            {/* Halo decorativo suave alrededor del pastel */}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: CENTER_STAGE_X - VISUAL_RADIUS - 6,
                top: CENTER_STAGE_Y - VISUAL_RADIUS - 6,
                width: (VISUAL_RADIUS + 6) * 2,
                height: (VISUAL_RADIUS + 6) * 2,
                borderRadius: 9999,
                backgroundColor: '#E4D4EC',
                borderWidth: 1.5,
                borderColor: '#FFFFFF',
              }}
            />

            {/* Gráfico pastel SVG con separadores blancos nítidos */}
            <View
              style={{
                position: 'absolute',
                left: CENTER_STAGE_X - SVG_SIZE / 2,
                top: CENTER_STAGE_Y - SVG_SIZE / 2,
                width: SVG_SIZE,
                height: SVG_SIZE,
              }}
            >
              <Svg width="100%" height="100%" viewBox="0 0 240 240" accessible={false}>
                {slices.map((slice) =>
                  slice.data.votos === totalVotos ? (
                    <Circle
                      key={slice.data.id}
                      cx={CENTER_X}
                      cy={CENTER_Y}
                      r={RADIUS}
                      fill={slice.data.color}
                      stroke="#FFFFFF"
                      strokeWidth={3}
                    />
                  ) : (
                    <Path
                      key={slice.data.id}
                      d={createArcPath(
                        slice.startAngle,
                        slice.endAngle,
                        RADIUS,
                        CENTER_X,
                        CENTER_Y,
                      )}
                      fill={slice.data.color}
                      stroke="#FFFFFF"
                      strokeWidth={3}
                      strokeLinejoin="round"
                    />
                  ),
                )}
              </Svg>
            </View>

            {/* Medallón central tipo Dona con el porcentaje líder o total */}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: CENTER_STAGE_X - 31,
                top: CENTER_STAGE_Y - 31,
                width: 62,
                height: 62,
                borderRadius: 9999,
                backgroundColor: '#FFFFFF',
                borderWidth: 2.5,
                borderColor: '#6F2C91',
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 3,
              }}
            >
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: 'Montserrat_700Bold',
                  fontSize: 7.5,
                  letterSpacing: 0.6,
                  color: '#6F2C91',
                  textTransform: 'uppercase',
                }}
              >
                {lider ? 'LÍDER' : 'TOTAL'}
              </Text>
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: 'BebasNeue_400Regular',
                  fontSize: 19,
                  lineHeight: 20,
                  color: '#6F2C91',
                  fontVariant: ['tabular-nums'],
                }}
              >
                {liderPorcentaje ? `${liderPorcentaje}%` : formatearCorto(totalVotos)}
              </Text>
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: 'Montserrat_600SemiBold',
                  fontSize: 8,
                  color: '#52465B',
                  fontVariant: ['tabular-nums'],
                }}
              >
                {lider ? `${formatearCorto(lider.votos)} v.` : 'votos'}
              </Text>
            </View>

            {/* Líneas guía con flecha direccional y tarjetas de valor por sector */}
            {callouts.map((item) => {
              const isRight = item.side === 'right';
              const badgeEdgeX = isRight ? STAGE_W - BADGE_W - 5 : BADGE_W + 5;
              const elbowX = isRight
                ? Math.min(item.elbowX, badgeEdgeX - 8)
                : Math.max(item.elbowX, badgeEdgeX + 8);
              const grosor = item.esLider ? 2.2 : 1.6;

              return (
                <View
                  key={`callout-${item.id}`}
                  pointerEvents="none"
                  style={{ position: 'absolute', inset: 0 }}
                >
                  {/* Segmento 1: radio/diagonal desde el borde del sector */}
                  <SegmentoLinea
                    x1={item.rimX}
                    y1={item.rimY}
                    x2={elbowX}
                    y2={item.labelY}
                    color={item.lineColor}
                    grosor={grosor}
                  />

                  {/* Segmento 2: línea horizontal hacia la etiqueta */}
                  <SegmentoLinea
                    x1={elbowX}
                    y1={item.labelY}
                    x2={badgeEdgeX}
                    y2={item.labelY}
                    color={item.lineColor}
                    grosor={grosor}
                  />

                  {/* Punto de anclaje sobre el sector del pastel */}
                  <View
                    style={{
                      position: 'absolute',
                      left: item.rimX - 4,
                      top: item.rimY - 4,
                      width: 8,
                      height: 8,
                      borderRadius: 9999,
                      backgroundColor: item.esLider ? '#EAE84B' : item.color,
                      borderWidth: 1.5,
                      borderColor: item.esLider ? '#6F2C91' : '#FFFFFF',
                    }}
                  />

                  {/* Punta de flecha apuntando a la tarjeta de valor */}
                  <View
                    style={
                      isRight
                        ? {
                            position: 'absolute',
                            left: badgeEdgeX - 1,
                            top: item.labelY - 4,
                            width: 0,
                            height: 0,
                            borderTopWidth: 4,
                            borderBottomWidth: 4,
                            borderLeftWidth: 6,
                            borderTopColor: 'transparent',
                            borderBottomColor: 'transparent',
                            borderLeftColor: item.lineColor,
                          }
                        : {
                            position: 'absolute',
                            left: badgeEdgeX - 5,
                            top: item.labelY - 4,
                            width: 0,
                            height: 0,
                            borderTopWidth: 4,
                            borderBottomWidth: 4,
                            borderRightWidth: 6,
                            borderTopColor: 'transparent',
                            borderBottomColor: 'transparent',
                            borderRightColor: item.lineColor,
                          }
                    }
                  />

                  {/* Tarjeta compacta de valor (porcentaje + nombre corto) */}
                  <View
                    style={{
                      position: 'absolute',
                      left: isRight ? STAGE_W - BADGE_W : 0,
                      top: item.labelY - BADGE_H / 2,
                      width: BADGE_W,
                      minHeight: BADGE_H,
                      borderRadius: 10,
                      borderCurve: 'continuous',
                      backgroundColor: item.esLider ? '#6F2C91' : '#FFFFFF',
                      borderWidth: item.esLider ? 1.5 : 1,
                      borderColor: item.esLider ? '#531F6E' : item.lineColor,
                      paddingHorizontal: 6,
                      paddingVertical: 4,
                      justifyContent: 'center',
                    }}
                  >
                    <View className="flex-row items-center justify-between gap-1">
                      <View
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 9999,
                          backgroundColor: item.esLider ? '#EAE84B' : item.color,
                          borderWidth: item.color.toUpperCase() === '#EAE84B' ? 0.8 : 0,
                          borderColor: '#6F2C91',
                          flexShrink: 0,
                        }}
                      />
                      <Text
                        numberOfLines={1}
                        style={{
                          flex: 1,
                          textAlign: 'right',
                          fontFamily: 'BebasNeue_400Regular',
                          fontSize: 17,
                          lineHeight: 18,
                          letterSpacing: 0.4,
                          color: item.esLider ? '#EAE84B' : '#6F2C91',
                          fontVariant: ['tabular-nums'],
                        }}
                      >
                        {`${item.porcentaje}%`}
                      </Text>
                    </View>
                    <Text
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      style={{
                        fontFamily: 'Montserrat_600SemiBold',
                        fontSize: 9.5,
                        lineHeight: 12,
                        color: item.esLider ? '#FFFFFF' : '#222222',
                      }}
                    >
                      {item.nombreCorto}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Barras horizontales de alto contraste para lectura detallada Exit Poll */}
        {mostrarLeyenda ? (
          <View className="gap-3 px-2">
            {datos.map((d, index) => {
              const porcentajeNum = (d.votos / totalVotos) * 100;
              const porcentaje = porcentajeNum.toFixed(1);
              const esLider = d.id === liderId;
              const anchoBarra = `${Math.max(0, Math.min(100, porcentajeNum))}%` as const;
              const bgRow = esLider
                ? 'border-primario bg-lavanda'
                : index % 2 === 1
                  ? 'border-beige-borde bg-vainilla'
                  : 'border-borde bg-white';

              return (
                <View
                  key={d.id}
                  className={`gap-2 rounded-xl border p-3.5 ${bgRow}`}
                  style={{ borderCurve: 'continuous' }}
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="min-w-0 flex-1 flex-row items-start gap-2.5">
                      <View
                        className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor: d.color,
                          borderWidth: d.color.toUpperCase() === '#EAE84B' ? 1 : 0,
                          borderColor: '#6F2C91',
                        }}
                      />
                      <View className="min-w-0 flex-1 gap-0.5">
                        <View className="flex-row flex-wrap items-center gap-2">
                          <Text
                            className="font-body-bold text-sm text-texto"
                            selectable
                          >
                            {d.nombre}
                          </Text>
                          {esLider ? (
                            <View className="shrink-0 rounded-full bg-primario px-2.5 py-0.5">
                              <Text className="font-body-bold text-[10px] uppercase tracking-wider text-amarillo">
                                Líder
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        {d.organizacion ? (
                          <Text
                            className="font-body text-xs text-texto-secundario"
                            selectable
                          >
                            {d.organizacion}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    <View className="shrink-0 items-end">
                      <Text
                        className="font-display text-3xl leading-8 text-primario"
                        style={{ fontVariant: ['tabular-nums'] }}
                        selectable
                      >
                        {porcentaje}%
                      </Text>
                      <Text
                        className="font-body-semibold text-xs text-texto"
                        style={{ fontVariant: ['tabular-nums'] }}
                        selectable
                      >
                        {d.votos.toLocaleString()} votos
                      </Text>
                    </View>
                  </View>

                  {/* Barra de progreso horizontal */}
                  <View className="h-3 w-full overflow-hidden rounded-full bg-gris-claro">
                    <View
                      className="h-full rounded-full"
                      style={{
                        width: anchoBarra,
                        backgroundColor: esLider ? '#6F2C91' : colorLineaSeguro(d.color),
                      }}
                    />
                  </View>
                </View>
              );
            })}

            <View className="flex-row items-center justify-between rounded-xl bg-crema px-4 py-2.5">
              <Text
                className="font-body-semibold text-xs uppercase tracking-wide text-texto"
                selectable
              >
                Total contabilizado
              </Text>
              <Text
                className="font-body-bold text-sm text-primario"
                style={{ fontVariant: ['tabular-nums'] }}
                selectable
              >
                Total: {totalVotos.toLocaleString()} votos
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}
