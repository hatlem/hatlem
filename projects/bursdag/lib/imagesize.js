'use strict';

/**
 * Leser bredde og høyde fra JPEG, PNG og WebP uten eksterne pakker.
 * Tar hensyn til EXIF-rotasjon i JPEG, så et stående mobilbilde regnes som stående.
 */

function jpeg(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2, width = null, height = null, orientation = 1;
  while (i + 4 <= buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    if (marker === 0xff) { i++; continue; }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) { i += 2; continue; }
    if (marker === 0xd9 || marker === 0xda) break; // slutt / bildedata
    const len = buf.readUInt16BE(i + 2);
    if (len < 2) break;
    if (marker === 0xe1 && buf.toString('latin1', i + 4, i + 10) === 'Exif\0\0') orientation = exifOrientation(buf.subarray(i + 10, i + 2 + len)) || orientation;
    const sof = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (sof && i + 9 <= buf.length) {
      height = buf.readUInt16BE(i + 5);
      width = buf.readUInt16BE(i + 7);
      if (orientation !== 1 || buf.length < 65536) break; // EXIF kommer alltid før SOF
    }
    i += 2 + len;
  }
  if (!width || !height) return null;
  return orientation >= 5 ? { width: height, height: width } : { width, height };
}

function exifOrientation(tiff) {
  if (tiff.length < 14) return null;
  const le = tiff.toString('latin1', 0, 2) === 'II';
  const u16 = (o) => (le ? tiff.readUInt16LE(o) : tiff.readUInt16BE(o));
  const u32 = (o) => (le ? tiff.readUInt32LE(o) : tiff.readUInt32BE(o));
  if (u16(2) !== 42) return null;
  const ifd = u32(4);
  if (ifd + 2 > tiff.length) return null;
  const n = u16(ifd);
  for (let k = 0; k < n; k++) {
    const e = ifd + 2 + k * 12;
    if (e + 12 > tiff.length) break;
    if (u16(e) === 0x0112) return u16(e + 8);
  }
  return null;
}

function png(buf) {
  if (buf.length < 24 || buf.toString('latin1', 1, 4) !== 'PNG') return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function webp(buf) {
  if (buf.length < 30 || buf.toString('latin1', 0, 4) !== 'RIFF' || buf.toString('latin1', 8, 12) !== 'WEBP') return null;
  const chunk = buf.toString('latin1', 12, 16);
  if (chunk === 'VP8 ') return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  if (chunk === 'VP8L') {
    const b = buf.readUInt32LE(21);
    return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
  }
  if (chunk === 'VP8X') return { width: buf.readUIntLE(24, 3) + 1, height: buf.readUIntLE(27, 3) + 1 };
  return null;
}

/** @returns {{width:number,height:number}|null} */
function imageSize(buf) {
  if (!Buffer.isBuffer(buf)) return null;
  const dim = jpeg(buf) || png(buf) || webp(buf);
  return dim && dim.width > 0 && dim.height > 0 ? dim : null;
}

/** Velg det av de tillatte sideforholdene («3:4», «16:9» …) som ligner mest på bildet. */
function nearestAspect(width, height, allowed) {
  if (!width || !height || !allowed.length) return null;
  const target = Math.log(width / height);
  let best = null, bestDiff = Infinity;
  for (const a of allowed) {
    const [w, h] = a.split(':').map(Number);
    if (!w || !h) continue;
    const diff = Math.abs(Math.log(w / h) - target);
    if (diff < bestDiff) { best = a; bestDiff = diff; }
  }
  return best;
}

module.exports = { imageSize, nearestAspect };
