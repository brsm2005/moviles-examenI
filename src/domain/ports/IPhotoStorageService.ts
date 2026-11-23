export interface IPhotoStorageService {
  asegurarImagenVertical(fotoUri: string): Promise<string>;
  guardarFoto(actaId: string, fotoUri: string): Promise<string>;
  eliminarFoto(fotoUri: string): Promise<void>;
}
