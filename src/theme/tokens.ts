import type { TextStyle } from 'react-native';

/**
 * Tokens oficiales de identidad visual para Control Electoral y Exit Poll (ADN 7).
 *
 * Reglas de contraste estricto:
 * - Sobre Morado (#6F2C91): usar únicamente Blanco (#FFFFFF) o Amarillo (#EAE84B).
 * - Sobre Lavanda (#E4D4EC), Malva (#F3EAF8), Crema Limón (#FAF9C8), Vainilla (#FCFCE6)
 *   o Blanco (#FFFFFF): usar Morado (#6F2C91) o Gris Carbón (#222222).
 * - PROHIBIDO colocar texto Amarillo (#EAE84B) sobre fondos blancos o pastel claros.
 */
export const colors = {
  // Principales (Oficiales)
  moradoPrincipal: '#6F2C91',
  moradoOscuro: '#531F6E',
  moradoProfundo: '#3D1552',
  moradoBorde: '#8B46B0',
  amarilloPrincipal: '#EAE84B',
  amarilloOscuro: '#C9C626',

  // Paleta Pastel (Superficies y Tarjetas)
  lavandaSuave: '#E4D4EC',
  malvaPalido: '#F3EAF8',
  cremaLimon: '#FAF9C8',
  vainillaClaro: '#FCFCE6',

  // Cabecera institucional
  beigeCabecera: '#F4EFE2',
  beigeBorde: '#E2D8C3',

  // Neutros (Legibilidad y Soporte)
  blancoPuro: '#FFFFFF',
  grisCarbon: '#222222',
  grisClaro: '#F4F4F6',
  textoSecundario: '#52465B',
  bordeLavanda: '#D4BFE0',
  bordeNeutro: '#E2DFE6',

  // Semánticos de campo (alto contraste ≥ 4.5:1)
  exito: '#15803D',
  exitoFondo: '#E8F7EE',
  exitoBorde: '#86EFAC',
  error: '#B91C1C',
  errorFondo: '#FEF2F2',
  errorBorde: '#FCA5A5',
  advertenciaTexto: '#5B3A00',
  advertenciaBorde: '#D8CC54',
} as const;

/**
 * Pares de contraste verificados para evitar combinaciones ilegibles.
 */
export const surfacePairs = {
  morado: {
    background: colors.moradoPrincipal,
    text: colors.blancoPuro,
    accent: colors.amarilloPrincipal,
  },
  lavanda: {
    background: colors.lavandaSuave,
    text: colors.grisCarbon,
    heading: colors.moradoPrincipal,
    border: colors.bordeLavanda,
  },
  malva: {
    background: colors.malvaPalido,
    text: colors.grisCarbon,
    heading: colors.moradoPrincipal,
  },
  crema: {
    background: colors.cremaLimon,
    text: colors.grisCarbon,
    heading: colors.moradoPrincipal,
    border: colors.advertenciaBorde,
  },
  vainilla: {
    background: colors.vainillaClaro,
    text: colors.grisCarbon,
    heading: colors.moradoPrincipal,
    border: colors.beigeBorde,
  },
  blanco: {
    background: colors.blancoPuro,
    text: colors.grisCarbon,
    heading: colors.moradoPrincipal,
    border: colors.bordeNeutro,
  },
  beigeCabecera: {
    background: colors.beigeCabecera,
    text: colors.moradoPrincipal,
    border: colors.beigeBorde,
  },
} as const;

export const fontFamilies = {
  display: 'BebasNeue_400Regular',
  bodyRegular: 'Montserrat_400Regular',
  bodyMedium: 'Montserrat_500Medium',
  bodySemiBold: 'Montserrat_600SemiBold',
  bodyBold: 'Montserrat_700Bold',
} as const;

export const typography = {
  displayHero: {
    fontFamily: fontFamilies.display,
    fontSize: 40,
    lineHeight: 42,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.moradoPrincipal,
  },
  displayTitle: {
    fontFamily: fontFamilies.display,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.moradoPrincipal,
  },
  displaySection: {
    fontFamily: fontFamilies.display,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.moradoPrincipal,
  },
  displayMetric: {
    fontFamily: fontFamilies.display,
    fontSize: 36,
    lineHeight: 38,
    letterSpacing: 0.6,
    fontVariant: ['tabular-nums'],
    color: colors.moradoPrincipal,
  },
  displayPercent: {
    fontFamily: fontFamilies.display,
    fontSize: 32,
    lineHeight: 34,
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
    color: colors.moradoPrincipal,
  },
  subtitle: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.grisCarbon,
  },
  body: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 15,
    lineHeight: 22,
    color: colors.grisCarbon,
  },
  bodyRegular: {
    fontFamily: fontFamilies.bodyRegular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textoSecundario,
  },
  label: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.grisCarbon,
  },
  caption: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textoSecundario,
  },
  buttonPrimary: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.3,
  },
  numericInput: {
    fontFamily: fontFamilies.display,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: 0.8,
    fontVariant: ['tabular-nums'],
    color: colors.grisCarbon,
  },
} as const satisfies Record<string, TextStyle>;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

export const touchTarget = {
  minHeight: 48,
  minWidth: 48,
  hitSlop: { top: 6, bottom: 6, left: 6, right: 6 },
} as const;

export const shadows = {
  card: '0 2px 8px rgba(111, 44, 145, 0.08)',
  raised: '0 6px 16px rgba(111, 44, 145, 0.14)',
  header: '0 2px 6px rgba(34, 34, 34, 0.06)',
} as const;

export const motion = {
  pressDuration: 120,
  transitionDuration: 220,
  barSpring: {
    duration: 420,
    dampingRatio: 0.9,
  },
  pressSpring: {
    duration: 240,
    dampingRatio: 0.85,
  },
  easeOutBezier: [0.23, 1, 0.32, 1] as const,
} as const;

/**
 * Paleta de alto contraste para resultados del Exit Poll y gráficos.
 * El líder y los datos primarios priorizan Morado Principal (#6F2C91) y tonos derivados/contrastados.
 */
export const exitPollPalette = [
  '#6F2C91', // Morado Principal (líder / primario)
  '#9A4EC4', // Morado medio
  '#2E7D6B', // Verde esmeralda institucional
  '#C2591A', // Terracota cálido
  '#2F5D9F', // Azul pizarra
  '#A6345C', // Magenta oscuro
  '#5A6B2C', // Oliva oscuro
  '#4F467A', // Índigo apagado
] as const;

export const tokens = {
  colors,
  surfacePairs,
  fontFamilies,
  typography,
  spacing,
  radius,
  touchTarget,
  shadows,
  motion,
  exitPollPalette,
} as const;

export type Tokens = typeof tokens;
