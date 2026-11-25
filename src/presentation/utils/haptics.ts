import * as Haptics from 'expo-haptics';

/**
 * Envoltorio seguro sobre expo-haptics.
 * Degrada silenciosamente en entornos sin soporte háptico (emuladores, Web o builds previos).
 */
export function hapticSelection(): void {
  try {
    void Haptics.selectionAsync().catch(() => {});
  } catch {
    // Sin soporte háptico en este entorno
  }
}

export function hapticLight(): void {
  try {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  } catch {
    // Sin soporte háptico en este entorno
  }
}

export function hapticMedium(): void {
  try {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  } catch {
    // Sin soporte háptico en este entorno
  }
}

export function hapticSuccess(): void {
  try {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  } catch {
    // Sin soporte háptico en este entorno
  }
}

export function hapticError(): void {
  try {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  } catch {
    // Sin soporte háptico en este entorno
  }
}
