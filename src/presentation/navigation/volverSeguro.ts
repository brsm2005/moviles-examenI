import { router, type Href } from 'expo-router';

export function volverSeguro(destino: Href): void {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(destino);
  }
}
