import type {
  DatosCrearUsuario,
  DatosEditarUsuario,
  FiltrosUsuarios,
  GestorUsuarios,
  ResultadoListaUsuarios,
} from '@/domain/entities/GestorUsuarios';
import type { IUsuariosRepository } from '@/domain/ports/IUsuariosRepository';
import type { IUsuariosDataSource } from '@/domain/ports/IUsuariosDataSource';

export class UsuariosRepository implements IUsuariosRepository {
  constructor(private dataSource: IUsuariosDataSource) {}

  async crearUsuario(datos: DatosCrearUsuario, recintoIdDelCreador?: string): Promise<GestorUsuarios> {
    return this.dataSource.crearUsuario(datos, recintoIdDelCreador);
  }

  async obtenerUsuarios(
    filtros: FiltrosUsuarios,
    pagina = 1,
    porPagina = 10
  ): Promise<ResultadoListaUsuarios> {
    return this.dataSource.obtenerUsuarios(filtros, pagina, porPagina);
  }

  async obtenerUsuarioPorId(id: string): Promise<GestorUsuarios | null> {
    return this.dataSource.obtenerUsuarioPorId(id);
  }

  async obtenerUsuarioPorEmail(email: string): Promise<GestorUsuarios | null> {
    return this.dataSource.obtenerUsuarioPorEmail(email);
  }

  async editarUsuario(id: string, datos: DatosEditarUsuario): Promise<GestorUsuarios> {
    return this.dataSource.editarUsuario(id, datos);
  }

  async desactivarUsuario(id: string): Promise<void> {
    return this.dataSource.desactivarUsuario(id);
  }

  async activarUsuario(id: string): Promise<void> {
    return this.dataSource.activarUsuario(id);
  }

  async editarNombrePropio(id: string, nuevoNombre: string): Promise<GestorUsuarios> {
    return this.dataSource.editarNombrePropio(id, nuevoNombre);
  }
}
