import type {
  DatosCrearUsuario,
  DatosEditarUsuario,
  FiltrosUsuarios,
  GestorUsuarios,
  ResultadoListaUsuarios,
} from '../entities/GestorUsuarios';

export interface IUsuariosRepository {
  crearUsuario(datos: DatosCrearUsuario, recintoIdDelCreador?: string): Promise<GestorUsuarios>;
  obtenerUsuarios(filtros: FiltrosUsuarios, pagina?: number, porPagina?: number): Promise<ResultadoListaUsuarios>;
  obtenerUsuarioPorId(id: string): Promise<GestorUsuarios | null>;
  obtenerUsuarioPorEmail(email: string): Promise<GestorUsuarios | null>;
  editarUsuario(id: string, datos: DatosEditarUsuario): Promise<GestorUsuarios>;
  desactivarUsuario(id: string): Promise<void>;
  activarUsuario(id: string): Promise<void>;
  editarNombrePropio(id: string, nuevoNombre: string): Promise<GestorUsuarios>;
}
