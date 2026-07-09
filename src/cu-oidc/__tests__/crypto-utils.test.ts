/**
 * Tests for the framework-agnostic crypto/encoding helpers.
 */

import { describe, expect, it } from 'vitest';
import {
  base64UrlToBytes,
  base64UrlToString,
  bytesToBase64Url,
  decodeJwtHeader,
  decodeJwtPayload,
  randomBase64Url,
  sha256Base64Url,
  splitJwt,
} from '../crypto-utils';

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

describe('base64url encoding', () => {
  it('round-trips arbitrary bytes', () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 251, 252, 253, 254, 255]);
    const encoded = bytesToBase64Url(bytes);
    expect(encoded).not.toMatch(/[+/=]/); // url-safe, unpadded
    expect(Array.from(base64UrlToBytes(encoded))).toEqual(Array.from(bytes));
  });

  it('decodes UTF-8 strings', () => {
    const original = 'héllo wörld — שלום';
    const encoded = bytesToBase64Url(new TextEncoder().encode(original));
    expect(base64UrlToString(encoded)).toBe(original);
  });

  it('tolerates standard base64 (with + / and padding) input', () => {
    // "subjects?_d" style bytes chosen to force + and / in standard base64.
    const bytes = new Uint8Array([255, 224, 255]);
    const standard = btoa(String.fromCharCode(...bytes)); // "/+D/"
    expect(Array.from(base64UrlToBytes(standard))).toEqual(Array.from(bytes));
  });
});

describe('randomBase64Url', () => {
  it('produces a 43-char string for 32 bytes (RFC 7636 verifier length)', () => {
    expect(randomBase64Url(32)).toHaveLength(43);
  });

  it('produces distinct values across calls', () => {
    const values = new Set(Array.from({ length: 20 }, () => randomBase64Url(16)));
    expect(values.size).toBe(20);
  });
});

describe('sha256Base64Url', () => {
  it('matches the known SHA-256 vector for "abc"', async () => {
    const out = await sha256Base64Url('abc');
    // SHA-256("abc") = ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad
    expect(bytesToHex(base64UrlToBytes(out))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});

describe('JWT decode', () => {
  const header = bytesToBase64Url(new TextEncoder().encode(JSON.stringify({ alg: 'RS256', kid: 'k1' })));
  const payload = bytesToBase64Url(
    new TextEncoder().encode(JSON.stringify({ sub: 'user-1', chabaduniverse: { is_shliach: true } })),
  );
  const jwt = `${header}.${payload}.sig`;

  it('splits a compact JWS into three parts', () => {
    expect(splitJwt(jwt)).toHaveLength(3);
    expect(splitJwt('a.b')).toBeNull();
  });

  it('decodes the header', () => {
    expect(decodeJwtHeader(jwt)).toMatchObject({ alg: 'RS256', kid: 'k1' });
  });

  it('decodes the payload', () => {
    const claims = decodeJwtPayload(jwt);
    expect(claims?.sub).toBe('user-1');
    expect(claims?.chabaduniverse?.is_shliach).toBe(true);
  });

  it('returns null on malformed input', () => {
    expect(decodeJwtPayload('garbage')).toBeNull();
    expect(decodeJwtHeader('garbage')).toBeNull();
  });
});
