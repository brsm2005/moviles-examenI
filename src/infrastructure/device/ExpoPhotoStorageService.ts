import { Image } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import {
  ImageManipulator,
  SaveFormat,
} from 'expo-image-manipulator';
import type { IPhotoStorageService } from '@/domain/ports/IPhotoStorageService';

function obtenerDimensiones(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      reject,
    );
  });
}

export async function asegurarImagenVertical(fotoUri: string): Promise<string> {
  const { width, height } = await obtenerDimensiones(fotoUri);
  const contexto = ImageManipulator.manipulate(fotoUri);

  if (width > height) contexto.rotate(90);

  const imagen = await contexto.renderAsync();
  const resultado = await imagen.saveAsync({
    compress: 0.92,
    format: SaveFormat.JPEG,
  });
  return resultado.uri;
}

export const expoPhotoStorageService: IPhotoStorageService = {
  asegurarImagenVertical,
  async guardarFoto(actaId, fotoUri) {
    const directorio = new Directory(Paths.document, 'actas');
    directorio.create({ intermediates: true, idempotent: true });

    const destino = new File(directorio, `${actaId}.jpg`);
    const origen = new File(fotoUri);
    await origen.copy(destino);
    return destino.uri;
  },
  async eliminarFoto(fotoUri) {
    const foto = new File(fotoUri);
    if (foto.exists) foto.delete();
  },
};
