import type { Href } from 'expo-router';
import type { RolPerfil } from '@/domain/entities/Perfil';

const roleRoutes: Record<RolPerfil, Href> = {
  COORDINADOR_PROVINCIAL: '/(provincial)/provincial',
  COORDINADOR_RECINTO: '/(recinto)/recinto',
  VEEDOR: '/(veedor)/veedor',
};

export function routeForRole(role: RolPerfil): Href {
  return roleRoutes[role];
}
