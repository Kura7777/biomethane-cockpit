import { describe, it, expect } from 'vitest';
import zlib from 'zlib';
import { extractPdfText, PdfReadError, PDF_MAX_INPUT_BYTES } from '../pdfReader';

describe('extractPdfText', () => {
  it('extracts text from an uncompressed PDF stream', async () => {
    const streamContent = 'BT /F1 12 Tf (ISCC EU Certificate) Tj 10 0 Td [(DE-100) -250 (Facility)] TJ ET';
    const pdfData = `
%PDF-1.4
1 0 obj
<< /Length ${streamContent.length} >>
stream
${streamContent}
endstream
endobj
%%EOF
    `;
    const encoder = new TextEncoder();
    const buffer = encoder.encode(pdfData).buffer;
    const text = await extractPdfText(buffer);

    expect(text).toContain('ISCC EU Certificate');
    expect(text).toContain('DE-100 Facility');
  });

  it('extracts hex encoded PDF strings', async () => {
    // <49534343> is "ISCC"
    const streamContent = 'BT <49534343204555> Tj ET';
    const pdfData = `
%PDF-1.4
1 0 obj
<< /Length ${streamContent.length} >>
stream
${streamContent}
endstream
endobj
%%EOF
    `;
    const encoder = new TextEncoder();
    const buffer = encoder.encode(pdfData).buffer;
    const text = await extractPdfText(buffer);

    expect(text).toContain('ISCC EU');
  });

  it('extracts text from a FlateDecode (zlib-compressed) PDF stream', async () => {
    const rawStream = 'BT (Biomethane Proof of Sustainability) Tj 0 -15 Td (Feedstock: 100% Manure) Tj ET';
    const compressed = zlib.deflateSync(Buffer.from(rawStream));

    const header = Buffer.from('%PDF-1.7\n1 0 obj\n<< /Filter /FlateDecode /Length ' + compressed.length + ' >>\nstream\n');
    const footer = Buffer.from('\nendstream\nendobj\n%%EOF');
    const combined = Buffer.concat([header, compressed, footer]);

    const text = await extractPdfText(combined.buffer);
    expect(text).toContain('Biomethane Proof of Sustainability');
    expect(text).toContain('Feedstock: 100% Manure');
  });
});
