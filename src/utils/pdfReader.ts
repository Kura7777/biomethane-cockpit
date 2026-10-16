/**
 * Client-side PDF text extractor.
 *
 * Reads the text operators of each page content stream IN STREAM ORDER (so labels and values stay
 * together), decompresses FlateDecode streams with a size cap, and decodes CID fonts only through their
 * ToUnicode map. When the file cannot be read reliably (encrypted, scanned/image-only, CID fonts with no
 * usable ToUnicode map, oversized, or output that is mostly garbage) it throws a PdfReadError telling the
 * trader to paste the text instead of handing the model something that only looks like a document.
 */

/** Largest PDF accepted (bytes). */
export const PDF_MAX_INPUT_BYTES = 15 * 1024 * 1024;
/** Largest decompressed size of one stream (bytes). */
export const PDF_MAX_STREAM_BYTES = 8 * 1024 * 1024;
/** Largest total decompressed size over the whole file (bytes). */
export const PDF_MAX_TOTAL_BYTES = 32 * 1024 * 1024;

export type PdfReadErrorCode = 'TOO_LARGE' | 'ENCRYPTED' | 'CID_FONTS' | 'NO_TEXT' | 'UNRELIABLE' | 'NOT_A_PDF';

export class PdfReadError extends Error {
  code: PdfReadErrorCode;
  constructor(code: PdfReadErrorCode, detail: string) {
    super(`Can't read this PDF reliably (${detail}). Paste the text of the document instead.`);
    this.name = 'PdfReadError';
    this.code = code;
  }
}

// ── String decoding ─────────────────────────────────────────────────────────

/** Raw bytes of a PDF literal string body (escapes resolved), as a latin1 string. */
function decodeLiteralBody(body: string): string {
  let out = '';
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c !== '\\') { out += c; continue; }
    const n = body[++i];
    if (n === undefined) break;
    if (n >= '0' && n <= '7') {
      let oct = n;
      while (oct.length < 3 && body[i + 1] >= '0' && body[i + 1] <= '7') oct += body[++i];
      out += String.fromCharCode(parseInt(oct, 8) & 0xff);
    } else if (n === 'n') out += '\n';
    else if (n === 'r') out += '\r';
    else if (n === 't') out += '\t';
    else if (n === 'b') out += '\b';
    else if (n === 'f') out += '\f';
    else if (n === '\r') { if (body[i + 1] === '\n') i++; } // line continuation
    else if (n === '\n') { /* line continuation */ }
    else out += n; // \( \) \\ and unknown escapes
  }
  return out;
}

function hexToBytes(hex: string): string {
  let clean = hex.replace(/\s+/g, '');
  if (clean.length % 2 === 1) clean += '0';
  let out = '';
  for (let i = 0; i < clean.length; i += 2) out += String.fromCharCode(parseInt(clean.slice(i, i + 2), 16));
  return out;
}

/** Bytes of a text string to readable text: UTF-16BE when it carries a BOM, else latin1. */
function bytesToText(raw: string): string {
  if (raw.length >= 2 && raw.charCodeAt(0) === 0xfe && raw.charCodeAt(1) === 0xff) {
    let out = '';
    for (let i = 2; i + 1 < raw.length; i += 2) out += String.fromCharCode((raw.charCodeAt(i) << 8) | raw.charCodeAt(i + 1));
    return out;
  }
  return raw;
}

// ── ToUnicode maps (CID fonts) ──────────────────────────────────────────────

interface CidMap {
  /** Hex digits per source code (2 = one byte, 4 = two bytes). */
  width: number;
  map: Map<number, string>;
  /** The same code maps to different text in different fonts: a merged map would be wrong. */
  conflict: boolean;
}

function utf16HexToText(hex: string): string {
  let out = '';
  for (let i = 0; i + 3 < hex.length + 1; i += 4) {
    const unit = parseInt(hex.slice(i, i + 4), 16);
    if (Number.isFinite(unit)) out += String.fromCharCode(unit);
  }
  return out;
}

function parseToUnicode(text: string, into: CidMap): void {
  const set = (code: number, value: string) => {
    const prev = into.map.get(code);
    if (prev !== undefined && prev !== value) into.conflict = true;
    into.map.set(code, value);
  };
  for (const block of text.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const m of block[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
      into.width = Math.max(into.width, m[1].length);
      set(parseInt(m[1], 16), utf16HexToText(m[2]));
    }
  }
  for (const block of text.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const m of block[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*(<[0-9A-Fa-f]+>|\[[^\]]*\])/g)) {
      into.width = Math.max(into.width, m[1].length);
      const lo = parseInt(m[1], 16);
      const hi = parseInt(m[2], 16);
      if (!(hi >= lo) || hi - lo > 65535) continue;
      if (m[3].startsWith('[')) {
        const items = [...m[3].matchAll(/<([0-9A-Fa-f]+)>/g)].map(x => utf16HexToText(x[1]));
        for (let c = lo; c <= hi && c - lo < items.length; c++) set(c, items[c - lo]);
      } else {
        const start = utf16HexToText(m[3].slice(1, -1));
        for (let c = lo; c <= hi; c++) {
          const last = start.charCodeAt(start.length - 1) + (c - lo);
          set(c, start.slice(0, -1) + String.fromCharCode(last));
        }
      }
    }
  }
}

// ── Content-stream tokenizer (operators in stream order) ────────────────────

type Operand = { t: 's'; v: string; hex: boolean } | { t: 'n'; v: number } | { t: 'a'; items: Operand[] } | { t: 'x' };

const WS = /[\s\0]/;
const DELIM = /[\s\0()<>[\]{}/%]/;

class TextOut {
  text = '';
  unmapped = 0;
  private lastY: number | null = null;
  newline() { if (this.text && !this.text.endsWith('\n')) this.text += '\n'; }
  space() { if (this.text && !/[\s]$/.test(this.text)) this.text += ' '; }
  add(s: string) { this.text += s; }
  y(v: number) {
    if (this.lastY !== null && v !== this.lastY) this.newline(); else this.space();
    this.lastY = v;
  }
}

function showString(op: Operand, out: TextOut, cid: CidMap | null) {
  if (op.t !== 's') return;
  if (op.hex && cid && !cid.conflict && cid.map.size > 0 && op.v.length % (cid.width / 2) === 0) {
    const bytes = cid.width / 2;
    for (let i = 0; i < op.v.length; i += bytes) {
      let code = 0;
      for (let k = 0; k < bytes; k++) code = (code << 8) | op.v.charCodeAt(i + k);
      const mapped = cid.map.get(code);
      if (mapped === undefined) out.unmapped++; else out.add(mapped);
    }
    return;
  }
  out.add(bytesToText(op.v));
}

function readOperand(s: string, start: number): { op: Operand | null; next: number } {
  const c = s[start];
  if (c === '(') {
    let depth = 1;
    let i = start + 1;
    while (i < s.length && depth > 0) {
      if (s[i] === '\\') { i += 2; continue; }
      if (s[i] === '(') depth++;
      else if (s[i] === ')') depth--;
      i++;
    }
    return { op: { t: 's', v: decodeLiteralBody(s.slice(start + 1, i - 1)), hex: false }, next: i };
  }
  if (c === '<' && s[start + 1] === '<') {
    let depth = 1;
    let i = start + 2;
    while (i < s.length && depth > 0) {
      if (s[i] === '<' && s[i + 1] === '<') { depth++; i += 2; } else if (s[i] === '>' && s[i + 1] === '>') { depth--; i += 2; } else i++;
    }
    return { op: { t: 'x' }, next: i };
  }
  if (c === '<') {
    const end = s.indexOf('>', start);
    if (end === -1) return { op: null, next: s.length };
    return { op: { t: 's', v: hexToBytes(s.slice(start + 1, end)), hex: true }, next: end + 1 };
  }
  return { op: null, next: start + 1 };
}

function extractFromContent(s: string, cid: CidMap | null, out: TextOut): void {
  let operands: Operand[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (WS.test(c)) { i++; continue; }
    if (c === '%') { const e = s.indexOf('\n', i); i = e === -1 ? s.length : e + 1; continue; }
    if (c === '(' || c === '<') {
      const r = readOperand(s, i);
      if (r.op) operands.push(r.op);
      i = r.next;
      continue;
    }
    if (c === '[') {
      const items: Operand[] = [];
      i++;
      while (i < s.length && s[i] !== ']') {
        if (WS.test(s[i])) { i++; continue; }
        if (s[i] === '(' || s[i] === '<') {
          const r = readOperand(s, i);
          if (r.op) items.push(r.op);
          i = r.next;
        } else {
          let j = i;
          while (j < s.length && !DELIM.test(s[j])) j++;
          if (j === i) j = i + 1;
          const n = Number(s.slice(i, j));
          if (Number.isFinite(n)) items.push({ t: 'n', v: n });
          i = j;
        }
      }
      i++;
      operands.push({ t: 'a', items });
      continue;
    }
    if (c === '/') {
      let j = i + 1;
      while (j < s.length && !DELIM.test(s[j])) j++;
      operands.push({ t: 'x' });
      i = j;
      continue;
    }
    if (c === ']' || c === ')' || c === '>' || c === '{' || c === '}') { i++; continue; }
    let j = i;
    while (j < s.length && !DELIM.test(s[j])) j++;
    const word = s.slice(i, j);
    i = j;
    if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(word)) { operands.push({ t: 'n', v: Number(word) }); continue; }
    // An operator: act on it, then clear the operand stack.
    const last = operands[operands.length - 1];
    switch (word) {
      case 'Tj': if (last) showString(last, out, cid); break;
      case "'": out.newline(); if (last) showString(last, out, cid); break;
      case '"': out.newline(); if (last) showString(last, out, cid); break;
      case 'TJ':
        if (last?.t === 'a') {
          for (const item of last.items) {
            if (item.t === 's') showString(item, out, cid);
            else if (item.t === 'n' && item.v < -150) out.space();
          }
        }
        break;
      case 'Td': case 'TD': {
        const tx = operands[operands.length - 2];
        const ty = operands[operands.length - 1];
        if (ty?.t === 'n' && ty.v !== 0) out.newline();
        else if (tx?.t === 'n' && tx.v !== 0) out.space();
        break;
      }
      case 'Tm': {
        const y = operands[operands.length - 1];
        if (y?.t === 'n') out.y(y.v);
        break;
      }
      case 'T*': out.newline(); break;
      case 'ET': out.newline(); break;
      case 'ID': {
        // Inline image data: skip to the EI marker.
        const e = s.indexOf('EI', i);
        i = e === -1 ? s.length : e + 2;
        break;
      }
      default: break;
    }
    operands = [];
  }
}

// ── Decompression with caps ─────────────────────────────────────────────────

async function inflate(data: Uint8Array, format: 'deflate' | 'deflate-raw', cap: number): Promise<Uint8Array | null> {
  if (typeof DecompressionStream === 'undefined') return null;
  try {
    const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream(format));
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > cap) { await reader.cancel(); return null; }
      chunks.push(value);
    }
    const out = new Uint8Array(total);
    let off = 0;
    for (const ch of chunks) { out.set(ch, off); off += ch.length; }
    return out;
  } catch {
    return null;
  }
}

async function decompressFlate(data: Uint8Array, cap: number): Promise<Uint8Array | null> {
  const whole = await inflate(data, 'deflate', cap);
  if (whole) return whole;
  const rawSlice = data.length > 6 && data[0] === 0x78 ? data.subarray(2, data.length - 4) : data;
  return inflate(rawSlice, 'deflate-raw', cap);
}

// ── Stream location ─────────────────────────────────────────────────────────

interface RawStream {
  dict: string;
  data: Uint8Array;
}

/** Resolves /Length N (direct) or /Length N G R (indirect, looked up in the file); null when unknown. */
function resolveLength(dict: string, raw: string): number | null {
  const m = dict.match(/\/Length\s+(\d+)(?:\s+(\d+)\s+R)?/);
  if (!m) return null;
  if (!m[2]) return parseInt(m[1], 10);
  const obj = new RegExp(`(?:^|[\\s>])${m[1]}\\s+${m[2]}\\s+obj\\s*(\\d+)\\s*endobj`).exec(raw);
  return obj ? parseInt(obj[1], 10) : null;
}

function findStreams(bytes: Uint8Array, raw: string): RawStream[] {
  const streams: RawStream[] = [];
  const pattern = /(?<!end)stream(?:\r\n|\n|\r)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(raw)) !== null) {
    const start = match.index + match[0].length;
    const objIdx = raw.lastIndexOf(' obj', match.index);
    const dict = raw.slice(objIdx === -1 ? Math.max(0, match.index - 600) : objIdx, match.index);
    let end: number | null = null;
    const len = resolveLength(dict, raw);
    if (len !== null && start + len <= bytes.length && /^\s*endstream/.test(raw.slice(start + len, start + len + 12))) {
      end = start + len;
    }
    if (end === null) {
      const marker = raw.indexOf('endstream', start);
      if (marker === -1) continue;
      end = marker;
      if (bytes[end - 1] === 10) end--;
      if (bytes[end - 1] === 13) end--;
    }
    if (end <= start) continue;
    streams.push({ dict, data: bytes.subarray(start, end) });
    pattern.lastIndex = end;
  }
  return streams;
}

const NON_CONTENT_DICT = /\/Subtype\s*\/Image|\/Length1|\/Length2|\/ObjStm|\/XRef|\/Type\s*\/Metadata|\/FontFile|\/Subtype\s*\/Type1C|\/Subtype\s*\/CIDFontType0C|\/Subtype\s*\/OpenType/;

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Extracts plain text from a PDF. Throws PdfReadError when the file cannot be read reliably.
 * Pages are read in file order (not necessarily page order); text-position changes become line breaks.
 */
export async function extractPdfText(buffer: ArrayBuffer, maxChars = 40000): Promise<string> {
  if (buffer.byteLength > PDF_MAX_INPUT_BYTES) {
    throw new PdfReadError('TOO_LARGE', `file is larger than ${Math.round(PDF_MAX_INPUT_BYTES / 1024 / 1024)} MB`);
  }
  const bytes = new Uint8Array(buffer);
  const latin1 = new TextDecoder('latin1');
  const raw = latin1.decode(bytes);
  if (!raw.includes('%PDF-')) throw new PdfReadError('NOT_A_PDF', 'the file has no PDF header');
  if (/\/Encrypt\s*(?:<<|\d+\s+\d+\s+R)/.test(raw)) throw new PdfReadError('ENCRYPTED', 'the PDF is encrypted');

  const streams = findStreams(bytes, raw);
  const decoded: Array<{ dict: string; text: string }> = [];
  let totalBytes = 0;
  let sawUndecodable = false;
  for (const s of streams) {
    const flate = /\/FlateDecode|\/Fl\b/.test(s.dict);
    const otherFilter = /\/(LZWDecode|ASCII85Decode|ASCIIHexDecode|RunLengthDecode|DCTDecode|JPXDecode|JBIG2Decode|CCITTFaxDecode)/.test(s.dict);
    if (otherFilter) { if (!/\/Subtype\s*\/Image/.test(s.dict)) sawUndecodable = true; continue; }
    let data: Uint8Array | null = s.data;
    if (flate) {
      data = await decompressFlate(s.data, PDF_MAX_STREAM_BYTES);
      if (!data) { sawUndecodable = true; continue; }
    }
    totalBytes += data.length;
    if (totalBytes > PDF_MAX_TOTAL_BYTES) throw new PdfReadError('TOO_LARGE', 'the PDF expands to more data than the reader accepts');
    decoded.push({ dict: s.dict, text: latin1.decode(data) });
  }

  // CID fonts: detect them anywhere (including object streams) and decode only through ToUnicode.
  const searchable = [raw, ...decoded.filter(d => /\/ObjStm/.test(d.dict)).map(d => d.text)];
  const hasCidFont = searchable.some(t => /\/Subtype\s*\/Type0|\/Identity-H|\/Identity-V/.test(t));
  const cid: CidMap = { width: 0, map: new Map(), conflict: false };
  for (const d of decoded) if (/beginbf(?:char|range)/.test(d.text)) parseToUnicode(d.text, cid);
  if (hasCidFont && (cid.map.size === 0 || cid.conflict)) {
    throw new PdfReadError('CID_FONTS', cid.conflict
      ? 'it uses several embedded fonts whose character maps overlap'
      : 'it uses embedded CID fonts with no ToUnicode map');
  }

  const out = new TextOut();
  const useCid = hasCidFont ? cid : null;
  for (const d of decoded) {
    if (NON_CONTENT_DICT.test(d.dict)) continue;
    if (!/\b(?:Tj|TJ)\b/.test(d.text)) continue;
    extractFromContent(d.text, useCid, out);
    out.newline();
  }

  const cleaned = out.text
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!cleaned) {
    throw new PdfReadError('NO_TEXT', sawUndecodable || /\/Subtype\s*\/Image/.test(raw)
      ? 'it has no text layer; it looks scanned or image-only'
      : 'no text was found in it');
  }
  const visible = cleaned.replace(/\s/g, '');
  const readable = visible.replace(/[^\p{L}\p{N}.,;:%()/@&+€£$#*'"?!_=<>[\]{}|\\-]/gu, '');
  const letters = visible.replace(/[^\p{L}\p{N}]/gu, '');
  if (visible.length > 0 && (readable.length / visible.length < 0.9 || letters.length / visible.length < 0.4)) {
    throw new PdfReadError('UNRELIABLE', 'the extracted text is mostly unreadable symbols');
  }
  if (out.unmapped > 0 && out.unmapped * 5 > visible.length) {
    throw new PdfReadError('UNRELIABLE', 'many characters could not be mapped to text');
  }
  return cleaned.slice(0, maxChars);
}
