'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { settings, fallbackReason } = require('../lib/mcp-fallback');

const MIN = 60 * 1000;
const opts = { unclaimedMs: 4 * MIN, stuckMs: 12 * MIN };
const job = (provider, extra = {}) => ({ status: 'processing', startedAt: 0, createdAt: 0, provider: { name: 'mcp', ...provider }, ...extra });

test('unclaimed job falls back after the deadline', () => {
  assert.strictEqual(fallbackReason(job({}), 3 * MIN, opts), null);
  assert.strictEqual(fallbackReason(job({}), 4 * MIN, opts), 'unclaimed');
});

test('claimed job gets longer before it counts as stuck', () => {
  const j = job({ claimedAt: 2 * MIN });
  assert.strictEqual(fallbackReason(j, 10 * MIN, opts), null);
  assert.strictEqual(fallbackReason(j, 14 * MIN, opts), 'stuck');
});

test('only processing MCP jobs are eligible', () => {
  assert.strictEqual(fallbackReason(job({}, { status: 'done' }), 60 * MIN, opts), null);
  assert.strictEqual(fallbackReason({ status: 'processing', startedAt: 0, provider: { name: 'higgsfield' } }, 60 * MIN, opts), null);
});

test('never while the delivered film is being finished', () => {
  assert.strictEqual(fallbackReason(job({ stage: 'finishing', claimedAt: 0 }), 60 * MIN, opts), null);
});

test('waits after a failed fallback attempt', () => {
  assert.strictEqual(fallbackReason(job({ fallbackRetryAt: 10 * MIN }), 9 * MIN, opts), null);
  assert.strictEqual(fallbackReason(job({ fallbackRetryAt: 10 * MIN }), 10 * MIN, opts), 'unclaimed');
});

test('MCP_FALLBACK_MIN=0 turns the fallback off', () => {
  assert.strictEqual(fallbackReason(job({}), 60 * MIN, settings({ MCP_FALLBACK_MIN: '0' })), null);
  assert.deepStrictEqual(settings({}), opts);
});
