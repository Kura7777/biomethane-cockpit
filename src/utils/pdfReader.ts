/**
 * Client-Side PDF Text Extractor
 *
 * Extracts text from modern PDF files in the browser by locating content streams,
 * decompressing FlateDecode (zlib) streams using the Web Stream Decompression API,
 * and parsing standard PDF text operators (Tj, TJ, hex strings, escaped literals).
 */

/** Decodes PDF octal and standard escape characters in string literals */
function decodePdfLiteral(str: string): string {
  return str
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\b/g, '\b')
    .replace(/\\f/g, '\f')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\');
}

/** Decodes a PDF hex string e.g. <49534343> -> "ISCC" */
function decodePdfHex(hex: string): string {
  const clean = hex.replace(/\s+/g, '');
  let out = '';
  for (let i = 0; i < clean.length; i += 2) {
    const pair = clean.slice(i, i + 2);
    if (pair.length === 2) {
      out += String.fromCharCode(parseInt(pair, 16));
    }
  }
  return out;
}

/** Extracts text from decoded PDF content stream commands */
function parseContentStream(streamText: string): string {
  const chunks: string[] = [];

  // Match Tj string literals: (Text here) Tj
  const tjRegex = /\(((?:[^()\\]|\\.)*)\)\s*(?:Tj|'|")/g;
  let match: RegExpExecArray | null;
  while ((match = tjRegex.exec(streamText)) !== null) {
    const decoded = decodePdfLiteral(match[1]);
    if (decoded.trim()) chunks.push(decoded);
  }

  // Match TJ arrays: [(chunk1) -120 (chunk2)] TJ
  const tjArrayRegex = /\[((?:[^[\]\\]|\\.)*)\]\s*TJ/g;
  while ((match = tjArrayRegex.exec(streamText)) !== null) {
    const arrayContent = match[1];
    const subStringRegex = /\(((?:[^()\\]|\\.)*)\)|(-?\d+(?:\.\d+)?)/g;
    let subMatch: RegExpExecArray | null;
    let line = '';
    while ((subMatch = subStringRegex.exec(arrayContent)) !== null) {
      if (subMatch[1] !== undefined) {
        line += decodePdfLiteral(subMatch[1]);
      } else if (subMatch[2] !== undefined) {
        const offset = parseFloat(subMatch[2]);
        // A significant negative kerning offset indicates a word space
        if (offset < -150 && line && !line.endsWith(' ')) {
          line += ' ';
        }
      }
    }
    if (line.trim()) chunks.push(line);
  }

  // Match hex string operators: <49534343> Tj
  const hexRegex = /<([0-9A-Fa-f\s]+)>\s*(?:Tj|'|")/g;
  while ((match = hexRegex.exec(streamText)) !== null) {
    const decoded = decodePdfHex(match[1]);
    if (decoded.trim()) chunks.push(decoded);
  }

  return chunks.join(' ');
}

/** Decompresses a raw Uint8Array using browser DecompressionStream */
async function decompressFlate(data: Uint8Array): Promise<Uint8Array | null> {
  if (typeof DecompressionStream === 'undefined') return null;

  // Try standard zlib deflate (RFC 1950)
  try {
    const ds = new DecompressionStream('deflate');
    const stream = new Blob([data]).stream().pipeThrough(ds);
    const buf = await new Response(stream).arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    // Fall back to deflate-raw (skipping 2-byte header and 4-byte checksum if present)
    try {
      const rawSlice = data.length > 6 && data[0] === 0x78 ? data.subarray(2, data.length - 4) : data;
      const dsRaw = new DecompressionStream('deflate-raw');
      const streamRaw = new Blob([rawSlice]).stream().pipeThrough(dsRaw);
      const bufRaw = await new Response(streamRaw).arrayBuffer();
      return new Uint8Array(bufRaw);
    } catch {
      return null;
    }
  }
}

/** Fallback ASCII scanner when decompression is unavailable or streams are missing */
function scanAsciiFallback(bytes: Uint8Array): string {
  let text = '';
  let currentChunk = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if ((b >= 32 && b <= 126) || b === 10 || b === 13 || b === 9) {
      currentChunk += String.fromCharCode(b);
    } else {
      if (currentChunk.length >= 4) {
        text += currentChunk + ' ';
      }
      currentChunk = '';
    }
  }
  if (currentChunk.length >= 4) text += currentChunk;
  return text;
}

/**
 * Extracts plain text from a PDF ArrayBuffer.
 * Handles FlateDecode compressed streams, uncompressed content streams, and falls back gracefully.
 */
export async function extractPdfText(buffer: ArrayBuffer, maxChars = 40000): Promise<string> {
  const bytes = new Uint8Array(buffer);
  const textDecoder = new TextDecoder('latin1');
  const rawString = textDecoder.decode(bytes);

  // Locate all stream blocks
  const streamPattern = /stream\r?\n/g;
  let match: RegExpExecArray | null;
  const extractedSections: string[] = [];

  while ((match = streamPattern.exec(rawString)) !== null) {
    const streamStartIdx = match.index + match[0].length;
    const dictSlice = rawString.slice(Math.max(0, match.index - 400), match.index);

    // Check for exact /Length
    const lenMatch = dictSlice.match(/\/Length\s+(\d+)/);
    let streamEndIdx: number;

    if (lenMatch) {
      const exactLen = parseInt(lenMatch[1], 10);
      streamEndIdx = Math.min(bytes.length, streamStartIdx + exactLen);
    } else {
      const endMarker = rawString.indexOf('endstream', streamStartIdx);
      if (endMarker === -1) continue;
      // Strip trailing \r\n before endstream
      streamEndIdx = endMarker;
      while (streamEndIdx > streamStartIdx && (bytes[streamEndIdx - 1] === 10 || bytes[streamEndIdx - 1] === 13)) {
        streamEndIdx--;
      }
    }

    if (streamStartIdx >= streamEndIdx) continue;

    const isFlate = /Filter\s*(\/\s*FlateDecode|\[[\s\S]*?FlateDecode[\s\S]*?\])/i.test(dictSlice);
    const streamData = bytes.subarray(streamStartIdx, streamEndIdx);

    if (isFlate) {
      const decompressed = await decompressFlate(streamData);
      if (decompressed) {
        const decompressedStr = textDecoder.decode(decompressed);
        const parsed = parseContentStream(decompressedStr);
        if (parsed.trim()) extractedSections.push(parsed);
      }
    } else {
      // Uncompressed stream
      const rawStreamStr = textDecoder.decode(streamData);
      const parsed = parseContentStream(rawStreamStr);
      if (parsed.trim()) extractedSections.push(parsed);
    }
  }

  let fullText = extractedSections.join('\n\n').trim();

  // If stream decoding yielded nothing, fall back to ASCII extraction
  if (!fullText) {
    fullText = scanAsciiFallback(bytes);
  }

  // Normalize whitespaces and enforce length ceiling
  const cleaned = fullText
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim()
    .slice(0, maxChars);

  return cleaned;
}
