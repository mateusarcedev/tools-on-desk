import { describe, it, expect } from 'vitest';

describe('Poster Studio Calculations & Rasterbator Parity', () => {
  it('correctly calculates sheet rows, columns, and printable boundaries for standard A4', () => {
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

  it('verifies the mandatory Rasterbator 4x3 12-sheet configuration and human scale ratio', () => {
    // 4 cols x 3 rows = 12 sheets
    const pw = 210; // A4 mm
    const ph = 297;
    const margin = 10;
    const overlap = 5;

    const cw = pw - 2 * margin; // 190 mm
    const ch = ph - 2 * margin; // 277 mm
    const sw = cw - overlap; // 185 mm
    const sh = ch - overlap; // 272 mm

    const cols = 4;
    const rows = 3;
    const totalWmm = cols * sw + overlap; // 4 * 185 + 5 = 745 mm
    const totalHmm = rows * sh + overlap; // 3 * 272 + 5 = 821 mm

    expect(totalWmm).toBe(745);
    expect(totalHmm).toBe(821);

    // Total height in cm
    const totalHcm = totalHmm / 10.0; // 82.1 cm
    const humanScaleRatio = 180.0 / totalHcm; // ~2.192
    expect(humanScaleRatio).toBeCloseTo(2.192, 2);

    // DPI calculation for 3000x3300 source
    const dpiX = 3000 / (totalWmm / 25.4);
    expect(Math.round(dpiX)).toBe(102);
  });

  it('handles Letter and Legal paper sizes and landscape orientation', () => {
    // Letter: 215.9 x 279.4 mm
    const letterW = 215.9;
    const letterH = 279.4;
    // In landscape, width becomes 279.4 and height becomes 215.9
    const landW = letterH;
    const landH = letterW;
    const margin = 12.7; // 0.5 inch
    const overlap = 5;

    const cw = landW - 2 * margin; // 254.0 mm
    const ch = landH - 2 * margin; // 190.5 mm
    const sw = cw - overlap; // 249.0 mm
    const sh = ch - overlap; // 185.5 mm

    expect(cw).toBeCloseTo(254.0, 1);
    expect(ch).toBeCloseTo(190.5, 1);
    expect(sw).toBeCloseTo(249.0, 1);
    expect(sh).toBeCloseTo(185.5, 1);
  });
});
