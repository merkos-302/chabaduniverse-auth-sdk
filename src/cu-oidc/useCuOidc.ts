/**
 * useCuOidc — thin React wrapper over {@link createCuOidcClient}.
 *
 * The client itself is framework-agnostic; this hook adds React lifecycle:
 * it memoizes a client from the config, reflects the first-party stored token
 * as reactive state, and re-renders when the completion helpers land a session.
 * All the heavy lifting stays in the core modules.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createCuOidcClient, type ClientVerifyOptions, type CuOidcClient, type LogoutOptions } from './client';
import type { StartLoginOptions, HandleLoginCallbackOptions, RefreshTokensOptions } from './login';
import type { StartSilentSsoOptions, HandleReceiverOptions } from './silent-sso';
import type { EnsureLinkedSessionOptions, EnsureLinkedSessionResult } from './connect-account';
import type {
  CuOidcClaims,
  CuOidcConfig,
  CuOidcLoginResult,
  CuOidcSilentResult,
  CuOidcTokens,
} from './types';

/** Reactive return shape of {@link useCuOidc}. */
export interface UseCuOidcReturn {
  /** The underlying framework-agnostic client. */
  client: CuOidcClient;
  /** Current first-party id_token, or `null`. */
  token: string | null;
  /** Decoded claims of the current token (UNVERIFIED), or `null`. */
  user: CuOidcClaims | null;
  /** Whether a non-expired token is stored. */
  isAuthenticated: boolean;
  /** Shliach status derived from the current claims. */
  isShliach: boolean;
  /** Whether an async operation (callback / receiver / refresh) is in flight. */
  isLoading: boolean;
  /** Last error message, or `null`. */
  error: string | null;

  /** Start a login (navigates to `/oidc/auth`). */
  login: (opts?: StartLoginOptions) => Promise<string>;
  /** Complete a login on the redirect-back page; updates state on success. */
  handleLoginCallback: (opts?: HandleLoginCallbackOptions) => Promise<CuOidcLoginResult>;
  /** Start a silent-SSO probe (navigates top-level to `/sso/check`). */
  silentSSO: (opts?: StartSilentSsoOptions) => string;
  /** Handle the silent-SSO return hop; updates state on `authenticated`. */
  handleReceiver: (opts?: HandleReceiverOptions) => Promise<CuOidcSilentResult>;
  /**
   * Ensure the identity behind the ambient Valu token is linked (exchange +
   * self-verifying magic-link interstitial as needed), then re-read the STORED
   * session into hook state on success. Prefer this over
   * `client.ensureLinkedSession()` directly — a direct client write would not
   * re-sync the mounted hook (CU-1058). Note: hook state mirrors storage, so
   * this has no effect on `token`/`isAuthenticated` when called with
   * `persist: false` — read the returned `result.tokens` in that case.
   */
  ensureLinkedSession: (opts?: EnsureLinkedSessionOptions) => Promise<EnsureLinkedSessionResult>;
  /**
   * Exchange a `refresh_token` for a NEW token set (network call); updates
   * state on success. Contrast `resync()`, which only re-reads local storage.
   */
  refresh: (refreshToken: string, opts?: RefreshTokensOptions) => Promise<CuOidcTokens>;
  /**
   * Re-read the stored session into hook state. Use after a write the hook
   * did not make itself (e.g. a direct `client.ensureLinkedSession()` call, or
   * a token written by another code path). Local-only — no network. Contrast
   * `refresh()`, which exchanges a refresh_token for a new token set.
   */
  resync: () => void;
  /** Verify a token (JWKS signature + iss + exp). */
  verify: (token: string, opts?: ClientVerifyOptions) => Promise<CuOidcClaims>;
  /** Clear the stored token and navigate to `/oidc/session/end`. */
  logout: (opts?: LogoutOptions) => string;
}

/**
 * React binding for a cu-oidc client. Pass a stable config (or one whose
 * identity-affecting fields don't churn between renders).
 */
export function useCuOidc(config: CuOidcConfig): UseCuOidcReturn {
  // Rebuild the client only when identity-affecting config fields change.
  const client = useMemo(
    () => createCuOidcClient(config),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      config.clientId,
      config.redirectUri,
      config.environment,
      config.issuer,
      config.scope,
      config.storageKeyPrefix,
      config.tokenStorageKey,
    ],
  );

  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const sync = useCallback(() => {
    setToken(client.getStoredToken());
  }, [client]);

  useEffect(() => {
    mounted.current = true;
    sync();
    return () => {
      mounted.current = false;
    };
  }, [sync]);

  const user = useMemo(() => (token ? client.getClaims(token) : null), [client, token]);
  const isAuthenticated = useMemo(
    () => token !== null && !client.isTokenExpired(token),
    [client, token],
  );
  const isShliach = useMemo(() => client.getShliachStatus(user), [client, user]);

  const login = useCallback((opts?: StartLoginOptions) => client.login(opts), [client]);
  const silentSSO = useCallback((opts?: StartSilentSsoOptions) => client.silentSSO(opts), [client]);
  const verify = useCallback(
    (t: string, opts?: ClientVerifyOptions) => client.verify(t, opts),
    [client],
  );

  const logout = useCallback(
    (opts?: LogoutOptions) => {
      const url = client.logout(opts);
      if (mounted.current) setToken(null);
      return url;
    },
    [client],
  );

  const handleLoginCallback = useCallback(
    async (opts?: HandleLoginCallbackOptions) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await client.handleLoginCallback(opts);
        if (mounted.current) sync();
        return result;
      } catch (e) {
        if (mounted.current) setError(e instanceof Error ? e.message : String(e));
        throw e;
      } finally {
        if (mounted.current) setIsLoading(false);
      }
    },
    [client, sync],
  );

  const handleReceiver = useCallback(
    async (opts?: HandleReceiverOptions) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await client.handleReceiver(opts);
        if (mounted.current) {
          if (result.status === 'authenticated') sync();
          else if (result.status === 'error') setError(result.error);
        }
        return result;
      } finally {
        if (mounted.current) setIsLoading(false);
      }
    },
    [client, sync],
  );

  const refresh = useCallback(
    async (refreshToken: string, opts?: RefreshTokensOptions) => {
      setIsLoading(true);
      setError(null);
      try {
        const tokens = await client.refresh(refreshToken, opts);
        if (mounted.current) sync();
        return tokens;
      } catch (e) {
        if (mounted.current) setError(e instanceof Error ? e.message : String(e));
        throw e;
      } finally {
        if (mounted.current) setIsLoading(false);
      }
    },
    [client, sync],
  );

  const ensureLinkedSession = useCallback(
    async (opts?: EnsureLinkedSessionOptions) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await client.ensureLinkedSession(opts);
        if (mounted.current) sync();
        return result;
      } catch (e) {
        if (mounted.current) setError(e instanceof Error ? e.message : String(e));
        throw e;
      } finally {
        if (mounted.current) setIsLoading(false);
      }
    },
    [client, sync],
  );

  // CU-1058: manual, local-only re-read of the stored session into hook state.
  const resync = useCallback(() => {
    if (mounted.current) sync();
  }, [sync]);

  return {
    client,
    token,
    user,
    isAuthenticated,
    isShliach,
    isLoading,
    error,
    login,
    handleLoginCallback,
    silentSSO,
    handleReceiver,
    ensureLinkedSession,
    refresh,
    resync,
    verify,
    logout,
  };
}
