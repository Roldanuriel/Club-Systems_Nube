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

function validRefreshResponse(token = 'test-access', rememberToken = 'test-refresh') {
  return {
    data: {
      status: 'success',
      token,
      remember_token: rememberToken,
      token_expires_at: '2099-01-01T00:00:00.000Z'
    }
  };
}

test('peticiones simultáneas comparten una sola renovación', async () => {
  authService.clearAuth();
  authService.setToken('old-access');
  authService.setRefreshToken('old-refresh');
  let requests = 0;
  let finish;
  fakeAxios.post = (...args) => {
    requests++;
    assert.equal(args.length, 2);
    assert.deepEqual(args[1], { refresh_token: 'old-refresh' });
    return new Promise(resolve => { finish = resolve; });
  };
  const first = authService.refreshToken();
  const second = authService.refreshToken();
  assert.equal(first, second);
  finish(validRefreshResponse());
  assert.deepEqual(await Promise.all([first, second]), ['test-access', 'test-access']);
  assert.equal(requests, 1);
  assert.equal(authService.getToken(), 'test-access');
  assert.equal(authService.getRefreshToken(), 'test-refresh');
  assert.equal(authService.getTokenExpiry(), '2099-01-01T00:00:00.000Z');
});

test('un fallo rechaza a todos los solicitantes y permite intentarlo después', { timeout: 3000 }, async () => {
  authService.clearAuth();
  authService.setToken('old-access');
  authService.setRefreshToken('old-refresh');
  let fail;
  fakeAxios.post = () => new Promise((resolve, reject) => { fail = reject; });
  const first = authService.refreshToken();
  const second = authService.refreshToken();
  const completed = Promise.allSettled([first, second]);
  fail(new Error('Fallo de prueba'));
  assert.deepEqual((await completed).map(result => result.status), ['rejected', 'rejected']);
  assert.equal(authService.getToken(), null);
  assert.equal(authService.getRefreshToken(), null);
  authService.setRefreshToken('retry-refresh');
  fakeAxios.post = async () => validRefreshResponse('retry-token', 'rotated-refresh');
  assert.equal(await authService.refreshToken(), 'retry-token');
  assert.equal(authService.getRefreshToken(), 'rotated-refresh');
});

test('una respuesta de error de la API también limpia la sesión', async () => {
  authService.clearAuth();
  authService.setToken('old-access');
  authService.setRefreshToken('old-refresh');
  fakeAxios.post = async () => ({ data: { status: 'error', message: 'Sesión vencida' } });
  await assert.rejects(authService.refreshToken(), /Sesión vencida/);
  assert.equal(authService.getToken(), null);
  assert.equal(authService.getRefreshToken(), null);
});

test('sin refresh token no realiza la petición y limpia la sesión inválida', async () => {
  authService.clearAuth();
  authService.setToken('old-access');
  let requests = 0;
  fakeAxios.post = async () => { requests++; };

  await assert.rejects(authService.refreshToken(), /No hay token de renovación disponible/);
  assert.equal(requests, 0);
  assert.equal(authService.getToken(), null);
  assert.equal(authService.getRefreshToken(), null);
});

test('un access token próximo a expirar conserva la autenticación y el refresh token', () => {
  authService.clearAuth();
  authService.setToken('near-expiry-access');
  authService.setRefreshToken('valid-refresh');
  authService.setTokenExpiry(new Date(Date.now() + 60_000).toISOString());

  assert.equal(authService.isAuthenticated(), true);
  assert.equal(authService.getToken(), 'near-expiry-access');
  assert.equal(authService.getRefreshToken(), 'valid-refresh');
});

test('getCurrentUser renueva tras 401 y reintenta con el nuevo access token', async () => {
  authService.clearAuth();
  authService.setToken('expired-access');
  authService.setRefreshToken('valid-refresh');
  let profileRequests = 0;
  fakeAxios.get = async (url, options) => {
    profileRequests++;
    assert.equal(url, '/api/auth/me');
    if (profileRequests === 1) {
      assert.equal(options.headers.Authorization, 'Bearer expired-access');
      throw { response: { status: 401 } };
    }
    assert.equal(options.headers.Authorization, 'Bearer renewed-access');
    return { data: { status: 'success', data: { id: 8, tipo: 'ADMIN' } } };
  };
  fakeAxios.post = async (url, body, config) => {
    assert.equal(url, '/api/auth/refresh');
    assert.deepEqual(body, { refresh_token: 'valid-refresh' });
    assert.equal(config, undefined);
    return validRefreshResponse('renewed-access', 'rotated-refresh');
  };

  const user = await authService.getCurrentUser();
  assert.deepEqual(user, { id: 8, tipo: 'ADMIN' });
  assert.equal(profileRequests, 2);
  assert.equal(authService.getToken(), 'renewed-access');
  assert.equal(authService.getRefreshToken(), 'rotated-refresh');
});

test('el reloj del cliente adelantado no caduca una sesión nueva', async () => {
  authService.clearAuth();
  const serverNow = Date.now() - 8 * 60 * 60 * 1000;
  fakeAxios.post = async () => ({ data: { status: 'success', token: 'clock-token', remember_token: 'clock-refresh', server_time: new Date(serverNow).toISOString(), token_expires_at: new Date(serverNow + 2 * 60 * 60 * 1000).toISOString() } });
  await authService.login({usuario:'prueba',password:'prueba'});
  assert.equal(authService.isAuthenticated(), true);
  const remaining = Date.parse(authService.getTokenExpiry()) - Date.now();
  assert.ok(remaining > 7190000 && remaining <= 7200000);
});

test('el reloj del cliente atrasado no prolonga una sesión vencida', () => {
  authService.setToken('expired');
  const serverNow = Date.now() + 8 * 60 * 60 * 1000;
  authService.setTokenExpiry(new Date(serverNow - 1000).toISOString(),new Date(serverNow).toISOString());
  assert.equal(authService.isAuthenticated(),false);
  assert.equal(authService.getToken(),null);
});
