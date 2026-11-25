import { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { colors, motion, radius } from '@theme/tokens';

interface AnimatedProgressBarProps {
  /** Porcentaje entre 0 y 100 */
  percentage: number;
  fillColor?: string;
  trackColor?: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

export function AnimatedProgressBar({
  percentage,
  fillColor = colors.moradoPrincipal,
  trackColor = colors.grisClaro,
  height = 12,
  style,
}: AnimatedProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(percentage) ? percentage : 0));
  const progress = useSharedValue(clamped);

  useEffect(() => {
    progress.set(
      withSpring(clamped, {
        ...motion.barSpring,
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [clamped, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.get()}%`,
  }));

  return (
    <View
      style={[
        {
          height,
          width: '100%',
          backgroundColor: trackColor,
          borderRadius: radius.full,
          overflow: 'hidden',
          position: 'relative',
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            backgroundColor: fillColor,
            borderRadius: radius.full,
          },
          fillStyle,
        ]}
      />
    </View>
  );
}
