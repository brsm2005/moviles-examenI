import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { filtrarMonitoreo } from './filtrarMonitoreo.ts';

const datos = {
  avances: [
    { recintoId: 'a', canton: 'Norte' },
    { recintoId: 'b', canton: 'Norte' },
    { recintoId: 'c', canton: 'Sur' },
  ],
  resultados: [
    { recintoId: 'a', candidatoId: '1', candidato: 'Ana', votos: 10 },
    { recintoId: 'b', candidatoId: '1', candidato: 'Ana', votos: 20 },
    { recintoId: 'c', candidatoId: '1', candidato: 'Ana', votos: 100 },
    { recintoId: 'b', candidatoId: '2', candidato: 'Luis', votos: 7 },
  ],
  actas: [{ recintoId: 'a' }, { recintoId: 'c' }],
};

test('total cantonal suma solo recintos del cantón sin alterar los datos originales', () => {
  const seleccion = filtrarMonitoreo(datos, 'Norte', null);
  assert.deepEqual(seleccion.resultados.map((r) => [r.candidatoId, r.votos]), [['1', 30], ['2', 7]]);
  assert.deepEqual(seleccion.actas.map((a) => a.recintoId), ['a']);
  assert.equal(datos.resultados[0].votos, 10);
});

test('el filtro por recinto no incluye votos ni actas de otros recintos o cantones', () => {
  const seleccion = filtrarMonitoreo(datos, 'Norte', 'b');
  assert.deepEqual(seleccion.resultados.map((r) => [r.candidatoId, r.votos]), [['1', 20], ['2', 7]]);
  assert.deepEqual(seleccion.actas, []);
  assert.deepEqual(filtrarMonitoreo(datos, 'Norte', 'c').resultados, []);
});
