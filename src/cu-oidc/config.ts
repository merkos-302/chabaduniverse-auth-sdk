/**
 * cu-oidc — config resolution: environment/issuer selection + endpoint derivation.
 */

import {
  CU_OIDC_ISSUERS,
  DEFAULT_CU_OIDC_ENVIRONMENT,
  DEFAULT_CU_OIDC_SCOPE,
  DEFAULT_STORAGE_KEY_PREFIX,
  DEFAULT_TOKEN_STORAGE_KEY,
  type CuOidcConfig,
  type CuOidcEndpoints,
  type CuOidcEnvironment,
  type ResolvedCuOidcConfig,
} from './types';

/** Strip a single trailing slash so path concatenation is clean. */
function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * Resolve the issuer base URL from an explicit `issuer` (wins) or the
 * `environment` selector (default `'staging'`).
 */
export function resolveIssuer(
  environment: CuOidcEnvironment | undefined,
  explicitIssuer: string | undefined,
): string {
  if (explicitIssuer) return trimTrailingSlash(explicitIssuer);
  const env = environment ?? DEFAULT_CU_OIDC_ENVIRONMENT;
  const base = CU_OIDC_ISSUERS[env] ?? CU_OIDC_ISSUERS[DEFAULT_CU_OIDC_ENVIRONMENT];
  return trimTrailingSlash(base);
}

/** Build the absolute endpoint URLs for an issuer base. */
export function buildEndpoints(issuer: string): CuOidcEndpoints {
  const base = trimTrailingSlash(issuer);
  return {
    authorize: `${base}/oidc/auth`,
    token: `${base}/oidc/token`,
    // node-oidc-provider default userinfo route — there is NO /oidc/userinfo.
    userinfo: `${base}/oidc/me`,
    endSession: `${base}/oidc/session/end`,
    jwks: `${base}/.well-known/jwks.json`,
    ssoCheck: `${base}/sso/check`,
  };
}

/**
 * Apply defaults + derive endpoints, producing the fully-resolved config the
 * rest of the module operates on.
 */
export function resolveCuOidcConfig(config: CuOidcConfig): ResolvedCuOidcConfig {
  if (!config.clientId) {
    throw new Error('[cu-oidc] `clientId` is required.');
  }
  if (!config.redirectUri) {
    throw new Error('[cu-oidc] `redirectUri` is required.');
  }

  const issuer = resolveIssuer(config.environment, config.issuer);

  return {
    clientId: config.clientId,
    redirectUri: config.redirectUri,
    issuer,
    scope: config.scope ?? DEFAULT_CU_OIDC_SCOPE,
    storageKeyPrefix: config.storageKeyPrefix ?? DEFAULT_STORAGE_KEY_PREFIX,
    tokenStorageKey: config.tokenStorageKey ?? DEFAULT_TOKEN_STORAGE_KEY,
    debug: config.debug ?? false,
    endpoints: buildEndpoints(issuer),
  };
}
