'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const zlib = require('zlib');
const { imageSize, nearestAspect } = require('../lib/imagesize');

function jpegWith({ width, height, orientation }) {
  const parts = [Buffer.from([0xff, 0xd8])];
  if (orientation) {
    // APP1 Exif, little-endian TIFF med én IFD-oppføring (0x0112 = Orientation)
    const tiff = Buffer.alloc(8 + 2 + 12 + 4);
    tiff.write('II', 0, 'latin1'); tiff.writeUInt16LE(42, 2); tiff.writeUInt32LE(8, 4);
    tiff.writeUInt16LE(1, 8); tiff.writeUInt16LE(0x0112, 10); tiff.writeUInt16LE(3, 12); tiff.writeUInt32LE(1, 14); tiff.writeUInt16LE(orientation, 18);
    const body = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff]);
    const seg = Buffer.alloc(4); seg[0] = 0xff; seg[1] = 0xe1; seg.writeUInt16BE(body.length + 2, 2);
    parts.push(seg, body);
  }
  const sof = Buffer.alloc(2 + 17); sof[0] = 0xff; sof[1] = 0xc0; sof.writeUInt16BE(17, 2); sof[4] = 8;
  sof.writeUInt16BE(height, 5); sof.writeUInt16BE(width, 7); sof[9] = 3;
  parts.push(sof, Buffer.from([0xff, 0xd9]));
  return Buffer.concat(parts);
}

test('JPEG: leser bredde og høyde fra SOF0', () => {
  assert.deepEqual(imageSize(jpegWith({ width: 1200, height: 1600 })), { width: 1200, height: 1600 });
});

test('JPEG: EXIF-rotasjon 6 bytter om bredde og høyde', () => {
  assert.deepEqual(imageSize(jpegWith({ width: 1600, height: 1200, orientation: 6 })), { width: 1200, height: 1600 });
  assert.deepEqual(imageSize(jpegWith({ width: 1600, height: 1200, orientation: 1 })), { width: 1600, height: 1200 });
});

test('PNG: leser IHDR', () => {
  const png = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(png);
  png.writeUInt32BE(13, 8); png.write('IHDR', 12, 'latin1'); png.writeUInt32BE(640, 16); png.writeUInt32BE(480, 20);
  assert.deepEqual(imageSize(png), { width: 640, height: 480 });
});

test('WebP: VP8X og VP8L', () => {
  const x = Buffer.alloc(30);
  x.write('RIFF', 0, 'latin1'); x.write('WEBP', 8, 'latin1'); x.write('VP8X', 12, 'latin1');
  x.writeUIntLE(1079, 24, 3); x.writeUIntLE(1439, 27, 3);
  assert.deepEqual(imageSize(x), { width: 1080, height: 1440 });
  const l = Buffer.alloc(30);
  l.write('RIFF', 0, 'latin1'); l.write('WEBP', 8, 'latin1'); l.write('VP8L', 12, 'latin1'); l[20] = 0x2f;
  l.writeUInt32LE((299) | (399 << 14), 21);
  assert.deepEqual(imageSize(l), { width: 300, height: 400 });
});

test('ukjent innhold gir null', () => {
  assert.equal(imageSize(Buffer.from('hei')), null);
  assert.equal(imageSize(zlib.gzipSync('x')), null);
  assert.equal(imageSize('ikke buffer'), null);
});

test('nearestAspect velger det nærmeste tillatte sideforholdet', () => {
  const allowed = ['1:1', '3:4', '4:3', '9:16', '16:9'];
  assert.equal(nearestAspect(1080, 1440, allowed), '3:4');
  assert.equal(nearestAspect(1080, 1920, allowed), '9:16');
  assert.equal(nearestAspect(1920, 1080, allowed), '16:9');
  assert.equal(nearestAspect(1000, 1000, allowed), '1:1');
  assert.equal(nearestAspect(0, 10, allowed), null);
});
