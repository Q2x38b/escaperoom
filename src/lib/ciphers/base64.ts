/**
 * Base64 encoding/decoding utilities
 */

export function base64Encode(text: string): string {
  try {
    return btoa(text);
  } catch {
    return '';
  }
}

export function base64Decode(encoded: string): string {
  try {
    return atob(encoded);
  } catch {
    return 'Invalid Base64';
  }
}

export function isValidBase64(str: string): boolean {
  try {
    atob(str);
    return true;
  } catch {
    return false;
  }
}
