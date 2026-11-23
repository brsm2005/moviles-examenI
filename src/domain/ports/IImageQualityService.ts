export interface ResultadoNitidez {
  esBorrosa: boolean;
  puntuacion: number;
  umbral: number;
  ancho: number;
  alto: number;
}

export interface IImageQualityService {
  analizarNitidez(fotoUri: string): Promise<ResultadoNitidez>;
}
