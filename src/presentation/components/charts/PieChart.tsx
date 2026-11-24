import { useMemo } from 'react';
import { View, Text } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';

interface DataPoint {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: DataPoint[];
  size?: number;
  outerRadius?: number;
  showLegend?: boolean;
}

export function PieChart({
  data,
  size = 200,
  outerRadius = 100,
  showLegend = true,
}: PieChartProps) {
  const radius = size / 2;

  const slices = useMemo(() => {
    const totalValue = data.reduce((sum, item) => sum + item.value, 0);

    return data.reduce(
      (acc, item) => {
        const { slices: prevSlices, angle: prevAngle } = acc;
        const sliceAngle = (item.value / totalValue) * 2 * Math.PI;
        const startAngle = prevAngle;
        const endAngle = prevAngle + sliceAngle;

        const x1 = radius + outerRadius * Math.cos(startAngle);
        const y1 = radius + outerRadius * Math.sin(startAngle);
        const x2 = radius + outerRadius * Math.cos(endAngle);
        const y2 = radius + outerRadius * Math.sin(endAngle);

        const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;

        const pathData = `M ${radius} ${radius} L ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

        return {
          slices: [
            ...prevSlices,
            {
              path: pathData,
              label: item.label,
              value: item.value,
              color: item.color,
              percentage: ((item.value / totalValue) * 100).toFixed(1),
            },
          ],
          angle: endAngle,
        };
      },
      { slices: [] as {
        path: string;
        label: string;
        value: number;
        color: string;
        percentage: string;
      }[], angle: -Math.PI / 2 }
    ).slices;
  }, [data, radius, outerRadius]);

  return (
    <View className="items-center gap-4">
      <Svg height={size} width={size} viewBox={`0 0 ${size} ${size}`}>
        <G>
          {slices.map((slice, index) => (
            <Path
              key={index}
              d={slice.path}
              fill={slice.color}
              stroke="white"
              strokeWidth="2"
            />
          ))}
        </G>
      </Svg>

      {showLegend && (
        <View className="w-full gap-2">
          {slices.map((slice, index) => (
            <View key={index} className="flex-row items-center gap-2">
              <View
                className="h-4 w-4 rounded"
                style={{ backgroundColor: slice.color }}
              />
              <Text className="flex-1 text-sm text-texto">
                {slice.label}: {slice.percentage}%
              </Text>
              <Text className="text-sm font-semibold text-slate-600">{slice.value}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
