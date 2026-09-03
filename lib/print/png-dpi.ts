// CRC32 for the pHYs chunk we inject below — canvas pixel dimensions are sized
// correctly for a given DPI at each paper format, but a PNG with no pHYs chunk
// carries no DPI metadata at all: print software that doesn't assume the exact
// paper size has no way to know the file is e.g. "300 DPI".
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint32BE(value: number, out: Uint8Array, offset: number) {
  out[offset] = (value >>> 24) & 0xff;
  out[offset + 1] = (value >>> 16) & 0xff;
  out[offset + 2] = (value >>> 8) & 0xff;
  out[offset + 3] = value & 0xff;
}

/** Inserts a pHYs chunk (pixels-per-meter, both axes) right after IHDR. */
export function embedPngDpi(dataUrl: string, dpi: number): string {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  // PNG signature (8 bytes) + IHDR chunk: 4-byte length + 4-byte type "IHDR" +
  // 13 bytes of data + 4-byte CRC = 25 bytes, so IHDR always ends at offset 33.
  const ihdrEnd = 33;

  const pxPerMeter = Math.round(dpi / 0.0254);
  const chunkData = new Uint8Array(9);
  writeUint32BE(pxPerMeter, chunkData, 0);
  writeUint32BE(pxPerMeter, chunkData, 4);
  chunkData[8] = 1; // unit specifier: 1 = meter

  const type = new Uint8Array([0x70, 0x48, 0x59, 0x73]); // "pHYs"
  const crcInput = new Uint8Array(type.length + chunkData.length);
  crcInput.set(type, 0);
  crcInput.set(chunkData, type.length);
  const crc = crc32(crcInput);

  const chunk = new Uint8Array(4 + 4 + 9 + 4);
  writeUint32BE(9, chunk, 0);
  chunk.set(type, 4);
  chunk.set(chunkData, 8);
  writeUint32BE(crc, chunk, 17);

  const result = new Uint8Array(bytes.length + chunk.length);
  result.set(bytes.subarray(0, ihdrEnd), 0);
  result.set(chunk, ihdrEnd);
  result.set(bytes.subarray(ihdrEnd), ihdrEnd + chunk.length);

  let out = "";
  for (let i = 0; i < result.length; i++) out += String.fromCharCode(result[i]);
  return `data:image/png;base64,${btoa(out)}`;
}
