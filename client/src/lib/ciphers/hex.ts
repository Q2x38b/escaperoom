/**
 * Hexadecimal encoding/decoding utilities
 */

export function hexEncode(text: string): string {
  return Array.from(text)
    .map((c) => c.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase())
    .join(' ');
}

export function hexDecode(hex: string): string {
  try {
    // Remove spaces and split into pairs
    const cleanHex = hex.replace(/\s+/g, '');
    const pairs = cleanHex.match(/.{1,2}/g);

    if (!pairs) return 'Invalid Hex';

    return pairs
      .map((pair) => {
        const code = parseInt(pair, 16);
        if (isNaN(code)) return '?';
        return String.fromCharCode(code);
      })
      .join('');
  } catch {
    return 'Invalid Hex';
  }
}

export function isValidHex(str: string): boolean {
  const cleanHex = str.replace(/\s+/g, '');
  return /^[0-9A-Fa-f]+$/.test(cleanHex) && cleanHex.length % 2 === 0;
}
