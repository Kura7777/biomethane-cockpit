import { describe, it, expect } from 'vitest';
import zlib from 'zlib';
import { extractPdfText, PdfReadError, PDF_MAX_INPUT_BYTES } from '../pdfReader';

const toBuf = (s: string | Buffer): ArrayBuffer => {
  const b = typeof s === 'string' ? Buffer.from(s, 'latin1') : s;
  const u = new Uint8Array(b.length);
  u.set(b);
  return u.buffer;
};

const pdf = (objs: string[]): string => `%PDF-1.4\n${objs.join('\n')}\n%%EOF`;
const stream = (content: string, dict = ''): string => `<< /Length ${content.length} ${dict} >>\nstream\n${content}\nendstream`;

async function failure(buf: ArrayBuffer): Promise<PdfReadError> {
  try { await extractPdfText(buf); } catch (e) { return e as PdfReadError; }
  throw new Error('expected a PdfReadError');
}

describe('pdfReader audit fixes', () => {
  it('keeps text operators in stream order (Tj, TJ, Tj)', async () => {
    const c = 'BT (A) Tj [(B) -200 (C)] TJ (D) Tj ET';
    const text = await extractPdfText(toBuf(pdf([`1 0 obj\n${stream(c)}\nendobj`])));
    expect(text.replace(/\s+/g, '')).toBe('ABCD');
    expect(text.indexOf('A')).toBeLessThan(text.indexOf('B'));
    expect(text.indexOf('C')).toBeLessThan(text.indexOf('D'));
  });

  it('breaks lines on Td with a vertical move, so a label stays next to its own value', async () => {
    const c = 'BT 10 700 Td (Carbon intensity) Tj 100 0 Td (-42.1) Tj -100 -14 Td (Country) Tj 100 0 Td (ES) Tj ET';
    const text = await extractPdfText(toBuf(pdf([`1 0 obj\n${stream(c)}\nendobj`])));
    expect(text.split('\n')).toEqual(['Carbon intensity -42.1', 'Country ES']);
  });

  it('resolves an indirect /Length reference', async () => {
    const c = 'BT (Indirect length certificate) Tj ET';
    const body = pdf([
      `4 0 obj\n<< /Length 9 0 R >>\nstream\n${c}\nendstream\nendobj`,
      `9 0 obj\n${c.length}\nendobj`,
    ]);
    expect(await extractPdfText(toBuf(body))).toBe('Indirect length certificate');
  });

  it('survives a wrong /Length by scanning to endstream', async () => {
    const c = 'BT (Wrong length is fine) Tj ET';
    const body = pdf([`1 0 obj\n<< /Length 3 >>\nstream\n${c}\nendstream\nendobj`]);
    expect(await extractPdfText(toBuf(body))).toBe('Wrong length is fine');
  });

  it('refuses an encrypted PDF with a paste-the-text message', async () => {
    const body = pdf([`1 0 obj\n${stream('BT (x) Tj ET')}\nendobj`, 'trailer\n<< /Encrypt 5 0 R /Root 1 0 R >>']);
    const err = await failure(toBuf(body));
    expect(err).toBeInstanceOf(PdfReadError);
    expect(err.code).toBe('ENCRYPTED');
    expect(err.message).toMatch(/Paste the text/);
  });

  it('refuses a CID font with no ToUnicode map instead of returning garbage', async () => {
    const body = pdf([
      '5 0 obj\n<< /Type /Font /Subtype /Type0 /Encoding /Identity-H /BaseFont /ABC >>\nendobj',
      `1 0 obj\n${stream('BT <00480049> Tj ET')}\nendobj`,
    ]);
    const err = await failure(toBuf(body));
    expect(err.code).toBe('CID_FONTS');
  });

  it('decodes a CID font through its ToUnicode map', async () => {
    const cmap = 'beginbfchar\n<0001> <0048>\n<0002> <0069>\nendbfchar';
    const body = pdf([
      '5 0 obj\n<< /Type /Font /Subtype /Type0 /Encoding /Identity-H /ToUnicode 6 0 R >>\nendobj',
      `6 0 obj\n${stream(cmap)}\nendobj`,
      `1 0 obj\n${stream('BT <00010002> Tj ET')}\nendobj`,
    ]);
    expect(await extractPdfText(toBuf(body))).toBe('Hi');
  });

  it('refuses a scanned (image-only) PDF', async () => {
    const body = pdf([`7 0 obj\n<< /Subtype /Image /Width 10 /Height 10 /Filter /DCTDecode /Length 4 >>\nstream\nJFIF\nendstream\nendobj`]);
    const err = await failure(toBuf(body));
    expect(err.code).toBe('NO_TEXT');
    expect(err.message).toMatch(/scanned|image/);
  });

  it('refuses plain text that is not a PDF, and oversized input', async () => {
    expect((await failure(toBuf('just some pasted text without structure'))).code).toBe('NOT_A_PDF');
    const big = new ArrayBuffer(PDF_MAX_INPUT_BYTES + 1);
    expect((await failure(big)).code).toBe('TOO_LARGE');
  });

  it('refuses a decompression bomb instead of inflating it', async () => {
    const bomb = zlib.deflateSync(Buffer.alloc(40 * 1024 * 1024, 0x20));
    const head = Buffer.from(`%PDF-1.7\n1 0 obj\n<< /Filter /FlateDecode /Length ${bomb.length} >>\nstream\n`, 'latin1');
    const tail = Buffer.from('\nendstream\nendobj\n%%EOF', 'latin1');
    const err = await failure(toBuf(Buffer.concat([head, bomb, tail])));
    expect(err).toBeInstanceOf(PdfReadError);
    expect(['NO_TEXT', 'TOO_LARGE']).toContain(err.code);
  });

  it('refuses output that is mostly unreadable symbols', async () => {
    const junk = Array.from({ length: 12 }, (_, i) => String.fromCharCode(92) + '0' + (i + 1).toString(8).padStart(2, '0')).join('');
    const body = pdf([`1 0 obj\n${stream(`BT (${junk}) Tj ET`)}\nendobj`]);
    expect((await failure(toBuf(body))).code).toBe('UNRELIABLE');
  });
});
