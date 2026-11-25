import { Text, View } from 'react-native';
import type { RolPerfil } from '@/domain/entities/Perfil';
import { colors, fontFamilies, radius } from '@theme/tokens';

const ROLE_LABELS: Record<RolPerfil, { short: string; full: string }> = {
  COORDINADOR_PROVINCIAL: { short: 'PROVINCIAL', full: 'Coordinador Provincial' },
  COORDINADOR_RECINTO: { short: 'RECINTO', full: 'Coordinador de Recinto' },
  VEEDOR: { short: 'VEEDOR', full: 'Veedor Electoral' },
};

interface RoleBadgeProps {
  role: RolPerfil;
  compact?: boolean;
}

export function RoleBadge({ role, compact = false }: RoleBadgeProps) {
  const meta = ROLE_LABELS[role];
  return (
    <View
      style={{
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.moradoPrincipal,
        borderRadius: radius.full,
        paddingHorizontal: compact ? 10 : 12,
        paddingVertical: compact ? 5 : 6,
      }}
    >
      <View
        style={{
          width: 7,
          height: 7,
          borderRadius: radius.full,
          backgroundColor: colors.amarilloPrincipal,
          flexShrink: 0,
        }}
      />
      <Text
        numberOfLines={1}
        style={{
          color: colors.amarilloPrincipal,
          fontFamily: fontFamilies.bodyBold,
          fontSize: compact ? 11 : 12,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
        }}
        selectable
      >
        {compact ? meta.short : meta.full}
      </Text>
    </View>
  );
}
