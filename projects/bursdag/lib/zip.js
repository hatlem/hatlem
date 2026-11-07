'use strict';

/**
 * Minimal zip-skriver (uten komprimering – video og bilder er allerede komprimert).
 * Strømmer filene rett til responsen, så minnebruken holder seg lav selv med mye video.
 */

const fs = require('fs');

const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});

function crc32Update(crc, buf) {
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return crc;
}

async function crcOfFile(file) {
  let crc = -1;
  for await (const chunk of fs.createReadStream(file)) crc = crc32Update(crc, chunk);
  return (crc ^ -1) >>> 0;
}

function dosTime(d) {
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
    date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

/**
 * @param {import('stream').Writable} out
 * @param {{ name: string, file?: string, data?: Buffer, date?: Date }[]} entries
 */
async function writeZip(out, entries) {
  const write = (buf) => new Promise((resolve) => (out.write(buf) ? resolve() : out.once('drain', resolve)));
  const central = [];
  let offset = 0;

  for (const e of entries) {
    const name = Buffer.from(e.name, 'utf8');
    const size = e.data ? e.data.length : fs.statSync(e.file).size;
    const crc = e.data ? (crc32Update(-1, e.data) ^ -1) >>> 0 : await crcOfFile(e.file);
    const { time, date } = dosTime(e.date || new Date());

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // versjon
    local.writeUInt16LE(0x0800, 6); // UTF-8-filnavn
    local.writeUInt16LE(0, 8); // ingen komprimering
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(size, 18);
    local.writeUInt32LE(size, 22);
    local.writeUInt16LE(name.length, 26);
    await write(local);
    await write(name);
    if (e.data) await write(e.data);
    else for await (const chunk of fs.createReadStream(e.file)) await write(chunk);

    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0);
    c.writeUInt16LE(20, 4);
    c.writeUInt16LE(20, 6);
    c.writeUInt16LE(0x0800, 8);
    c.writeUInt16LE(0, 10);
    c.writeUInt16LE(time, 12);
    c.writeUInt16LE(date, 14);
    c.writeUInt32LE(crc, 16);
    c.writeUInt32LE(size, 20);
    c.writeUInt32LE(size, 24);
    c.writeUInt16LE(name.length, 28);
    c.writeUInt32LE(offset, 42);
    central.push(Buffer.concat([c, name]));
    offset += 30 + name.length + size;
  }

  const dir = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(central.length, 8);
  end.writeUInt16LE(central.length, 10);
  end.writeUInt32LE(dir.length, 12);
  end.writeUInt32LE(offset, 16);
  await write(dir);
  await write(end);
  out.end();
}

module.exports = { writeZip };
