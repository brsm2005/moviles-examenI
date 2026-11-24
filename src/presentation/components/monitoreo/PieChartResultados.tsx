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
        <Text className="text-sm text-slate-600">Sin datos disponibles</Text>
      </View>
    );
  }

  const RADIUS = 80;
  const CENTER_X = 120;
  const CENTER_Y = 120;

  let currentAngle = -90;
  const slices: { data: ResultadoVoto; startAngle: number; endAngle: number }[] = [];

  datos.forEach((d) => {
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
        <Svg width={240} height={240}>
          {slices.map((slice, idx) => (
            <Path
              key={idx}
              d={createArcPath(
                slice.startAngle,
                slice.endAngle,
                RADIUS,
                CENTER_X,
                CENTER_Y,
              )}
              fill={slice.data.color}
            />
          ))}
          {/* Inner circle for donut effect */}
          <Circle
            cx={CENTER_X}
            cy={CENTER_Y}
            r={RADIUS * 0.6}
            fill="white"
          />
        </Svg>
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
                    <Text className="font-semibold text-texto">{d.nombre}</Text>
                    <Text className="text-xs text-slate-600">{d.organizacion}</Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text className="font-bold text-texto">{d.votos.toLocaleString()}</Text>
                  <Text className="text-xs text-slate-600">{porcentaje}%</Text>
                </View>
              </View>
            );
          })}
          <View className="border-t border-slate-200 pt-2">
            <Text className="text-sm font-semibold text-slate-700">
              Total: {totalVotos.toLocaleString()} votos
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
