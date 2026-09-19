import assert from 'node:assert/strict';
import test from 'node:test';
import { Readable } from 'node:stream';
import { createLocalDecisionPlugin } from '../server/local-api-plugin.mjs';

function invoke(handler, { port = 4174, origin, path = '/api/status', method = 'GET' } = {}) {
  const host = `127.0.0.1:${port}`;
  const req = Readable.from([JSON.stringify({ scenarioId: 'social-worth' })]);
  Object.assign(req, { url: path, method, headers: { host, origin: origin ?? `http://${host}`, 'content-type': 'application/json' } });
  return new Promise((resolve, reject) => {
    const res = { statusCode: 200, setHeader() {}, end(body) { resolve({ status: this.statusCode, body: JSON.parse(body) }); } };
    Promise.resolve(handler(req, res, () => resolve({ next: true }))).catch(reject);
  });
}

test('built preview serves local status and explicit decisions without exposing the key', async () => {
  let calls = 0;
  const plugin = createLocalDecisionPlugin({ apiKey: 'preview-test-key', fetchImpl: async () => {
    calls++;
    return { ok: true, json: async () => ({ answers: { hit: { type: 'choice', choice: 'left', probabilities: { left: .8, right: .2 }, confidence: .3 } } }) };
  } });
  let handler;
  plugin.configurePreviewServer({ middlewares: { use(fn) { handler = fn; } } });
  assert.deepEqual(await invoke(handler), { status: 200, body: { configured: true } });
  assert.equal(calls, 0);
  const answer = await invoke(handler, { path: '/api/decision', method: 'POST' });
  assert.equal(answer.body.source, 'typesafe');
  assert.equal(answer.body.choice, 'left');
  assert.equal(calls, 1);
  assert.ok(!JSON.stringify(answer).includes('preview-test-key'));
  assert.equal((await invoke(handler, { port: 5173 })).status, 403);
  assert.equal((await invoke(handler, { path: '/api/decision', method: 'POST', origin: 'https://example.com' })).status, 403);
  assert.equal(calls, 1);
});

test('development retains its own host restriction', async () => {
  const plugin = createLocalDecisionPlugin({ apiKey: '', fetchImpl: () => assert.fail('no upstream call') });
  let handler;
  plugin.configureServer({ middlewares: { use(fn) { handler = fn; } } });
  assert.deepEqual(await invoke(handler, { port: 5173 }), { status: 200, body: { configured: false } });
  assert.equal((await invoke(handler)).status, 403);
});
