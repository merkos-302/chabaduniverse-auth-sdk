/**
 * Tests for cu-oidc config resolution (environment/issuer selection + endpoints).
 */

import { describe, expect, it } from 'vitest';
import { buildEndpoints, resolveCuOidcConfig, resolveIssuer } from '../config';
import { CU_OIDC_ISSUERS } from '../types';

const BASE = { clientId: 'cu-harness-consumer-b', redirectUri: 'https://app.example.com/auth/callback' };

describe('resolveIssuer', () => {
  it('defaults to staging when nothing supplied', () => {
    expect(resolveIssuer(undefined, undefined)).toBe(CU_OIDC_ISSUERS.staging);
  });

  it('selects by environment', () => {
    expect(resolveIssuer('production', undefined)).toBe(CU_OIDC_ISSUERS.production);
    expect(resolveIssuer('local', undefined)).toBe(CU_OIDC_ISSUERS.local);
  });

  it('lets an explicit issuer win over environment and trims a trailing slash', () => {
    expect(resolveIssuer('production', 'https://custom.example.com/')).toBe(
      'https://custom.example.com',
    );
  });
});

describe('buildEndpoints', () => {
  it('derives the correct absolute endpoint paths', () => {
    const e = buildEndpoints('https://staging.oidc.merkos302.com');
    expect(e.authorize).toBe('https://staging.oidc.merkos302.com/oidc/auth');
    expect(e.token).toBe('https://staging.oidc.merkos302.com/oidc/token');
    expect(e.userinfo).toBe('https://staging.oidc.merkos302.com/oidc/me');
    expect(e.endSession).toBe('https://staging.oidc.merkos302.com/oidc/session/end');
    expect(e.jwks).toBe('https://staging.oidc.merkos302.com/.well-known/jwks.json');
    expect(e.ssoCheck).toBe('https://staging.oidc.merkos302.com/sso/check');
  });
});

describe('resolveCuOidcConfig', () => {
  it('applies defaults (staging issuer, standard scope, storage keys)', () => {
    const r = resolveCuOidcConfig(BASE);
    expect(r.issuer).toBe(CU_OIDC_ISSUERS.staging);
    expect(r.scope).toBe('openid email profile');
    expect(r.storageKeyPrefix).toBe('cu_oidc_');
    expect(r.tokenStorageKey).toBe('cu_id_token');
    expect(r.debug).toBe(false);
    expect(r.endpoints.token).toContain('staging.oidc.merkos302.com');
  });

  it('honors overrides', () => {
    const r = resolveCuOidcConfig({
      ...BASE,
      environment: 'production',
      scope: 'openid',
      storageKeyPrefix: 'x_',
      tokenStorageKey: 'my_token',
      debug: true,
    });
    expect(r.issuer).toBe(CU_OIDC_ISSUERS.production);
    expect(r.scope).toBe('openid');
    expect(r.storageKeyPrefix).toBe('x_');
    expect(r.tokenStorageKey).toBe('my_token');
    expect(r.debug).toBe(true);
  });

  it('throws when clientId or redirectUri is missing', () => {
    expect(() => resolveCuOidcConfig({ clientId: '', redirectUri: 'x' })).toThrow(/clientId/);
    expect(() => resolveCuOidcConfig({ clientId: 'x', redirectUri: '' })).toThrow(/redirectUri/);
  });
});
