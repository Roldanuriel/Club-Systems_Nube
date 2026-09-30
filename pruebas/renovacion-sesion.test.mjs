import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

function memoryStorage() {
  const values = new Map();
  return {
    setItem: (key, value) => values.set(key, String(value)),
    getItem: key => values.get(key) ?? null,
    removeItem: key => values.delete(key)
  };
}

// Sustituir solo el navegador y la red: se ejecuta el servicio real sin usar cuentas ni datos reales.
globalThis.window = {};
globalThis.sessionStorage = memoryStorage();
globalThis.localStorage = memoryStorage();
const fakeAxios = {};
globalThis[Symbol.for('club-test-axios')] = fakeAxios;
const source = (await readFile(new URL('../interfaz/servicios/autenticacion.js', import.meta.url), 'utf8'))
  .replace("import axios from 'axios';", "const axios = globalThis[Symbol.for('club-test-axios')];")
  .replace("import { BACKEND } from './direccion-servidor';", "const BACKEND = '/api';");
const { authService } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

test('peticiones simultáneas comparten una sola renovación', async () => {
  let requests = 0;
  let finish;
  fakeAxios.post = () => {
    requests++;
    return new Promise(resolve => { finish = resolve; });
  };
  const first = authService.refreshToken();
  const second = authService.refreshToken();
  assert.equal(first, second);
  finish({ data: { status: 'success', token: 'test-access', remember_token: 'test-refresh' } });
  assert.deepEqual(await Promise.all([first, second]), ['test-access', 'test-access']);
  assert.equal(requests, 1);
  assert.equal(authService.getToken(), 'test-access');
  assert.equal(authService.getRefreshToken(), 'test-refresh');
});

test('un fallo rechaza a todos los solicitantes y permite intentarlo después', { timeout: 3000 }, async () => {
  let fail;
  fakeAxios.post = () => new Promise((resolve, reject) => { fail = reject; });
  const first = authService.refreshToken();
  const second = authService.refreshToken();
  const completed = Promise.allSettled([first, second]);
  fail(new Error('Fallo de prueba'));
  assert.deepEqual((await completed).map(result => result.status), ['rejected', 'rejected']);
  assert.equal(authService.getToken(), null);
  assert.equal(authService.getRefreshToken(), null);
  fakeAxios.post = async () => ({ data: { status: 'success', token: 'retry-token' } });
  assert.equal(await authService.refreshToken(), 'retry-token');
});

test('una respuesta de error de la API también limpia la sesión', async () => {
  fakeAxios.post = async () => ({ data: { status: 'error', message: 'Sesión vencida' } });
  await assert.rejects(authService.refreshToken(), /Sesión vencida/);
  assert.equal(authService.getToken(), null);
});
