import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors, fontFamilies, motion, radius, touchTarget } from '@theme/tokens';
import { hapticLight, hapticMedium, hapticSelection } from '@/presentation/utils/haptics';

const EASE_OUT = Easing.bezier(...motion.easeOutBezier);

export type ButtonVariant =
  | 'primary'
  | 'primaryAccent'
  | 'yellowAction'
  | 'lavender'
  | 'outline'
  | 'neutral'
  | 'danger';

const VARIANT_STYLES: Record<
  ButtonVariant,
  { backgroundColor: string; borderColor: string; textColor: string; borderWidth: number }
> = {
  primary: {
    backgroundColor: colors.moradoPrincipal,
    borderColor: colors.moradoPrincipal,
    textColor: colors.blancoPuro,
    borderWidth: 1,
  },
  primaryAccent: {
    backgroundColor: colors.moradoPrincipal,
    borderColor: colors.moradoOscuro,
    textColor: colors.amarilloPrincipal,
    borderWidth: 1.5,
  },
  yellowAction: {
    backgroundColor: colors.amarilloPrincipal,
    borderColor: colors.amarilloOscuro,
    textColor: colors.moradoPrincipal,
    borderWidth: 1.5,
  },
  lavender: {
    backgroundColor: colors.lavandaSuave,
    borderColor: colors.bordeLavanda,
    textColor: colors.moradoPrincipal,
    borderWidth: 1,
  },
  outline: {
    backgroundColor: colors.blancoPuro,
    borderColor: colors.moradoPrincipal,
    textColor: colors.moradoPrincipal,
    borderWidth: 1.5,
  },
  neutral: {
    backgroundColor: colors.blancoPuro,
    borderColor: colors.bordeNeutro,
    textColor: colors.grisCarbon,
    borderWidth: 1,
  },
  danger: {
    backgroundColor: colors.errorFondo,
    borderColor: colors.errorBorde,
    textColor: colors.error,
    borderWidth: 1,
  },
};

export interface AnimatedButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  title?: string;
  variant?: ButtonVariant;
  loading?: boolean;
  haptic?: 'none' | 'selection' | 'light' | 'medium';
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

export function AnimatedButton({
  title,
  variant = 'primary',
  loading = false,
  disabled = false,
  haptic = 'light',
  compact = false,
  style,
  onPress,
  onPressIn,
  onPressOut,
  children,
  ...rest
}: AnimatedButtonProps) {
  const scale = useSharedValue(1);
  const isDisabled = Boolean(disabled || loading);
  const palette = VARIANT_STYLES[variant];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  const handlePressIn: PressableProps['onPressIn'] = (event) => {
    if (!isDisabled) {
      scale.set(
        withTiming(0.97, {
          duration: motion.pressDuration,
          easing: EASE_OUT,
          reduceMotion: ReduceMotion.System,
        }),
      );
    }
    onPressIn?.(event);
  };

  const handlePressOut: PressableProps['onPressOut'] = (event) => {
    scale.set(
      withSpring(1, {
        ...motion.pressSpring,
        reduceMotion: ReduceMotion.System,
      }),
    );
    onPressOut?.(event);
  };

  const handlePress: PressableProps['onPress'] = (event) => {
    if (!isDisabled) {
      if (haptic === 'selection') hapticSelection();
      else if (haptic === 'light') hapticLight();
      else if (haptic === 'medium') hapticMedium();
    }
    onPress?.(event);
  };

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        hitSlop={touchTarget.hitSlop}
        pressRetentionOffset={{ top: 12, bottom: 12, left: 12, right: 12 }}
        disabled={isDisabled}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        style={{
          minHeight: touchTarget.minHeight,
          minWidth: touchTarget.minWidth,
          paddingHorizontal: compact ? 14 : 18,
          paddingVertical: compact ? 10 : 13,
          borderRadius: radius.md,
          borderCurve: 'continuous',
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
          borderWidth: palette.borderWidth,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          opacity: isDisabled ? 0.52 : 1,
        }}
        {...rest}
      >
        {loading ? (
          <ActivityIndicator color={palette.textColor} />
        ) : children ? (
          children
        ) : (
          <Text
            style={{
              color: palette.textColor,
              fontFamily: fontFamilies.bodyBold,
              fontSize: compact ? 14 : 15,
              textAlign: 'center',
            }}
            numberOfLines={2}
            selectable
          >
            {title}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}
