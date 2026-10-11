// Pruebas del cliente de escaneo. Ejecutar:  npm run test:scan   (Node >= 22.18, sin dependencias extra)
import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyResponse, postScan } from './scan-client.ts';

const json = (status, body, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
const html502 = () => new Response('<html>Bad gateway</html>', { status: 502 });

const base = (fetchImpl, extra = {}) => ({
  url: 'https://api.test/qrs/scan',
  body: { token: 'QR-1', event_id: 'ev-1' },
  getToken: () => 'TOKEN',
  fetchImpl,
  sleep: async () => {},
  ...extra,
});

/** fetch falso que responde en orden y registra los cuerpos enviados. */
function script(...steps) {
  const sent = [];
  const fn = async (_url, init) => {
    sent.push(JSON.parse(init.body));
    const step = steps[Math.min(sent.length - 1, steps.length - 1)];
    if (step instanceof Error) throw step;
    return typeof step === 'function' ? step() : step;
  };
  fn.sent = sent;
  return fn;
}

test('classifyResponse: cada caso se muestra como lo que es', () => {
  assert.equal(classifyResponse(201, { ok: true }).kind, 'ok');
  assert.equal(classifyResponse(401, { message: 'Unauthorized' }).kind, 'session_expired');
  assert.equal(classifyResponse(403, { code: 'NOT_STAFF' }).kind, 'forbidden');
  assert.deepEqual(classifyResponse(429, {}, '12'), { kind: 'rate_limited', retryAfterSec: 12 });
  assert.equal(classifyResponse(429, {}).retryAfterSec, null);
  assert.equal(classifyResponse(503, {}).kind, 'server_error');
  assert.equal(classifyResponse(502, null).kind, 'server_error');
  assert.equal(classifyResponse(400, { code: 'ALREADY_USED', message: 'x', used_by: 'Carlos' }).usedBy, 'Carlos');
  assert.equal(classifyResponse(400, { code: 'WRONG_EVENT', message: 'x' }).kind, 'wrong_event');
  assert.equal(classifyResponse(404, { code: 'INVALID', message: 'falso' }).kind, 'invalid');
});

test('REGRESIÓN: un 400 que NO es "ya quemado" ya no se muestra como YA QUEMADO', () => {
  assert.equal(classifyResponse(400, { code: 'BAD_REQUEST', message: 'QR vacío' }).kind, 'invalid');
  assert.equal(classifyResponse(400, { message: 'Faltan datos' }).kind, 'invalid');
});

test('compatibilidad: backend viejo sin `code` sigue clasificándose por el texto', () => {
  assert.equal(classifyResponse(400, { message: 'QR YA QUEMADO: El acceso fue permitido el ...' }).kind, 'already_used');
  assert.equal(classifyResponse(400, { message: '⛔ EVENTO INCORRECTO: Esta entrada es para otro evento.' }).kind, 'wrong_event');
});

test('REGRESIÓN: sesión vencida (401) ya no se muestra como "QR inválido": renueva y repite la lectura', async () => {
  let refreshed = 0;
  const f = script(json(401, { message: 'Unauthorized' }), json(201, { ok: true, attendee_name: 'Ana' }));
  let token = 'VIEJO';
  const r = await postScan(
    base(f, {
      getToken: () => token,
      refreshToken: async () => {
        refreshed++;
        token = 'NUEVO';
        return token;
      },
    }),
  );
  assert.equal(r.kind, 'ok');
  assert.equal(refreshed, 1);
  assert.equal(f.sent.length, 2);
  assert.equal(f.sent[0].scan_id, f.sent[1].scan_id); // misma lectura
  assert.equal(f.sent[1].retry, false); // el 401 no pudo haber quemado nada
});

test('401 que no se puede renovar → session_expired (y solo intenta renovar una vez)', async () => {
  let refreshed = 0;
  const f = script(json(401, {}));
  const r = await postScan(base(f, { refreshToken: async () => (refreshed++, null) }));
  assert.equal(r.kind, 'session_expired');
  assert.equal(refreshed, 1);
  assert.equal(f.sent.length, 1);
});

test('sin token en la cookie → session_expired sin llamar al servidor', async () => {
  const f = script(json(201, {}));
  const r = await postScan(base(f, { getToken: () => null }));
  assert.equal(r.kind, 'session_expired');
  assert.equal(f.sent.length, 0);
});

test('corte de red: reintenta con el MISMO scan_id y marca retry=true; el resultado final es OK', async () => {
  const f = script(new TypeError('fetch failed'), json(201, { ok: true, replayed: true }));
  const r = await postScan(base(f));
  assert.equal(r.kind, 'ok');
  assert.equal(r.replayed, true);
  assert.equal(f.sent.length, 2);
  assert.equal(f.sent[0].retry, false);
  assert.equal(f.sent[1].retry, true);
  assert.equal(f.sent[0].scan_id, f.sent[1].scan_id);
});

test('Render dormido (502 HTML, 503) → reintenta y entra cuando despierta', async () => {
  const f = script(html502(), json(503, { message: 'unavailable' }), json(201, { ok: true }));
  const r = await postScan(base(f));
  assert.equal(r.kind, 'ok');
  assert.equal(r.attempts, 3);
});

test('si nunca responde: network con maybeProcessed=true (el scanner ofrece REINTENTAR con el mismo scan_id)', async () => {
  const f = script(new TypeError('offline'));
  const r = await postScan(base(f, { maxAttempts: 3 }));
  assert.equal(r.kind, 'network');
  assert.equal(r.maybeProcessed, true);
  assert.equal(r.attempts, 3);
  const manual = script(json(201, { ok: true }));
  const again = await postScan(base(manual, { scanId: r.scanId, assumeSent: r.maybeProcessed }));
  assert.equal(again.kind, 'ok');
  assert.equal(manual.sent[0].scan_id, r.scanId);
  assert.equal(manual.sent[0].retry, true);
});

test('timeout: una petición colgada se aborta y se trata como corte de red', async () => {
  const hanging = (_url, init) => new Promise((_res, rej) => init.signal.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' }))));
  const r = await postScan(base(hanging, { timeoutMs: 20, maxAttempts: 2, autoRetryUnsafe: true }));
  assert.equal(r.kind, 'network');
  assert.match(r.message, /tardó demasiado/);
  assert.equal(r.attempts, 2);
});

test('429 con Retry-After corto: espera y reintenta; largo: avisa sin dejar la fila congelada', async () => {
  const waits = [];
  const f1 = script(json(429, {}, { 'retry-after': '2' }), json(201, { ok: true }));
  const ok = await postScan(base(f1, { sleep: async (ms) => waits.push(ms) }));
  assert.equal(ok.kind, 'ok');
  assert.deepEqual(waits, [2000]);

  const f2 = script(json(429, {}, { 'retry-after': '60' }));
  const limited = await postScan(base(f2));
  assert.equal(limited.kind, 'rate_limited');
  assert.equal(f2.sent.length, 1);
});

test('YA QUEMADO / evento incorrecto / inválido se devuelven al instante, sin reintentos', async () => {
  for (const [status, body, kind] of [
    [400, { code: 'ALREADY_USED', message: 'm', used_by: 'Carlos' }, 'already_used'],
    [400, { code: 'WRONG_EVENT', message: 'm' }, 'wrong_event'],
    [404, { code: 'INVALID', message: 'm' }, 'invalid'],
    [403, { code: 'NOT_STAFF', message: 'm' }, 'forbidden'],
  ]) {
    const f = script(json(status, body));
    const r = await postScan(base(f));
    assert.equal(r.kind, kind);
    assert.equal(f.sent.length, 1);
  }
});

test('cédula (autoRetryUnsafe=false): tras un corte NO repite sola (evita quemar dos entradas)', async () => {
  const f = script(new TypeError('offline'), json(201, { ok: true }));
  const r = await postScan(base(f, { autoRetryUnsafe: false }));
  assert.equal(r.kind, 'network');
  assert.equal(f.sent.length, 1);
});
