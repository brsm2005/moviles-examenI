import { File } from 'expo-file-system';
import {
  ImageManipulator,
  SaveFormat,
} from 'expo-image-manipulator';
import jpeg from 'jpeg-js';
import type {
  IImageQualityService,
  ResultadoNitidez,
} from '@/domain/ports/IImageQualityService';

const ANCHO_ANALISIS = 512;
const UMBRAL_NITIDEZ = 100;

export function calcularVarianzaLaplaciana(
  pixels: Uint8Array,
  width: number,
  height: number,
): number {
  if (width < 3 || height < 3 || pixels.length < width * height * 4) {
    throw new Error('La imagen no tiene dimensiones válidas para analizar nitidez.');
  }

  let suma = 0;
  let sumaCuadrados = 0;
  let cantidad = 0;
  const luminancia = new Float32Array(width * height);

  for (let indice = 0; indice < width * height; indice += 1) {
    const pixel = indice * 4;
    luminancia[indice] =
      0.299 * pixels[pixel] +
      0.587 * pixels[pixel + 1] +
      0.114 * pixels[pixel + 2];
  }

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const centro = y * width + x;
      const arriba = centro - width;
      const abajo = centro + width;
      const izquierda = centro - 1;
      const derecha = centro + 1;
      const laplaciano =
        4 * luminancia[centro] -
        luminancia[arriba] -
        luminancia[abajo] -
        luminancia[izquierda] -
        luminancia[derecha];

      suma += laplaciano;
      sumaCuadrados += laplaciano * laplaciano;
      cantidad += 1;
    }
  }

  const media = suma / cantidad;
  return sumaCuadrados / cantidad - media * media;
}

export class ExpoImageQualityService implements IImageQualityService {
  async analizarNitidez(fotoUri: string): Promise<ResultadoNitidez> {
    return analizarNitidez(fotoUri);
  }
}

export async function analizarNitidez(
  fotoUri: string,
): Promise<ResultadoNitidez> {
  const contexto = ImageManipulator.manipulate(fotoUri);
  contexto.resize({ width: ANCHO_ANALISIS });
  const imagen = await contexto.renderAsync();
  const resultado = await imagen.saveAsync({
    compress: 0.8,
    format: SaveFormat.JPEG,
  });

  try {
    const bytes = await new File(resultado.uri).bytes();
    const decodificada = jpeg.decode(bytes, { useTArray: true });
    const puntuacion = calcularVarianzaLaplaciana(
      decodificada.data,
      decodificada.width,
      decodificada.height,
    );
    return {
      esNitida: puntuacion >= UMBRAL_NITIDEZ,
      puntuacion,
    };
  } finally {
    const archivoTemporal = new File(resultado.uri);
    if (archivoTemporal.exists) archivoTemporal.delete();
  }
}
