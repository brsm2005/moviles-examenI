export interface MesaJrv {
  id: string;
  recintoId: string;
  numero: number;
  codigo: string;
  genero: 'MASCULINO' | 'FEMENINO' | 'MIXTA';
  totalElectoresPadron: number;
  veedorIds: string[];
}
