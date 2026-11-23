export type Dignidad = 'ALCALDE' | 'PREFECTO';

export interface Candidato {
  id: string;
  organizacionPoliticaId: string;
  nombresCompletos: string;
  dignidad: Dignidad;
  numeroLista: number | null;
}
