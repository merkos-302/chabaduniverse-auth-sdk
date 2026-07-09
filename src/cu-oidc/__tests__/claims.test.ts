/**
 * Tests for claim accessors + token-lifecycle helpers.
 */

import { describe, expect, it } from 'vitest';
import {
  getClaims,
  getNamespace,
  getShliachStatus,
  getTokenExpiration,
  isTokenExpired,
} from '../claims';
import { bytesToBase64Url } from '../crypto-utils';
import type { CuOidcClaims } from '../types';

/** Build an UNSIGNED JWT string carrying `payload` (decode-only tests). */
function makeJwt(payload: Record<string, unknown>): string {
  const h = bytesToBase64Url(new TextEncoder().encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const p = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  return `${h}.${p}.sig`;
}

const claims: CuOidcClaims = {
  sub: 'cu-1',
  chabaduniverse: { user_id: 'cu-1', is_shliach: true, chabad_org_id: '770' },
  valu: { user_id: 'valu-1' },
  merkos: { sub: 'neo4j-1', shliachAccess: true },
};

describe('getClaims', () => {
  it('decodes the three namespaces from a token', () => {
    const decoded = getClaims(makeJwt(claims));
    expect(decoded?.sub).toBe('cu-1');
    expect(decoded?.chabaduniverse?.chabad_org_id).toBe('770');
    expect(decoded?.valu?.user_id).toBe('valu-1');
    expect(decoded?.merkos?.sub).toBe('neo4j-1');
  });
});

describe('getNamespace', () => {
  it('returns the requested namespace from a token or claim object', () => {
    expect(getNamespace(claims, 'chabaduniverse')?.is_shliach).toBe(true);
    expect(getNamespace(makeJwt(claims), 'valu')?.user_id).toBe('valu-1');
    expect(getNamespace(claims, 'merkos')?.shliachAccess).toBe(true);
  });

  it('returns null for an absent namespace', () => {
    expect(getNamespace({ sub: 'x' }, 'chabaduniverse')).toBeNull();
    expect(getNamespace(null, 'valu')).toBeNull();
  });
});

describe('getShliachStatus', () => {
  it('prefers chabaduniverse.is_shliach', () => {
    expect(getShliachStatus(claims)).toBe(true);
    expect(getShliachStatus({ sub: 'x', chabaduniverse: { is_shliach: false } })).toBe(false);
  });

  it('falls back to merkos.shliachAccess when is_shliach is absent', () => {
    expect(getShliachStatus({ sub: 'x', merkos: { shliachAccess: true } })).toBe(true);
  });

  it('returns false when neither signal is present', () => {
    expect(getShliachStatus({ sub: 'x' })).toBe(false);
    expect(getShliachStatus(null)).toBe(false);
  });
});

describe('token lifecycle', () => {
  it('getTokenExpiration returns exp in ms', () => {
    const token = makeJwt({ sub: 'x', exp: 1000 });
    expect(getTokenExpiration(token)).toBe(1_000_000);
  });

  it('getTokenExpiration returns null when exp is missing', () => {
    expect(getTokenExpiration(makeJwt({ sub: 'x' }))).toBeNull();
  });

  it('isTokenExpired is true for a past exp and false for a future one', () => {
    const nowSec = Math.floor(Date.now() / 1000);
    expect(isTokenExpired(makeJwt({ sub: 'x', exp: nowSec - 3600 }))).toBe(true);
    expect(isTokenExpired(makeJwt({ sub: 'x', exp: nowSec + 3600 }))).toBe(false);
  });

  it('isTokenExpired honors the buffer (proactive refresh window)', () => {
    const nowSec = Math.floor(Date.now() / 1000);
    // exp is 30s away; a 60s buffer treats it as already expired.
    expect(isTokenExpired(makeJwt({ sub: 'x', exp: nowSec + 30 }), 60)).toBe(true);
    expect(isTokenExpired(makeJwt({ sub: 'x', exp: nowSec + 30 }), 5)).toBe(false);
  });

  it('isTokenExpired is true for a malformed token', () => {
    expect(isTokenExpired('garbage')).toBe(true);
  });
});
