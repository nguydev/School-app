const test = require('node:test');
const assert = require('node:assert/strict');
const { definitions } = require('../src/modules/academic/validation');

const id = '0123456789abcdef01234567';

test('academic PATCH schemas allow partial updates without requiring status', () => {
  for (const [resource, definition] of Object.entries(definitions)) {
    const result = definition.update.safeParse({
      body: { order: 1 },
      params: { id },
      query: {},
    });

    assert.equal(result.success, true, `${resource} should accept an order-only update`);
  }
});

test('academic PATCH schemas reject count-only updates', () => {
  for (const [resource, definition] of Object.entries(definitions)) {
    const result = definition.update.safeParse({
      body: { videoCount: 1 },
      params: { id },
      query: {},
    });

    assert.equal(result.success, false, `${resource} should reject a computed-count-only update`);
  }
});
