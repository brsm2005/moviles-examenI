import { useMemo } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, G, Path, Polygon, Polyline } from 'react-native-svg';
import { colors, fontFamilies } from '@theme/tokens';

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

interface SliceGeometry {
  path: string;
  label: string;
  shortLabel: string;
  value: number;
  color: string;
  lineColor: string;
  percentage: string;
  isLeader: boolean;
  side: 'left' | 'right';
  rimX: number;
  rimY: number;
  elbowX: number;
  rawY: number;
  labelY: number;
  isFullCircle: boolean;
}

function safeLineColor(hex: string): string {
  return hex.toUpperCase() === colors.amarilloPrincipal ? '#8E8B14' : hex;
}

function shortText(label: string): string {
  const clean = label.trim();
  return clean.length > 10 ? `${clean.slice(0, 9)}…` : clean;
}

export function PieChart({
  data,
  size = 160,
  outerRadius = 64,
  showLegend = true,
}: PieChartProps) {
  const stageW = 304;
  const stageH = Math.max(240, size + 84);
  const cx = stageW / 2;
  const cy = stageH / 2;
  const badgeW = 82;
  const badgeH = 36;

  const { slices, totalValue, leader } = useMemo(() => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total <= 0) {
      return { slices: [] as SliceGeometry[], totalValue: 0, leader: null as DataPoint | null };
    }

    const active = data.filter((item) => item.value > 0);
    const topValue = active.reduce((max, item) => Math.max(max, item.value), 0);
    const topItem = active.find((item) => item.value === topValue) ?? null;

    let currentAngle = -Math.PI / 2;
    const raw: SliceGeometry[] = active.map((item) => {
      const sliceAngle = (item.value / total) * 2 * Math.PI;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;
      const midAngle = (startAngle + endAngle) / 2;
      currentAngle = endAngle;

      const x1 = cx + outerRadius * Math.cos(startAngle);
      const y1 = cy + outerRadius * Math.sin(startAngle);
      const x2 = cx + outerRadius * Math.cos(endAngle);
      const y2 = cy + outerRadius * Math.sin(endAngle);
      const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;
      const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

      const rimX = cx + (outerRadius - 2) * Math.cos(midAngle);
      const rimY = cy + (outerRadius - 2) * Math.sin(midAngle);
      const outX = cx + (outerRadius + 16) * Math.cos(midAngle);
      const outY = cy + (outerRadius + 16) * Math.sin(midAngle);
      const side: 'left' | 'right' = outX >= cx ? 'right' : 'left';
      const isLeader = topItem !== null && item.label === topItem.label && item.value === topItem.value;

      return {
        path: pathData,
        label: item.label,
        shortLabel: shortText(item.label),
        value: item.value,
        color: item.color,
        lineColor: isLeader ? colors.moradoPrincipal : safeLineColor(item.color),
        percentage: ((item.value / total) * 100).toFixed(1),
        isLeader,
        side,
        rimX,
        rimY,
        elbowX: side === 'right' ? Math.max(outX, cx + outerRadius + 10) : Math.min(outX, cx - outerRadius - 10),
        rawY: outY,
        labelY: outY,
        isFullCircle: item.value === total,
      };
    });

    const spread = (list: SliceGeometry[]) => {
      if (list.length === 0) return list;
      const sorted = [...list].sort((a, b) => a.rawY - b.rawY);
      const minY = badgeH / 2 + 4;
      const maxY = stageH - badgeH / 2 - 4;
      const gap = sorted.length > 1 ? Math.min(40, (maxY - minY) / (sorted.length - 1)) : 40;
      const placed = sorted.map((s) => ({ ...s, labelY: Math.max(minY, Math.min(maxY, s.rawY)) }));
      for (let i = 1; i < placed.length; i += 1) {
        if (placed[i].labelY - placed[i - 1].labelY < gap) {
          placed[i].labelY = placed[i - 1].labelY + gap;
        }
      }
      const last = placed[placed.length - 1];
      if (last.labelY > maxY) {
        last.labelY = maxY;
        for (let i = placed.length - 2; i >= 0; i -= 1) {
          if (placed[i + 1].labelY - placed[i].labelY < gap) {
            placed[i].labelY = Math.max(minY, placed[i + 1].labelY - gap);
          }
        }
      }
      return placed;
    };

    return {
      slices: [
        ...spread(raw.filter((s) => s.side === 'left')),
        ...spread(raw.filter((s) => s.side === 'right')),
      ],
      totalValue: total,
      leader: topItem,
    };
  }, [data, cx, cy, outerRadius, stageH]);

  if (totalValue === 0) {
    return (
      <View className="items-center rounded-2xl border border-borde-lavanda bg-white p-5">
        <Text className="font-body text-sm text-texto-secundario">Sin datos registrados.</Text>
      </View>
    );
  }

  return (
    <View className="items-center gap-4">
      <View
        style={{
          width: stageW,
          height: stageH,
          position: 'relative',
          backgroundColor: colors.malvaPalido,
          borderRadius: 16,
        }}
      >
        <Svg width={stageW} height={stageH} viewBox={`0 0 ${stageW} ${stageH}`}>
          <Circle cx={cx} cy={cy} r={outerRadius + 5} fill={colors.lavandaSuave} stroke="#FFFFFF" strokeWidth={1.5} />
          <G>
            {slices.map((slice) =>
              slice.isFullCircle ? (
                <Circle
                  key={slice.label}
                  cx={cx}
                  cy={cy}
                  r={outerRadius}
                  fill={slice.color}
                  stroke="#FFFFFF"
                  strokeWidth={3}
                />
              ) : (
                <Path
                  key={slice.label}
                  d={slice.path}
                  fill={slice.color}
                  stroke="#FFFFFF"
                  strokeWidth={3}
                  strokeLinejoin="round"
                />
              ),
            )}
          </G>
          {/* Centro dona */}
          <Circle
            cx={cx}
            cy={cy}
            r={outerRadius * 0.54}
            fill="#FFFFFF"
            stroke={colors.moradoPrincipal}
            strokeWidth={2.5}
          />
          {/* Líneas guía y flechas SVG vectoriales */}
          {slices.map((slice) => {
            const isRight = slice.side === 'right';
            const tipX = isRight ? stageW - badgeW - 3 : badgeW + 3;
            const elbowX = isRight ? Math.min(slice.elbowX, tipX - 8) : Math.max(slice.elbowX, tipX + 8);
            const arrowPoints = isRight
              ? `${tipX},${slice.labelY} ${tipX - 6},${slice.labelY - 4} ${tipX - 6},${slice.labelY + 4}`
              : `${tipX},${slice.labelY} ${tipX + 6},${slice.labelY - 4} ${tipX + 6},${slice.labelY + 4}`;

            return (
              <G key={`guide-${slice.label}`}>
                <Polyline
                  points={`${slice.rimX},${slice.rimY} ${elbowX},${slice.labelY} ${tipX},${slice.labelY}`}
                  fill="none"
                  stroke={slice.lineColor}
                  strokeWidth={slice.isLeader ? 2.2 : 1.6}
                  strokeLinejoin="round"
                />
                <Circle
                  cx={slice.rimX}
                  cy={slice.rimY}
                  r={4}
                  fill={slice.isLeader ? colors.amarilloPrincipal : slice.color}
                  stroke={slice.isLeader ? colors.moradoPrincipal : '#FFFFFF'}
                  strokeWidth={1.5}
                />
                <Polygon points={arrowPoints} fill={slice.lineColor} />
              </G>
            );
          })}
        </Svg>

        {/* Texto del medallón central */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: cx - outerRadius * 0.5,
            top: cy - outerRadius * 0.5,
            width: outerRadius,
            height: outerRadius,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              fontFamily: fontFamilies.bodyBold,
              fontSize: 8,
              color: colors.moradoPrincipal,
              letterSpacing: 0.6,
            }}
          >
            LÍDER
          </Text>
          <Text
            style={{
              fontFamily: fontFamilies.display,
              fontSize: 20,
              lineHeight: 22,
              color: colors.moradoPrincipal,
              fontVariant: ['tabular-nums'],
            }}
          >
            {leader ? `${((leader.value / totalValue) * 100).toFixed(1)}%` : '0%'}
          </Text>
        </View>

        {/* Tarjetas externas de valor */}
        {slices.map((slice) => {
          const isRight = slice.side === 'right';
          return (
            <View
              key={`badge-${slice.label}`}
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: isRight ? stageW - badgeW : 0,
                top: slice.labelY - badgeH / 2,
                width: badgeW,
                minHeight: badgeH,
                borderRadius: 10,
                backgroundColor: slice.isLeader ? colors.moradoPrincipal : '#FFFFFF',
                borderWidth: slice.isLeader ? 1.5 : 1,
                borderColor: slice.isLeader ? colors.moradoOscuro : slice.lineColor,
                paddingHorizontal: 6,
                paddingVertical: 3,
                justifyContent: 'center',
              }}
            >
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: fontFamilies.display,
                  fontSize: 17,
                  lineHeight: 18,
                  color: slice.isLeader ? colors.amarilloPrincipal : colors.moradoPrincipal,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {`${slice.percentage}%`}
              </Text>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{
                  fontFamily: fontFamilies.bodySemiBold,
                  fontSize: 9.5,
                  color: slice.isLeader ? '#FFFFFF' : colors.grisCarbon,
                }}
              >
                {slice.shortLabel}
              </Text>
            </View>
          );
        })}
      </View>

      {showLegend && (
        <View className="w-full gap-2">
          {slices.map((slice, index) => (
            <View
              key={slice.label}
              className={`flex-row items-center gap-2.5 rounded-xl px-3 py-2 ${
                index % 2 === 1 ? 'bg-vainilla' : 'bg-white'
              }`}
            >
              <View
                className="h-3.5 w-3.5 shrink-0 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              <Text className="min-w-0 flex-1 font-body-semibold text-sm text-texto">
                {slice.label}
              </Text>
              <Text
                className="shrink-0 font-display text-xl text-primario"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {slice.percentage}%
              </Text>
              <Text
                className="shrink-0 font-body-semibold text-xs text-texto-secundario"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                ({slice.value.toLocaleString()})
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
