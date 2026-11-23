export interface Recinto {
  id: string;
  nombre: string;
  provincia: string;
  canton: string;
  parroquia: string | null;
  direccion: string | null;
  codigoCne: string | null;
  coordinadorRecintoId: string | null;
  centroide: {
    latitud: number;
    longitud: number;
  } | null;
}
