export interface ResultadoNitidez {
  esNitida: boolean;
  puntuacion: number;
}

export interface IImageQualityService {
  analizarNitidez(fotoUri: string): Promise<ResultadoNitidez>;
}
