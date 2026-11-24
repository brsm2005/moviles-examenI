import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { File, Paths } from 'expo-file-system';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import type { Candidato, Dignidad } from '@/domain/entities/Candidato';
import type {
  IActaOcrService,
  ResultadoOcrActa,
} from '@/domain/ports/IActaOcrService';

const respuestaOcrSchema = z.object({
  provinciaLeida: z.string().nullable(),
  cantonLeido: z.string().nullable(),
  totalSufragantes: z.number().int().min(0).nullable(),
  votosBlancos: z.number().int().min(0).nullable(),
  votosNulos: z.number().int().min(0).nullable(),
  votosCandidatos: z.array(
    z.object({ votos: z.number().int().min(0).nullable() }),
  ).length(5),
});

function obtenerModelo() {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Configure EXPO_PUBLIC_GEMINI_API_KEY para procesar actas con Gemini.',
    );
  }

  return new GoogleGenerativeAI(apiKey).getGenerativeModel({
    model: 'gemini-3.8-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          provinciaLeida: {
            type: SchemaType.STRING,
            nullable: true,
          },
          cantonLeido: {
            type: SchemaType.STRING,
            nullable: true,
          },
          totalSufragantes: {
            type: SchemaType.INTEGER,
            nullable: true,
          },
          votosBlancos: {
            type: SchemaType.INTEGER,
            nullable: true,
          },
          votosNulos: {
            type: SchemaType.INTEGER,
            nullable: true,
          },
          votosCandidatos: {
            type: SchemaType.ARRAY,
            minItems: 5,
            maxItems: 5,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                votos: {
                  type: SchemaType.INTEGER,
                  nullable: true,
                },
              },
              required: ['votos'],
            },
          },
        },
        required: [
          'provinciaLeida',
          'cantonLeido',
          'totalSufragantes',
          'votosBlancos',
          'votosNulos',
          'votosCandidatos',
        ],
      },
    },
  });
}

function construirInstrucciones(
  dignidad: Dignidad,
  candidatos: Candidato[],
  territorio: { provincia: string; canton: string },
): string {
  const listaCandidatos = candidatos
    .map((candidato, indice) => `${indice + 1}. ${candidato.nombresCompletos}`)
    .join('\n');

  return [
    `Extrae los votos del acta electoral de dignidad ${dignidad}.`,
    `La jurisdicción esperada de la mesa es ${JSON.stringify(territorio)}.`,
    'Lee literalmente de la imagen la provincia y el cantón en provinciaLeida y cantonLeido.',
    'Si falta alguno, no es legible o hay duda, devuelve null para ese campo. Nunca copies la jurisdicción esperada ni la infieras.',
    'Responde solo con el JSON indicado por el esquema.',
    'Si un dígito no es legible, responde null; nunca lo adivines.',
    'Conserva el orden de los candidatos y devuelve exactamente cinco elementos.',
    'No calcules ni corrijas cifras a partir de otras casillas.',
    'Los candidatos, en orden, son:',
    listaCandidatos,
  ].join('\n');
}

export class GeminiActaOcrService implements IActaOcrService {
  async extraerVotos(
    fotoUri: string,
    dignidad: Dignidad,
    candidatos: Candidato[],
    territorio: { provincia: string; canton: string },
  ): Promise<ResultadoOcrActa> {
    if (candidatos.length !== 5) {
      throw new Error('El OCR requiere exactamente cinco candidatos.');
    }

    let imagenBase64: string;
    if (/^https?:\/\//i.test(fotoUri)) {
      const temporal = new File(Paths.cache, `ocr-${uuidv4()}.jpg`);
      try {
        await File.downloadFileAsync(fotoUri, temporal);
        imagenBase64 = await temporal.base64();
      } finally {
        if (temporal.exists) temporal.delete();
      }
    } else {
      imagenBase64 = await new File(fotoUri).base64();
    }
    const resultado = await obtenerModelo().generateContent([
      construirInstrucciones(dignidad, candidatos, territorio),
      { inlineData: { data: imagenBase64, mimeType: 'image/jpeg' } },
    ]);
    const texto = resultado.response.text();
    if (!texto) throw new Error('Gemini devolvió una respuesta OCR vacía.');

    const lectura = respuestaOcrSchema.parse(JSON.parse(texto));
    return {
      provinciaLeida: lectura.provinciaLeida,
      cantonLeido: lectura.cantonLeido,
      totalSufragantes: lectura.totalSufragantes,
      votosBlancos: lectura.votosBlancos,
      votosNulos: lectura.votosNulos,
      votosCandidatos: lectura.votosCandidatos.map((voto, indice) => ({
        candidatoId: candidatos[indice].id,
        votos: voto.votos,
      })),
    };
  }
}
