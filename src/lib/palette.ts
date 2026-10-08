/** Curated category colours (soft tint + readable text), so nobody has to pick two clashing hex values by hand. */
export const PALETTE = [
  { name: 'Gray', bg: '#e9e9e7', fg: '#37352f' },
  { name: 'Brown', bg: '#eee0da', fg: '#603b2c' },
  { name: 'Orange', bg: '#fadec9', fg: '#8b4c1a' },
  { name: 'Yellow', bg: '#fbf3db', fg: '#7a5b00' },
  { name: 'Green', bg: '#dbeddb', fg: '#1c5a36' },
  { name: 'Blue', bg: '#d3e5ef', fg: '#1a4e73' },
  { name: 'Purple', bg: '#e8deee', fg: '#4f2f78' },
  { name: 'Pink', bg: '#f5e0e9', fg: '#8a2c5a' },
  { name: 'Red', bg: '#ffe2dd', fg: '#9c2a1c' },
] as const;

/** Readable text colour for any background (WCAG relative luminance), used for custom colours. */
export function readableOn(hex: string) {
  const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16);
  const lin = (c: number) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return L > 0.4 ? '#1f1e1b' : '#ffffff';
}
