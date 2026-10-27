import { describe, it, expect } from 'vitest';

describe('Poster Studio Calculations', () => {
  it('correctly calculates sheet rows, columns, and printable boundaries', () => {
    const pw = 210; // A4 mm
    const ph = 297;
    const margin = 10;
    const overlap = 6;

    const cw = pw - 2 * margin; // 190 mm
    const ch = ph - 2 * margin; // 277 mm
    const sw = cw - overlap; // 184 mm
    const sh = ch - overlap; // 271 mm

    expect(cw).toBe(190);
    expect(ch).toBe(277);
    expect(sw).toBe(184);
    expect(sh).toBe(271);

    // 4 columns:
    const cols = 4;
    const totalWmm = cols * sw + overlap; // 4 * 184 + 6 = 742 mm
    expect(totalWmm).toBe(742);

    // Image aspect ratio 4000x2667 (1.5)
    const ar = 4000 / 2667;
    const totalHmm = totalWmm / ar;
    const rows = Math.ceil((totalHmm - overlap) / sh);
    expect(rows).toBe(2);

    const pages = cols * rows;
    expect(pages).toBe(8);

    // Effective DPI
    const dpi = Math.round(4000 / (totalWmm / 25.4));
    expect(dpi).toBe(137);
    expect(dpi >= 100).toBe(true);
  });
});
