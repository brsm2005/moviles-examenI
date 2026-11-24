import type {
  ActualizarPersonalDTO,
  CrearPersonalDTO,
  IPersonalTerritorialRepository,
  IPersonalTerritorialDataSource,
} from '@/domain/ports/IPersonalTerritorialRepository';
import type { PersonalTerritorial } from '@/domain/entities/PersonalTerritorial';
import { PersonalTerritorialMapper } from '@/data/mappers/PersonalTerritorialMapper';

export class PersonalTerritorialRepository implements IPersonalTerritorialRepository {
  constructor(private dataSource: IPersonalTerritorialDataSource) {}

  async obtenerSubordinados(): Promise<PersonalTerritorial[]> {
    try {
      const dtos = await this.dataSource.obtenerSubordinados();
      return PersonalTerritorialMapper.toDomainArray(dtos);
    } catch (error) {
      throw new Error(
        `No se pudieron obtener los subordinados: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      );
    }
  }

  async obtenerPorId(id: string): Promise<PersonalTerritorial | null> {
    try {
      const dto = await this.dataSource.obtenerPorId(id);
      return dto ? PersonalTerritorialMapper.toDomain(dto) : null;
    } catch (error) {
      throw new Error(
        `No se pudo obtener el personal: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      );
    }
  }

  async crear(datos: CrearPersonalDTO): Promise<PersonalTerritorial> {
    try {
      const dto = await this.dataSource.crear(datos);
      return PersonalTerritorialMapper.toDomain(dto);
    } catch (error) {
      throw new Error(
        `No se pudo crear el usuario: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      );
    }
  }

  async actualizar(datos: ActualizarPersonalDTO): Promise<PersonalTerritorial> {
    try {
      const { id, ...actualizaciones } = datos;
      const dto = await this.dataSource.actualizar(id, actualizaciones);
      return PersonalTerritorialMapper.toDomain(dto);
    } catch (error) {
      throw new Error(
        `No se pudo actualizar el personal: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      );
    }
  }

  async eliminar(id: string): Promise<void> {
    try {
      await this.dataSource.eliminar(id);
    } catch (error) {
      throw new Error(
        `No se pudo eliminar el personal: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      );
    }
  }

  async puedeGestionar(usuarioId: string): Promise<boolean> {
    try {
      return await this.dataSource.puedeGestionar(usuarioId);
    } catch (error) {
      console.error('[PersonalTerritorialRepository] Error verificando permisos:', error);
      return false;
    }
  }
}
