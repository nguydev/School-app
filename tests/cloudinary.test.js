const assert = require('node:assert/strict');
const { test } = require('node:test');
const detectImageFormat = require('../src/utils/imageFormat');

test('image signature detection accepts supported formats', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
  const webp = Buffer.from('RIFF0000WEBP');
  const avif = Buffer.from('0000ftypavif');

  assert.equal(detectImageFormat(png), 'png');
  assert.equal(detectImageFormat(jpeg), 'jpeg');
  assert.equal(detectImageFormat(webp), 'webp');
  assert.equal(detectImageFormat(avif), 'avif');
});

test('image signature detection rejects unsupported or malformed data', () => {
  assert.equal(detectImageFormat(Buffer.from('<svg></svg>')), null);
  assert.equal(detectImageFormat(Buffer.from('not an image')), null);
  assert.equal(detectImageFormat('not a buffer'), null);
});
