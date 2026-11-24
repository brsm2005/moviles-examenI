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
      <View className="gap-2 rounded-2xl border border-slate-200 bg-white p-6">
        <Text className="text-lg font-bold text-texto">{titulo}</Text>
        <Text className="text-sm text-slate-600">Sin votos registrados en esta selección.</Text>
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
    <View className="gap-4 rounded-2xl border border-slate-200 bg-white p-6">
      <Text className="text-lg font-bold text-texto">{titulo}</Text>

      <View className="items-center">
        <View className="w-full" style={{ maxWidth: 208, aspectRatio: 1 }}>
          <Svg width="100%" height="100%" viewBox="0 0 240 240" accessible={false}>
            {slices.map((slice) =>
              slice.data.votos === totalVotos ? (
                <Circle key={slice.data.id} cx={CENTER_X} cy={CENTER_Y} r={RADIUS} fill={slice.data.color} />
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

      {mostrarLeyenda ? (
        <View className="gap-2">
          {datos.map((d) => {
            const porcentaje = ((d.votos / totalVotos) * 100).toFixed(1);
            return (
              <View
                key={d.id}
                className="flex-row items-center justify-between gap-3"
              >
                <View className="flex-row flex-1 items-center gap-3">
                  <View
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: d.color }}
                  />
                  <View className="flex-1">
                    <Text className="font-semibold text-texto" selectable>{d.nombre}</Text>
                    {d.organizacion ? <Text className="text-xs text-slate-600" selectable>{d.organizacion}</Text> : null}
                  </View>
                </View>
                <View className="items-end">
                  <Text className="font-bold text-texto" selectable>{d.votos.toLocaleString()}</Text>
                  <Text className="text-xs text-slate-600" selectable>{porcentaje}%</Text>
                </View>
              </View>
            );
          })}
          <View className="border-t border-slate-200 pt-2">
            <Text className="text-sm font-semibold text-slate-700" selectable>
              Total: {totalVotos.toLocaleString()} votos
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
