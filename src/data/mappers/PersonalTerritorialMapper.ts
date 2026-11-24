import type { PersonalTerritorial } from '@/domain/entities/PersonalTerritorial';
import type { PersonalTerritorialDTO } from '@/domain/dtos/PersonalTerritorialDTO';

export class PersonalTerritorialMapper {
  static toDomain(dto: PersonalTerritorialDTO): PersonalTerritorial {
    return {
      id: dto.id,
      nombresCompletos: dto.nombres_completos,
      cedula: dto.cedula,
      email: dto.email,
      telefono: dto.telefono,
      rol: dto.rol,
      recintoId: dto.recinto_id,
      provinciaId: dto.provincia_id,
      activo: dto.activo,
      creadoEn: dto.created_at,
      actualizadoEn: dto.updated_at,
    };
  }

  static toDomainArray(dtos: PersonalTerritorialDTO[]): PersonalTerritorial[] {
    return dtos.map((dto) => this.toDomain(dto));
  }

  static toDTO(domain: PersonalTerritorial): PersonalTerritorialDTO {
    return {
      id: domain.id,
      nombres_completos: domain.nombresCompletos,
      cedula: domain.cedula,
      email: domain.email,
      telefono: domain.telefono,
      rol: domain.rol,
      recinto_id: domain.recintoId,
      provincia_id: domain.provinciaId,
      activo: domain.activo,
      created_at: domain.creadoEn,
      updated_at: domain.actualizadoEn,
    };
  }
}
