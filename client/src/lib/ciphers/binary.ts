/**
 * Binary encoding/decoding utilities
 */

export function binaryEncode(text: string): string {
  return Array.from(text)
    .map((c) => c.charCodeAt(0).toString(2).padStart(8, '0'))
    .join(' ');
}

export function binaryDecode(binary: string): string {
  try {
    // Split by spaces or every 8 characters
    const groups = binary.includes(' ')
      ? binary.split(/\s+/)
      : binary.match(/.{1,8}/g);

    if (!groups) return 'Invalid Binary';

    return groups
      .filter((g) => g.length > 0)
      .map((group) => {
        const code = parseInt(group, 2);
        if (isNaN(code) || code > 255) return '?';
        return String.fromCharCode(code);
      })
      .join('');
  } catch {
    return 'Invalid Binary';
  }
}

export function isValidBinary(str: string): boolean {
  const cleanBinary = str.replace(/\s+/g, '');
  return /^[01]+$/.test(cleanBinary);
}
