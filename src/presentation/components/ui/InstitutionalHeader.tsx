import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RolPerfil } from '@/domain/entities/Perfil';
import { colors, fontFamilies, radius, shadows, touchTarget } from '@theme/tokens';
import { RoleBadge } from './RoleBadge';

const logoSinFondo = require('../../../../assets/images/logo-sin-fondo.png');

interface InstitutionalHeaderProps {
  role?: RolPerfil | null;
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  offline?: boolean;
}

export function InstitutionalHeader({
  role,
  title,
  showBack = false,
  onBack,
  offline = false,
}: InstitutionalHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        backgroundColor: colors.beigeCabecera,
        paddingTop: Math.max(insets.top, 10),
        borderBottomWidth: 1,
        borderBottomColor: colors.beigeBorde,
        boxShadow: shadows.header,
      }}
    >
      <View
        style={{
          minHeight: 58,
          paddingHorizontal: 14,
          paddingVertical: 8,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          {showBack && onBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Volver"
              onPress={onBack}
              hitSlop={touchTarget.hitSlop}
              style={({ pressed }) => ({
                minWidth: touchTarget.minWidth,
                minHeight: touchTarget.minHeight,
                borderRadius: radius.md,
                borderCurve: 'continuous',
                backgroundColor: pressed ? colors.lavandaSuave : colors.blancoPuro,
                borderWidth: 1,
                borderColor: colors.beigeBorde,
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              })}
            >
              <SymbolView
                name={{
                  ios: 'chevron.left',
                  android: 'arrow_back',
                  web: 'arrow_back',
                }}
                size={20}
                tintColor={colors.moradoPrincipal}
              />
            </Pressable>
          ) : null}

          <Image
            source={logoSinFondo}
            contentFit="contain"
            accessibilityLabel="Acción Democrática Nacional Lista 7"
            style={{
              width: 118,
              height: 40,
              flexShrink: 0,
            }}
          />

          {title ? (
            <View
              style={{
                flex: 1,
                minWidth: 0,
                borderLeftWidth: 1,
                borderLeftColor: colors.beigeBorde,
                paddingLeft: 10,
              }}
            >
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{
                  fontFamily: fontFamilies.display,
                  fontSize: 20,
                  lineHeight: 22,
                  letterSpacing: 0.6,
                  color: colors.moradoPrincipal,
                  textTransform: 'uppercase',
                }}
              >
                {title}
              </Text>
            </View>
          ) : null}
        </View>

        {role ? <RoleBadge role={role} compact /> : null}
      </View>

      {offline ? (
        <View
          style={{
            backgroundColor: colors.cremaLimon,
            borderTopWidth: 1,
            borderTopColor: colors.advertenciaBorde,
            paddingHorizontal: 16,
            paddingVertical: 6,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: radius.full,
              backgroundColor: colors.moradoPrincipal,
              flexShrink: 0,
            }}
          />
          <Text
            style={{
              flex: 1,
              fontFamily: fontFamilies.bodySemiBold,
              fontSize: 12,
              color: colors.grisCarbon,
            }}
          >
            Sin conexión · Los registros se guardan localmente para sincronizar
          </Text>
        </View>
      ) : null}
    </View>
  );
}
