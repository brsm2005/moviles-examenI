import { Buffer } from 'buffer';
import {
  ImageManipulator,
  SaveFormat,
  type ImageResult,
} from 'expo-image-manipulator';
import { decode } from 'jpeg-js';
import type {
  IImageQualityService,
  ResultadoNitidez,
} from '@/domain/ports/IImageQualityService';

export const ANCHO_ANALISIS = 640;
export const UMBRAL_NITIDEZ = 35;
export const TAMANO_REGION = 64;
export const PASO_REGION = 32;

function convertirAGrises(data: Uint8Array, pixeles: number): Float32Array {
  const grises = new Float32Array(pixeles);

  for (let indice = 0, posicion = 0; indice < pixeles; indice += 1, posicion += 4) {
    grises[indice] =
      0.299 * data[posicion] +
      0.587 * data[posicion + 1] +
      0.114 * data[posicion + 2];
  }

  return grises;
}

function suavizar(
  grises: Float32Array,
  ancho: number,
  alto: number,
): Float32Array {
  let actual = grises;

  for (let pasada = 0; pasada < 2; pasada += 1) {
    const horizontal = new Float32Array(actual.length);

    for (let y = 0; y < alto; y += 1) {
      const fila = y * ancho;
      for (let x = 0; x < ancho; x += 1) {
        const izquierda = actual[fila + (x > 0 ? x - 1 : x)];
        const centro = actual[fila + x];
        const derecha = actual[fila + (x < ancho - 1 ? x + 1 : x)];
        horizontal[fila + x] = (izquierda + centro + derecha) / 3;
      }
    }

    const vertical = new Float32Array(actual.length);

    for (let y = 0; y < alto; y += 1) {
      for (let x = 0; x < ancho; x += 1) {
        const indice = y * ancho + x;
        const arriba = horizontal[(y > 0 ? y - 1 : y) * ancho + x];
        const centro = horizontal[indice];
        const abajo = horizontal[(y < alto - 1 ? y + 1 : y) * ancho + x];
        vertical[indice] = (arriba + centro + abajo) / 3;
      }
    }

    actual = vertical;
  }

  return actual;
}

function mapaLaplaciano(
  grises: Float32Array,
  ancho: number,
  alto: number,
): Float32Array {
  const laplacianos = new Float32Array(ancho * alto);

  for (let y = 1; y < alto - 1; y += 1) {
    for (let x = 1; x < ancho - 1; x += 1) {
      const indice = y * ancho + x;
      laplacianos[indice] =
        4 * grises[indice] -
        grises[indice - 1] -
        grises[indice + 1] -
        grises[indice - ancho] -
        grises[indice + ancho];
    }
  }

  return laplacianos;
}

function varianzaRegion(
  laplacianos: Float32Array,
  ancho: number,
  alto: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): number {
  let suma = 0;
  let sumaCuadrados = 0;
  let total = 0;
  const desdeX = Math.max(1, x0);
  const hastaX = Math.min(ancho - 1, x1);
  const desdeY = Math.max(1, y0);
  const hastaY = Math.min(alto - 1, y1);

  for (let y = desdeY; y < hastaY; y += 1) {
    const fila = y * ancho;

    for (let x = desdeX; x < hastaX; x += 1) {
      const laplaciano = laplacianos[fila + x];
      suma += laplaciano;
      sumaCuadrados += laplaciano * laplaciano;
      total += 1;
    }
  }

  if (total === 0) return 0;

  const media = suma / total;
  return Math.max(0, sumaCuadrados / total - media * media);
}

function puntuacionNitidez(
  grises: Float32Array,
  ancho: number,
  alto: number,
): number {
  const laplacianos = mapaLaplaciano(grises, ancho, alto);

  if (ancho < TAMANO_REGION || alto < TAMANO_REGION) {
    return varianzaRegion(laplacianos, ancho, alto, 0, 0, ancho, alto);
  }

  let mejorPuntuacion = 0;

  for (let y = 0; y + TAMANO_REGION <= alto; y += PASO_REGION) {
    for (let x = 0; x + TAMANO_REGION <= ancho; x += PASO_REGION) {
      const puntuacion = varianzaRegion(
        laplacianos,
        ancho,
        alto,
        x,
        y,
        x + TAMANO_REGION,
        y + TAMANO_REGION,
      );
      if (puntuacion > mejorPuntuacion) mejorPuntuacion = puntuacion;
    }
  }

  return mejorPuntuacion;
}

async function generarAnalizable(
  uri: string,
  ancho: number,
  alto: number | null,
): Promise<ImageResult> {
  const contexto = ImageManipulator.manipulate(uri);
  contexto.resize({ width: ancho, height: alto });

  try {
    const imagen = await contexto.renderAsync();
    try {
      return await imagen.saveAsync({
        format: SaveFormat.JPEG,
        compress: 0.85,
        base64: true,
      });
    } finally {
      imagen.release();
    }
  } finally {
    contexto.release();
  }
}

export class ExpoImageQualityService implements IImageQualityService {
  analizarNitidez(fotoUri: string): Promise<ResultadoNitidez> {
    return analizarNitidez(fotoUri);
  }
}

export async function analizarNitidez(
  uri: string,
  umbral = UMBRAL_NITIDEZ,
): Promise<ResultadoNitidez> {
  let analizable = await generarAnalizable(uri, ANCHO_ANALISIS, null);

  if (analizable.width > ANCHO_ANALISIS) {
    const proporcion = analizable.height / analizable.width;
    analizable = await generarAnalizable(
      uri,
      ANCHO_ANALISIS,
      Math.max(1, Math.round(ANCHO_ANALISIS * proporcion)),
    );
  }

  if (!analizable.base64) {
    throw new Error('No se pudo leer la imagen para analizarla.');
  }

  const bytes = Buffer.from(analizable.base64, 'base64');
  const imagen = decode(bytes, {
    useTArray: true,
    formatAsRGBA: true,
  });
  if (imagen.width < 3 || imagen.height < 3) {
    throw new Error('La imagen es demasiado pequeña para analizarla.');
  }

  const grises = convertirAGrises(imagen.data, imagen.width * imagen.height);
  const suavizada = suavizar(grises, imagen.width, imagen.height);
  const puntuacion = puntuacionNitidez(
    suavizada,
    imagen.width,
    imagen.height,
  );

  return {
    esBorrosa: puntuacion < umbral,
    puntuacion,
    umbral,
    ancho: imagen.width,
    alto: imagen.height,
  };
}
