/**
 * image-convert.service.ts
 *
 * Converts images to JPEG or PNG so that pdf-lib can embed them.
 * pdf-lib only supports JPEG and PNG; WebP must be converted first.
 *
 * Uses a dynamic import for sharp to avoid ESM bundling issues.
 */

/** Detect image format by magic bytes. */
function detectFormat(buf: Buffer): 'jpeg' | 'png' | 'webp' | 'unknown' {
  if (buf.length < 12) return 'unknown';

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';

  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';

  // WebP: bytes[0..3] = RIFF (52 49 46 46) AND bytes[8..11] = WEBP (57 45 42 50)
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return 'webp';

  return 'unknown';
}

/**
 * Given a base64-encoded image string, returns a Buffer that is guaranteed
 * to be either JPEG or PNG — formats supported by pdf-lib.
 *
 * WebP images are converted to JPEG (quality 85) via sharp.
 * JPEG and PNG images are returned as-is.
 * Unknown formats throw a descriptive Error.
 */
export async function ensureJpegOrPng(base64: string): Promise<Buffer> {
  const buf = Buffer.from(base64, 'base64');
  const fmt = detectFormat(buf);

  if (fmt === 'jpeg' || fmt === 'png') {
    return buf;
  }

  if (fmt === 'webp') {
    // Dynamic import to avoid ESM bundling issues with sharp's native addon
    const { default: sharp } = await import('sharp');
    const converted = await sharp(buf).jpeg({ quality: 85 }).toBuffer();
    return converted;
  }

  throw new Error(`[image-convert] Unsupported image format (magic bytes: ${buf.slice(0, 4).toString('hex')})`);
}
