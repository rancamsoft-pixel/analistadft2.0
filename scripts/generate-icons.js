import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPng(width, height, r, g, b, a = 255) {
  // Simple solid color PNG with centered graph mark
  const rawData = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (width * 4 + 1);
    rawData[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      
      // Calculate coordinates relative to center
      const dx = x - width / 2;
      const dy = y - height / 2;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const radius = width * 0.45;

      // Dark futuristic background: #0b1329
      let pr = 11, pg = 19, pb = 41, pa = 255;

      // Outer circle border
      if (Math.abs(dist - radius * 0.8) < width * 0.02) {
        pr = 6; pg = 182; pb = 212; // Cyan accent
      }

      // 4 vertical bar graphics in the center
      const barWidth = width * 0.08;
      const barGap = width * 0.04;
      const startX = width / 2 - (barWidth * 2 + barGap * 1.5);

      // Bar 1
      if (x >= startX && x <= startX + barWidth && y >= height * 0.55 && y <= height * 0.75) {
        pr = 6; pg = 182; pb = 212;
      }
      // Bar 2
      const b2x = startX + barWidth + barGap;
      if (x >= b2x && x <= b2x + barWidth && y >= height * 0.45 && y <= height * 0.75) {
        pr = 34; pg = 211; pb = 238;
      }
      // Bar 3
      const b3x = b2x + barWidth + barGap;
      if (x >= b3x && x <= b3x + barWidth && y >= height * 0.35 && y <= height * 0.75) {
        pr = 192; pg = 132; pb = 252;
      }
      // Bar 4
      const b4x = b3x + barWidth + barGap;
      if (x >= b4x && x <= b4x + barWidth && y >= height * 0.25 && y <= height * 0.75) {
        pr = 16; pg = 185; pb = 129;
      }

      rawData[pixelOffset] = pr;
      rawData[pixelOffset + 1] = pg;
      rawData[pixelOffset + 2] = pb;
      rawData[pixelOffset + 3] = pa;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: RGBA (6)
  ihdr[10] = 0; // Compression: 0
  ihdr[11] = 0; // Filter: 0
  ihdr[12] = 0; // Interlace: 0

  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', deflated);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(crcData);

  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal >>> 0, 0);

  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }

  let crc = 0 ^ -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate 192x192 PNG
const png192 = createPng(192, 192, 6, 182, 212);
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), png192);

// Generate 512x512 PNG
const png512 = createPng(512, 512, 6, 182, 212);
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), png512);

// Generate apple-touch-icon.png (180x180)
const appleIcon = createPng(180, 180, 6, 182, 212);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleIcon);

// Copy favicon.ico (using 192)
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), png192);

console.log('✅ Iconos PWA generados con éxito en /public');
