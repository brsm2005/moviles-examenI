import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, fontFamilies, radius, shadows } from '@theme/tokens';
import { InstitutionalHeader } from '@/presentation/components/ui/InstitutionalHeader';

const logoRedondo = require('../../../../assets/images/logo-redondo.jpg');

interface AuthShellProps {
  eyebrow?: string;
  title: string;
  description: string;
  children: ReactNode;
}

export function AuthShell({
  eyebrow = 'CONTROL ELECTORAL',
  title,
  description,
  children,
}: AuthShellProps) {
  return (
    <View className="flex-1" style={{ backgroundColor: colors.malvaPalido }}>
      <InstitutionalHeader />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          style={{ backgroundColor: colors.malvaPalido }}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
        >
          {/* Cabecera institucional Morado Principal con geometría SVG en Malva Pálido */}
          <View
            style={{
              backgroundColor: colors.moradoPrincipal,
              paddingHorizontal: 24,
              paddingTop: 22,
              paddingBottom: 56,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <Svg
              pointerEvents="none"
              width="100%"
              height="100%"
              viewBox="0 0 400 220"
              preserveAspectRatio="none"
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            >
              <Circle cx="365" cy="24" r="96" fill={colors.moradoOscuro} opacity={0.55} />
              <Circle cx="32" cy="180" r="68" fill={colors.moradoBorde} opacity={0.22} />
              <Path
                d="M 0 182 Q 115 148 215 178 T 400 166 L 400 220 L 0 220 Z"
                fill={colors.malvaPalido}
              />
            </Svg>

            <View className="w-full max-w-xl self-center gap-4">
              <View className="flex-row items-center gap-4">
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: radius.full,
                    overflow: 'hidden',
                    borderWidth: 2.5,
                    borderColor: colors.amarilloPrincipal,
                    backgroundColor: colors.moradoOscuro,
                    flexShrink: 0,
                  }}
                >
                  <Image
                    source={logoRedondo}
                    contentFit="cover"
                    accessibilityLabel="Emblema institucional"
                    style={{ width: '100%', height: '100%' }}
                  />
                </View>

                <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
                  <View
                    style={{
                      alignSelf: 'flex-start',
                      backgroundColor: colors.moradoOscuro,
                      borderRadius: radius.full,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                    }}
                  >
                    <Text
                      numberOfLines={1}
                      style={{
                        fontFamily: fontFamilies.bodyBold,
                        fontSize: 11,
                        letterSpacing: 1.1,
                        color: colors.amarilloPrincipal,
                        textTransform: 'uppercase',
                      }}
                      selectable
                    >
                      {eyebrow}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontFamily: fontFamilies.display,
                      fontSize: 34,
                      lineHeight: 36,
                      letterSpacing: 0.8,
                      color: colors.blancoPuro,
                      textTransform: 'uppercase',
                    }}
                    selectable
                  >
                    {title}
                  </Text>
                </View>
              </View>

              <Text
                style={{
                  fontFamily: fontFamilies.bodyMedium,
                  fontSize: 14,
                  lineHeight: 20,
                  color: colors.malvaPalido,
                }}
                selectable
              >
                {description}
              </Text>
            </View>
          </View>

          {/* Tarjeta de formulario blanco puro */}
          <View className="w-full max-w-xl self-center px-5" style={{ marginTop: -26 }}>
            <View
              style={{
                backgroundColor: colors.blancoPuro,
                borderRadius: radius.xl,
                borderCurve: 'continuous',
                borderWidth: 1,
                borderColor: colors.bordeLavanda,
                padding: 20,
                gap: 18,
                boxShadow: shadows.raised,
              }}
            >
              {children}
            </View>

            <Text
              style={{
                marginTop: 18,
                textAlign: 'center',
                fontFamily: fontFamilies.bodyMedium,
                fontSize: 12,
                lineHeight: 18,
                color: colors.textoSecundario,
              }}
              selectable
            >
              Acceso institucional protegido · Control Electoral y Exit Poll
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
