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

  datos.filter((d) => d.votos > 0).forEach((d) => {
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
  const liderId =
    maxVotosCandidato > 0
      ? candidatosValidos.find((item) => item.votos === maxVotosCandidato)?.id ?? null
      : null;

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

      <View className="gap-4 px-5 pb-5">
        {/* Gráfico circular de distribución */}
        <View className="items-center rounded-2xl bg-malva py-3">
          <View className="w-full" style={{ maxWidth: 196, aspectRatio: 1 }}>
            <Svg width="100%" height="100%" viewBox="0 0 240 240" accessible={false}>
              {slices.map((slice) =>
                slice.data.votos === totalVotos ? (
                  <Circle
                    key={slice.data.id}
                    cx={CENTER_X}
                    cy={CENTER_Y}
                    r={RADIUS}
                    fill={slice.data.color}
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
                  />
                ),
              )}
            </Svg>
          </View>
        </View>

        {/* Barras horizontales de alto contraste para lectura rápida Exit Poll */}
        {mostrarLeyenda ? (
          <View className="gap-3">
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
                        style={{ backgroundColor: esLider ? '#6F2C91' : d.color }}
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
                        backgroundColor: esLider ? '#6F2C91' : d.color,
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
