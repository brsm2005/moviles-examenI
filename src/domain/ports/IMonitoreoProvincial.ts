import type { Dignidad } from '@/domain/entities/Candidato';

export interface AvanceRecinto {
  recintoId: string;
  nombre: string;
  canton: string;
  parroquia: string;
  totalMesas: number;
  mesasReportadas: number;
  mesasFaltantes: number;
  actasReportadas: number;
  actasFaltantes: number;
  alertas: number;
}

export interface ResultadoProvincial {
  recintoId: string;
  dignidad: Dignidad;
  candidatoId: string;
  candidato: string;
  lista: string;
  organizacion: string;
  votos: number;
}

export interface ActaAuditada {
  id: string;
  recintoId: string;
  mesa: number;
  genero: string;
  dignidad: Dignidad;
  latitud: number;
  longitud: number;
  distancia: number | null;
  alerta: boolean;
}

export interface DetalleActaAuditada extends ActaAuditada {
  fotoUrl: string;
}

export interface DatosMonitoreo {
  avances: AvanceRecinto[];
  resultados: ResultadoProvincial[];
  actas: ActaAuditada[];
}

export interface IMonitoreoProvincial {
  consultar(): Promise<DatosMonitoreo>;
  obtenerDetalle(id: string): Promise<DetalleActaAuditada>;
  suscribir(alCambiar: () => void, alEstado: (estado: string) => void): () => void;
}
