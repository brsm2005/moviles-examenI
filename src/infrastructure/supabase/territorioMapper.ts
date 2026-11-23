import { z } from 'zod';
import type { Candidato } from '@/domain/entities/Candidato';
import type { MesaJrv } from '@/domain/entities/MesaJrv';
import type { OrganizacionPolitica } from '@/domain/entities/OrganizacionPolitica';
import type { PersonalTerritorial } from '@/domain/entities/PersonalTerritorial';
import type { Recinto } from '@/domain/entities/Recinto';

const recintoRowSchema = z.object({
  id: z.uuid(),
  codigo_cne: z.string().nullable(),
  nombre: z.string(),
  provincia: z.string(),
  canton: z.string(),
  parroquia: z.string(),
  direccion: z.string().nullable(),
  latitud_referencia: z.number().nullable(),
  longitud_referencia: z.number().nullable(),
  coordinador_recinto_id: z.uuid().nullable(),
});

const mesaRowSchema = z.object({
  id: z.uuid(),
  recinto_id: z.uuid(),
  numero_mesa: z.number().int().positive(),
  genero: z.enum(['MASCULINO', 'FEMENINO', 'MIXTA']),
  total_electores_padron: z.number().int().nonnegative(),
  veedor_asignado_id: z.uuid().nullable(),
});

const organizacionRowSchema = z.object({
  id: z.uuid(),
  lista_numero: z.string(),
  nombre: z.string(),
  siglas: z.string(),
  color_hex: z.string().nullable(),
});

const candidatoRowSchema = z.object({
  id: z.uuid(),
  organizacion_id: z.uuid(),
  dignidad: z.enum(['ALCALDE', 'PREFECTO']),
  nombre_completo: z.string(),
  orden_papeleta: z.number().int().positive(),
});

const personalRowSchema = z.object({
  id: z.uuid(),
  nombres_completos: z.string(),
  cedula: z.string(),
  email: z.email(),
});

function parsear<T>(
  schema: z.ZodType<T>,
  value: unknown,
  entityName: string,
): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new Error(
      `El registro de ${entityName} recibido desde Supabase no es válido: ${parsed.error.message}`,
    );
  }
  return parsed.data;
}

export function mapearRecinto(value: unknown): Recinto {
  const row = parsear(recintoRowSchema, value, 'recinto');
  const latitud = row.latitud_referencia;
  const longitud = row.longitud_referencia;

  return {
    id: row.id,
    nombre: row.nombre,
    provincia: row.provincia,
    canton: row.canton,
    parroquia: row.parroquia,
    direccion: row.direccion,
    codigoCne: row.codigo_cne,
    coordinadorRecintoId: row.coordinador_recinto_id,
    centroide:
      latitud !== null && longitud !== null
        ? { latitud, longitud }
        : null,
  };
}

export function mapearMesaJrv(value: unknown): MesaJrv {
  const row = parsear(mesaRowSchema, value, 'mesa JRV');
  return {
    id: row.id,
    recintoId: row.recinto_id,
    numero: row.numero_mesa,
    codigo: String(row.numero_mesa),
    genero: row.genero,
    totalElectoresPadron: row.total_electores_padron,
    veedorIds: row.veedor_asignado_id ? [row.veedor_asignado_id] : [],
  };
}

export function mapearOrganizacionPolitica(
  value: unknown,
): OrganizacionPolitica {
  const row = parsear(organizacionRowSchema, value, 'organización política');
  return {
    id: row.id,
    nombre: row.nombre,
    sigla: row.siglas,
    color: row.color_hex,
    numeroLista: row.lista_numero,
  };
}

export function mapearCandidato(value: unknown): Candidato {
  const row = parsear(candidatoRowSchema, value, 'candidato');
  return {
    id: row.id,
    organizacionPoliticaId: row.organizacion_id,
    nombresCompletos: row.nombre_completo,
    dignidad: row.dignidad,
    numeroLista: row.orden_papeleta,
  };
}

export function mapearPersonalTerritorial(
  value: unknown,
): PersonalTerritorial {
  const row = parsear(personalRowSchema, value, 'perfil territorial');
  return {
    id: row.id,
    nombresCompletos: row.nombres_completos,
    cedula: row.cedula,
    email: row.email,
  };
}
