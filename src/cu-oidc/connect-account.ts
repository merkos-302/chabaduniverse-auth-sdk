/**
 * cu-oidc — cross-method identity linking, consumer side (CU-1049 / CU-1047).
 *
 * The problem (as of 2026-07-21, narrower than it used to be): a mini-app
 * inside the Valu shell holds a Valuverse identity token. Exchanging it at
 * cu-oidc (RFC 8693) mints a cu-oidc token, but if this Valu identity has
 * never been linked to a magic-link-verified email the `cu_users` row is
 * "thin" — keyed by `valu_user_id`, no email, no SF/Neo4j enrichment. Until
 * 2026-07-21 this was universal (the Valu token carried no email at all); Valu
 * now includes a verified email in the identity token for any user who has
 * completed a Merkos-mediated login into Valuverse at least once (live-
 * verified via a signature-checked capture — see the trust-gate comment on
 * cu-oidc's `token-exchange-grant.ts`). So `exchangeValuToken`'s first call
 * now typically comes back already-enriched for such users, with no
 * interstitial needed. This module's flow still matters for the identities
 * Valu hasn't attached an email to yet — the genuinely thin case, not
 * "every Valu identity" — and for the `email_verified`-precision case still
 * pending on Valu's side (see `isEnrichedClaims` below).
 *
 * The fix (CU-1048 backend + this module): a self-verifying magic-link
 * interstitial. cu-oidc hosts a page that receives the Valu token via
 * postMessage (never a URL — it is a credential) and POSTs it same-origin
 * alongside a typed email; clicking the magic link binds `valu sub ↔ verified
 * email` server-side (collapsing the two rows). Afterwards a re-exchange of the
 * SAME Valu identity returns the full enriched token.
 *
 * This module is the mini-app half:
 *   - {@link exchangeValuToken}   — the RFC 8693 token-exchange call.
 *   - {@link driveInterstitial}   — open cu-oidc's `/oidc/connect-account`
 *     popup and hand it the Valu token via the postMessage handshake that
 *     `connect-account-bridge.js` implements.
 *   - {@link ensureLinkedSession} — the orchestrator the AC asks for: exchange,
 *     classify linked vs. thin, drive the interstitial only when thin, and
 *     re-exchange on return. Idempotent — safe to call on every mini-app load.
 *
 * Transport rationale: cu-oidc's magic-link request endpoint is same-origin
 * only (`credentials-email-request.ts` requires `Origin === issuer` and never
 * grants CORS), so the SDK cannot POST the token cross-origin. The hosted page
 * bridges that boundary. See `cu-oidc-provider` `connect-account-page.ts`.
 */

import { getClaims } from './claims';
import { storeIdToken } from './storage';
import type { CuOidcClaims, CuOidcTokens, ResolvedCuOidcConfig } from './types';

// ============================================================================
// Wire constants — mirror the provider so a rename can't drift silently.
// ============================================================================

/** RFC 8693 grant type. Mirrors cu-oidc `token-exchange-grant.ts`. */
export const TOKEN_EXCHANGE_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:token-exchange';
/** The only `subject_token_type` cu-oidc admits today (Valuverse identity token). */
export const VALU_IDENTITY_SUBJECT_TOKEN_TYPE = 'urn:valuverse:identity-token';
/** Issued-token type cu-oidc returns (the exchanged id_token). */
export const ID_TOKEN_ISSUED_TOKEN_TYPE = 'urn:ietf:params:oauth:token-type:id_token';

/** Path of the cu-oidc-hosted interstitial page (relative to the issuer). */
export const CONNECT_ACCOUNT_PATH = '/oidc/connect-account';

/** postMessage protocol — mirrors `connect-account-bridge.js`. */
export const MSG_CONNECT_READY = 'cu-oidc:connect-ready';
export const MSG_VALU_TOKEN = 'cu-oidc:valu-token';
export const MSG_MAGIC_LINK_SENT = 'cu-oidc:magic-link-sent';
/**
 * CU-1050 — the bridge fires this once the co-presentation bind completes
 * (the magic-link click set the proof cookie in the popup's browser and the
 * bridge's same-origin `/complete-bind` poll returned `{status:'bound'}`).
 * This is the TERMINAL success signal; `magic-link-sent` is now intermediate.
 */
export const MSG_LINKED = 'cu-oidc:linked';

// ============================================================================
// Errors
// ============================================================================

/** Thrown when the linking flow cannot proceed. Mirrors {@link CuOidcLoginError}. */
export class CuOidcConnectError extends Error {
  reason: string;
  detail?: unknown;
  constructor(reason: string, message?: string, detail?: unknown) {
    super(message ?? reason);
    this.name = 'CuOidcConnectError';
    this.reason = reason;
    if (detail !== undefined) this.detail = detail;
  }
}

// ============================================================================
// Token exchange (RFC 8693)
// ============================================================================

/** Options for {@link exchangeValuToken}. */
export interface ExchangeValuTokenOptions {
  /**
   * Target `audience` — the cu-oidc client_id the issued id_token's `aud` binds
   * to. In the common mini-app pattern (acting client === target) this equals
   * `config.clientId`, which is the default. The Valu subject_token's own `aud`
   * must equal this (or this must be on the acting client's
   * `token_exchange_audiences`), or cu-oidc rejects the exchange.
   */
  audience?: string;
  /** Requested scope. Defaults to the config scope. */
  scope?: string;
  /** Custom fetch (defaults to global `fetch`). */
  fetchImpl?: typeof fetch;
}

/** Result of a token-exchange: the token set plus its decoded (UNVERIFIED) claims. */
export interface ExchangeResult {
  tokens: CuOidcTokens;
  /** Decoded id_token claims, or `null` if the id_token was malformed. */
  claims: CuOidcClaims | null;
}

/**
 * Exchange a Valuverse identity token for a cu-oidc token set at `/oidc/token`
 * (RFC 8693). Public/secretless — no Authorization header; possession of the
 * signed Valu token is the proof. The issued id_token is carried in the
 * response `access_token` field per RFC 8693 §2.2; we surface it as
 * `tokens.id_token` too so downstream code can treat it uniformly.
 *
 * Does NOT verify the id_token signature — the claims returned are for
 * routing/classification only. Call `verifyIdToken` before trusting them for an
 * authorization decision.
 */
export async function exchangeValuToken(
  config: ResolvedCuOidcConfig,
  valuToken: string,
  opts: ExchangeValuTokenOptions = {},
): Promise<ExchangeResult> {
  if (!valuToken) {
    throw new CuOidcConnectError('no_valu_token', 'No Valu identity token supplied.');
  }

  const body = new URLSearchParams();
  body.set('grant_type', TOKEN_EXCHANGE_GRANT_TYPE);
  body.set('subject_token', valuToken);
  body.set('subject_token_type', VALU_IDENTITY_SUBJECT_TOKEN_TYPE);
  body.set('audience', opts.audience || config.clientId);
  body.set('client_id', config.clientId);
  body.set('scope', opts.scope || config.scope);
  // NB: NO Authorization header — the signed Valu token is the credential.

  const doFetch = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await doFetch(config.endpoints.token, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    });
  } catch (e) {
    throw new CuOidcConnectError(
      'exchange_request_failed',
      `Token-exchange request failed: ${e instanceof Error ? e.message : String(e)}. ` +
        `If this is a CORS error, confirm this origin is in the client's cors_origins.`,
    );
  }

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  const payload = json as {
    access_token?: string;
    refresh_token?: string;
    token_type?: string;
    expires_in?: number;
    scope?: string;
    issued_token_type?: string;
    merkos_token?: string;
  };

  // RFC 8693 §2.2: the issued id_token rides in `access_token`.
  const issued = payload.access_token;
  if (!res.ok || !issued) {
    throw new CuOidcConnectError('exchange_failed', `Token endpoint returned ${res.status}`, json);
  }

  const tokens: CuOidcTokens = {
    id_token: issued,
    access_token: issued,
    ...(payload.refresh_token ? { refresh_token: payload.refresh_token } : {}),
    ...(payload.token_type ? { token_type: payload.token_type } : {}),
    ...(payload.expires_in !== undefined ? { expires_in: payload.expires_in } : {}),
    ...(payload.scope ? { scope: payload.scope } : {}),
    // Raw HS256 Merkos-Platform token; a top-level field on the token-exchange
    // response, present only when the client has `issue_legacy_token: true`.
    ...(payload.merkos_token ? { merkos_token: payload.merkos_token } : {}),
  };

  return { tokens, claims: getClaims(issued) };
}

// ============================================================================
// Linked-vs-thin classification
// ============================================================================

/**
 * Default "is this identity linked?" predicate. The interstitial exists to bind
 * a magic-link-VERIFIED email to the Valu sub, and a thin (unlinked) row has no
 * email — so a top-level `email` is the crispest, most robust signal that the
 * join has happened. A magic-link-first row always carries email; a Valu-first
 * row gains it only after the collapse. Override via
 * {@link EnsureLinkedSessionOptions.isLinked} if a consumer needs a stricter
 * bar (e.g. also requiring `chabaduniverse.sf_contact_id`).
 */
export function isEnrichedClaims(claims: CuOidcClaims | null): boolean {
  return !!claims && typeof claims.email === 'string' && claims.email.length > 0;
}

// ============================================================================
// Interstitial popup handshake
// ============================================================================

/** The minimal popup surface {@link driveInterstitial} needs (test-injectable). */
export interface PopupLike {
  closed: boolean;
  close(): void;
  postMessage(message: unknown, targetOrigin: string): void;
}

/** Opens the interstitial popup. Defaults to a centered `window.open`. */
export type OpenPopupFn = (url: string, name: string, features: string) => PopupLike | null;

/** The minimal message-target surface (test-injectable; defaults to `window`). */
export interface MessageTargetLike {
  addEventListener(type: 'message', handler: (event: MessageEvent) => void): void;
  removeEventListener(type: 'message', handler: (event: MessageEvent) => void): void;
}

/** Options for {@link driveInterstitial}. */
export interface DriveInterstitialOptions {
  /** Custom popup opener (defaults to a centered `window.open`). */
  openPopup?: OpenPopupFn;
  /** Where to listen for the popup's messages (defaults to `window`). */
  messageTarget?: MessageTargetLike;
  /**
   * Max wait for the popup's first `connect-ready` ping before giving up
   * (`timed-out`). The bridge re-pings for ~6s, so this only fires if the popup
   * never loads. Default 15000ms.
   */
  readyTimeoutMs?: number;
  /**
   * Max wait for `magic-link-sent` after the token is handed over (the user is
   * typing their email). Default 300000ms (5 min).
   */
  sentTimeoutMs?: number;
  /**
   * CU-1050 — after `magic-link-sent`, max wait for the bridge's `cu-oidc:linked`
   * signal (the user opening the emailed link and the bridge's same-origin
   * `/complete-bind` poll binding). If it elapses the outcome degrades to
   * `{status:'sent'}` so the caller can fall back to re-exchange polling.
   * Bounded by the Valu token's ~5-min TTL (the bridge polls with the held
   * token). Default 300000ms (5 min).
   */
  bindTimeoutMs?: number;
  /** How often to poll `popup.closed`. Default 500ms. */
  closePollMs?: number;
  /** Close the popup ourselves once the outcome is decided. Default `true`. */
  autoClose?: boolean;
  /**
   * CU-1053 — optional email pre-fill hint forwarded to the popup in the
   * `cu-oidc:valu-token` message. The bridge pre-fills the email field with it;
   * the user still submits explicitly (no auto-submit) and the emailed link
   * still proves the inbox. A malformed hint is dropped. Omit when the opener
   * has no email to offer (e.g. the sub-only test harness).
   */
  emailHint?: string;
}

/** Terminal outcome of the interstitial popup handshake. */
export type InterstitialOutcome =
  /**
   * CU-1050 — the bridge completed the co-presentation bind (the magic link
   * was clicked in the popup's browser and the bridge's same-origin
   * `/complete-bind` poll returned `bound`). The strongest signal: the identity
   * is now linked and a single re-exchange will return the enriched token.
   */
  | { status: 'bound' }
  /**
   * The user submitted their email; cu-oidc accepted it and sent the magic link.
   * INTERMEDIATE under CU-1050 — the bind only completes on click. This is
   * returned as a terminal outcome only when the bridge closed / the bind window
   * elapsed before the click landed; the caller should fall back to polling.
   */
  | { status: 'sent' }
  /** The popup closed before the magic link was sent (user cancelled). */
  | { status: 'dismissed' }
  /** `window.open` returned null — popup blocked. */
  | { status: 'blocked' }
  /** The popup never signalled ready / never sent within the timeouts. */
  | { status: 'timed-out' };

const DEFAULT_POPUP_FEATURES = (() => {
  const w = 460;
  const h = 620;
  if (typeof window === 'undefined') return `width=${w},height=${h},popup=yes`;
  const left = window.screenX + Math.max(0, (window.innerWidth - w) / 2);
  const top = window.screenY + Math.max(0, (window.innerHeight - h) / 2);
  return `width=${w},height=${h},left=${left},top=${top},popup=yes`;
})();

const defaultOpenPopup: OpenPopupFn = (url, name, features) => {
  if (typeof window === 'undefined') return null;
  return window.open(url, name, features) as unknown as PopupLike | null;
};

/**
 * CU-1053 — validate an optional email pre-fill hint before it is posted to the
 * connect-account popup. A convenience only (the emailed link still proves the
 * inbox), so a malformed hint is silently dropped rather than raised. Mirrors
 * the bridge's structural check + 254-char ceiling; case is preserved (the
 * server canonicalises).
 */
const EMAIL_HINT_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function normalizeEmailHint(hint: string | undefined): string | undefined {
  if (typeof hint !== 'string') return undefined;
  const trimmed = hint.trim();
  if (trimmed.length === 0 || trimmed.length > 254) return undefined;
  return EMAIL_HINT_RE.test(trimmed) ? trimmed : undefined;
}

/**
 * Open cu-oidc's `/oidc/connect-account` popup and run the postMessage
 * handshake with `connect-account-bridge.js`:
 *
 *   1. We open the popup and listen for messages from the ISSUER origin only.
 *   2. The popup pings `{type:'cu-oidc:connect-ready'}`; we reply by posting
 *      `{type:'cu-oidc:valu-token', token}` to the popup, targeted at the
 *      issuer origin (never `'*'` — the token is a credential).
 *   3. The popup collects the email, POSTs it same-origin, and on success
 *      pings `{type:'cu-oidc:magic-link-sent'}` — under CU-1050 this is now
 *      INTERMEDIATE (the bind completes only on click), so we keep waiting.
 *   4. The user opens the emailed link in the popup's browser; the bridge's
 *      same-origin `/complete-bind` poll co-presents the proof cookie + held
 *      Valu token, binds, and pings `{type:'cu-oidc:linked'}` — we resolve
 *      `{status:'bound'}`, the strongest terminal signal.
 *
 * Graceful degradation: if the bridge never sends `cu-oidc:linked` (older
 * provider without the complete-bind poll, or the click didn't land before the
 * `bindTimeoutMs` / popup-close), we resolve `{status:'sent'}` so the caller
 * falls back to re-exchange polling — which still DETECTS a completed bind even
 * though, under CU-1050, it can't CAUSE one.
 *
 * Resolves (never rejects) with an {@link InterstitialOutcome}.
 */
export function driveInterstitial(
  config: ResolvedCuOidcConfig,
  valuToken: string,
  opts: DriveInterstitialOptions = {},
): Promise<InterstitialOutcome> {
  const issuerOrigin = new URL(config.issuer).origin;
  const pageUrl = `${config.issuer}${CONNECT_ACCOUNT_PATH}`;
  const openPopup = opts.openPopup ?? defaultOpenPopup;
  const target: MessageTargetLike | undefined =
    opts.messageTarget ?? (typeof window !== 'undefined' ? window : undefined);
  const readyTimeoutMs = opts.readyTimeoutMs ?? 15_000;
  const sentTimeoutMs = opts.sentTimeoutMs ?? 300_000;
  const bindTimeoutMs = opts.bindTimeoutMs ?? 300_000;
  const closePollMs = opts.closePollMs ?? 500;
  const autoClose = opts.autoClose !== false;
  const emailHint = normalizeEmailHint(opts.emailHint);

  return new Promise<InterstitialOutcome>((resolve) => {
    const popup = openPopup(pageUrl, 'cu_oidc_connect_account', DEFAULT_POPUP_FEATURES);
    if (!popup) {
      resolve({ status: 'blocked' });
      return;
    }
    if (!target) {
      // No window to listen on (non-browser) — nothing can complete the flow.
      if (autoClose) safeClose(popup);
      resolve({ status: 'timed-out' });
      return;
    }

    let settled = false;
    let tokenSent = false;
    // CU-1050 — once the email is submitted the flow is "awaiting the click".
    // A popup close or bind-timeout after this point degrades to `sent`
    // (magic link is out; only the click hasn't landed) rather than `dismissed`.
    let linkSent = false;
    let readyTimer: ReturnType<typeof setTimeout> | null = null;
    let sentTimer: ReturnType<typeof setTimeout> | null = null;
    let bindTimer: ReturnType<typeof setTimeout> | null = null;
    let closeTimer: ReturnType<typeof setInterval> | null = null;

    const cleanup = () => {
      target.removeEventListener('message', onMessage);
      if (readyTimer) clearTimeout(readyTimer);
      if (sentTimer) clearTimeout(sentTimer);
      if (bindTimer) clearTimeout(bindTimer);
      if (closeTimer) clearInterval(closeTimer);
      readyTimer = sentTimer = bindTimer = null;
      closeTimer = null;
    };

    const finish = (outcome: InterstitialOutcome) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (autoClose) safeClose(popup);
      resolve(outcome);
    };

    const onMessage = (event: MessageEvent): void => {
      // Only trust the cu-oidc origin. The token is a credential; nothing from
      // another origin may drive this exchange.
      if (event.origin !== issuerOrigin) return;
      const data = event.data as { type?: string } | null;
      if (!data || typeof data.type !== 'string') return;

      if (data.type === MSG_CONNECT_READY) {
        if (tokenSent) return; // bridge re-pings; hand the token over once
        tokenSent = true;
        if (readyTimer) {
          clearTimeout(readyTimer);
          readyTimer = null;
        }
        // Arm the "user is typing their email" window now that the page is up.
        sentTimer = setTimeout(() => finish({ status: 'timed-out' }), sentTimeoutMs);
        try {
          // CU-1053 — include the validated email hint only when present, so the
          // no-hint message shape stays exactly `{ type, token }`.
          popup.postMessage(
            emailHint
              ? { type: MSG_VALU_TOKEN, token: valuToken, email: emailHint }
              : { type: MSG_VALU_TOKEN, token: valuToken },
            issuerOrigin,
          );
        } catch {
          finish({ status: 'timed-out' });
        }
        return;
      }

      if (data.type === MSG_MAGIC_LINK_SENT) {
        // CU-1050: INTERMEDIATE. The email is out but the bind only completes on
        // click. Stop the "typing" timeout, arm the "awaiting click" window, and
        // keep listening for `cu-oidc:linked`. Idempotent — the bridge could
        // re-emit if it retries the request.
        if (linkSent) return;
        linkSent = true;
        if (sentTimer) {
          clearTimeout(sentTimer);
          sentTimer = null;
        }
        bindTimer = setTimeout(() => finish({ status: 'sent' }), bindTimeoutMs);
        return;
      }

      if (data.type === MSG_LINKED) {
        // The bridge's same-origin /complete-bind poll bound the identity.
        finish({ status: 'bound' });
      }
    };

    target.addEventListener('message', onMessage);
    readyTimer = setTimeout(() => finish({ status: 'timed-out' }), readyTimeoutMs);
    closeTimer = setInterval(() => {
      // Closing AFTER the email is sent isn't a cancel — the link is already
      // out, the user just closed the popup instead of clicking in it. Degrade
      // to `sent` so the caller polls for the bind rather than reporting a
      // dismissal. Before send, a close is a genuine `dismissed`.
      if (popup.closed) finish(linkSent ? { status: 'sent' } : { status: 'dismissed' });
    }, closePollMs);
  });
}

function safeClose(popup: PopupLike): void {
  try {
    if (!popup.closed) popup.close();
  } catch {
    /* already gone / cross-origin — nothing to do */
  }
}

// ============================================================================
// Orchestrator — ensureLinkedSession()
// ============================================================================

/** Options for {@link ensureLinkedSession}. */
export interface EnsureLinkedSessionOptions {
  /** A Valu identity token to use. Supply this OR {@link getValuToken}. */
  valuToken?: string;
  /**
   * Mint/fetch a fresh Valu identity token. Preferred over a static
   * {@link valuToken} because the re-exchange poll re-mints per attempt (Valu
   * tokens are ~5-min TTL; a static token can expire before the user clicks).
   */
  getValuToken?: () => Promise<string> | string;
  /** Target `audience` for the exchange (defaults to `config.clientId`). */
  audience?: string;
  /** Requested scope (defaults to the config scope). */
  scope?: string;
  /** Custom fetch (defaults to global `fetch`). */
  fetchImpl?: typeof fetch;
  /** Override the linked-vs-thin predicate (default {@link isEnrichedClaims}). */
  isLinked?: (claims: CuOidcClaims | null) => boolean;
  /** Persist the final enriched id_token first-party (default `true`). */
  persist?: boolean;
  /**
   * Shared-device confirmation gate (CU-1051 — residual-risk mitigation layered
   * on CU-1050 co-presentation). Invoked with the classified Valu `sub` on the
   * THIN path only — immediately before the magic-link interstitial opens, i.e.
   * the one moment a `valu sub ↔ email` bind is about to be created. Return
   * `false` (or a promise of it) to abort: the flow then resolves
   * `{status:'declined'}` and no popup opens and no bind is attempted. An
   * already-linked identity never reaches this gate (it returns before the
   * interstitial), so returning users are never prompted.
   *
   * Why it exists: the Valu identity token is sub-only, so the bind joins an
   * OPAQUE `sub` to the magic-link-VERIFIED email — and the human never sees
   * WHICH Valu identity they are binding. On a shared machine a stale Valu
   * session (someone else's `sub`) would bind to the email owner's verified
   * inbox, handing that other person a durable, enriched account. The magic
   * link proves the EMAIL; it can never prove the `sub`. Surfacing the ambient
   * Valu profile (name + avatar) lets the human catch "that isn't me" before
   * the link goes out.
   *
   * The `valuSub` argument is the `sub` of the EXACT token that will be bound
   * (decoded from the same single mint handed to the interstitial — never a
   * second, later read of the ambient identity). Cross-check it against the
   * profile you fetch — e.g. assert `getApi('users').run('current')`'s
   * `.id === valuSub` before rendering "is this you?" — so the identity the
   * human confirms is provably the identity being bound. It is `null` only if
   * the token could not be decoded; treat that as "cannot confirm" (show the raw
   * prompt or decline) rather than a pass.
   *
   * Headless by design: this SDK holds no Valu profile client of its own, so
   * the CONSUMER supplies the check — fetch the ambient profile (Valu `users`
   * API: `getApi('users').run('current')` for the name, then
   * `run('get-icon', {userId})` for the avatar) and render the "is this you?"
   * prompt inside this callback. Omit to keep the current (un-gated) behaviour.
   *
   * Fail-closed contract: this callback MUST settle — there is no internal
   * timeout, so a promise that never resolves hangs the flow (no popup, no
   * bind). If it throws or rejects, `ensureLinkedSession` rejects and NO bind
   * occurs (consistent with a failed token-exchange); a throw never silently
   * proceeds to a bind. Callers that `switch` on the result status must
   * therefore also guard the call in `try/catch`.
   *
   * Limits: the profile is opener-asserted, not cryptographically bound to the
   * token, so a targeted attacker who renames themselves to match the victim
   * defeats it — this is a human sanity-check for the accidental / opportunistic
   * shared-session case, not a cryptographic control. The durable fix is a
   * verified `email` claim on the Valu token (not available today); until then
   * this is the only human check on the `sub` half of the bind.
   */
  confirmIdentity?: (valuSub: string | null) => boolean | Promise<boolean>;
  /** Popup/handshake seams passed through to {@link driveInterstitial}. */
  interstitial?: DriveInterstitialOptions;
  /**
   * CU-1053 — optional email pre-fill hint. Forwarded to the connect-account
   * popup (via {@link driveInterstitial}) so the field arrives pre-filled when
   * the consuming app already knows the user's address. Convenience only: the
   * user still submits explicitly and the emailed link proves the inbox. An
   * `emailHint` set directly on {@link interstitial} takes precedence.
   */
  emailHint?: string;
  /**
   * After the magic link is sent, poll a re-exchange until the identity links
   * (the user clicked the link) or {@link pollTimeoutMs} elapses. Default
   * `true`. Set `false` to return `{status:'pending'}` immediately after send
   * and let the app re-call `ensureLinkedSession` on a later load instead.
   */
  waitForLink?: boolean;
  /** Interval between re-exchange polls. Default 2500ms. */
  pollIntervalMs?: number;
  /** Max total time to poll for the link. Default 120000ms (2 min). */
  pollTimeoutMs?: number;
  /** Injectable delay (tests pass a no-op). Defaults to real `setTimeout`. */
  sleep?: (ms: number) => Promise<void>;
  /** Injectable clock (tests pass a fake). Defaults to `Date.now`. */
  now?: () => number;
}

/** Outcome of {@link ensureLinkedSession}. */
export type EnsureLinkedSessionResult =
  /** A full enriched token is in hand (already linked, or linked via the flow). */
  | { status: 'linked'; tokens: CuOidcTokens; claims: CuOidcClaims | null; viaInterstitial: boolean }
  /**
   * Magic link sent; identity not yet linked (poll disabled, or user hasn't
   * clicked). `lastError` is set when the poll ended because the re-exchange
   * kept failing — with a static `valuToken` that usually means the token
   * expired before the click, so the link may already be complete server-side:
   * re-invoke `ensureLinkedSession` with a fresh token to confirm.
   */
  | { status: 'pending'; lastError?: CuOidcConnectError }
  /** The user closed the interstitial without submitting. */
  | { status: 'dismissed' }
  /**
   * The consumer's {@link EnsureLinkedSessionOptions.confirmIdentity} gate
   * returned false — the human did not recognise the ambient Valu identity, so
   * the flow aborted before opening the popup and no bind was attempted.
   * Distinct from `dismissed`, which is a popup close AFTER the flow began.
   */
  | { status: 'declined' }
  /** The popup was blocked by the browser. */
  | { status: 'blocked' };

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((r) => {
    setTimeout(r, ms);
  });

/**
 * The AC's clean API. Exchange the Valu token, and:
 *   - if the result is already enriched → return it (no interstitial);
 *   - if it is thin → drive the interstitial popup, and on send re-exchange
 *     until the identity links (or the poll times out).
 *
 * Idempotent: safe to call on every mini-app load. A thin identity whose user
 * has since clicked the link returns `linked` immediately on the first
 * exchange, with no popup. Triggering is keyed on THIN, not on
 * no-token-in-memory, per the AC.
 */
export async function ensureLinkedSession(
  config: ResolvedCuOidcConfig,
  opts: EnsureLinkedSessionOptions = {},
): Promise<EnsureLinkedSessionResult> {
  const isLinked = opts.isLinked ?? isEnrichedClaims;
  const persist = opts.persist !== false;
  const now = opts.now ?? Date.now;
  const sleep = opts.sleep ?? defaultSleep;

  const mintValuToken = async (): Promise<string> => {
    if (opts.getValuToken) return opts.getValuToken();
    if (opts.valuToken) return opts.valuToken;
    throw new CuOidcConnectError(
      'no_valu_token_source',
      'ensureLinkedSession needs `valuToken` or `getValuToken`.',
    );
  };

  const exchange = (token: string): Promise<ExchangeResult> =>
    exchangeValuToken(config, token, {
      ...(opts.audience !== undefined ? { audience: opts.audience } : {}),
      ...(opts.scope !== undefined ? { scope: opts.scope } : {}),
      ...(opts.fetchImpl ? { fetchImpl: opts.fetchImpl } : {}),
    });

  const settleLinked = (
    result: ExchangeResult,
    viaInterstitial: boolean,
  ): EnsureLinkedSessionResult => {
    if (persist) storeIdToken(config.tokenStorageKey, result.tokens.id_token);
    return { status: 'linked', tokens: result.tokens, claims: result.claims, viaInterstitial };
  };

  // 1. First exchange — the common case is an already-linked identity.
  const first = await exchange(await mintValuToken());
  if (isLinked(first.claims)) {
    return settleLinked(first, false);
  }

  // 1a. Thin identity → a `valu sub ↔ email` bind is imminent. Mint the token
  //     that will actually be handed to the interstitial ONCE, and pin the
  //     consumer's confirmation to ITS `sub` (CU-1051 C1). A single read of the
  //     ambient identity feeds BOTH the "is this you?" check and the bind, so a
  //     mid-prompt Valu session switch on a shared device cannot make the human
  //     confirm one identity while a second, later mint binds another — the
  //     token confirmed IS the token bound. A `false` means the human didn't
  //     recognise the signed-in Valu user; abort before any bind rather than
  //     staple someone else's `sub` to this email.
  const boundToken = await mintValuToken();
  if (opts.confirmIdentity) {
    const boundSub = getClaims(boundToken)?.sub ?? null;
    const confirmed = await opts.confirmIdentity(boundSub);
    if (!confirmed) return { status: 'declined' };
  }

  // 2. Thin identity → drive the interstitial with the SAME token whose `sub`
  //    the consumer just confirmed (no second, unpinned re-mint).
  const interstitialOpts = opts.interstitial ?? {};
  const outcome = await driveInterstitial(config, boundToken, {
    ...interstitialOpts,
    // CU-1053 — forward the top-level email hint unless the caller set one
    // directly on the interstitial seams (the explicit lower-level one wins).
    ...(interstitialOpts.emailHint === undefined && opts.emailHint !== undefined
      ? { emailHint: opts.emailHint }
      : {}),
  });
  if (outcome.status === 'blocked') return { status: 'blocked' };

  // CU-1050 — the bridge confirmed the co-presentation bind completed. A single
  // re-exchange with a fresh token returns the enriched identity; no polling
  // needed. If that one attempt somehow still reads thin (read-replica lag),
  // fall through to the backstop poll below rather than reporting failure.
  if (outcome.status === 'bound') {
    const bound = await exchange(await mintValuToken());
    if (isLinked(bound.claims)) return settleLinked(bound, true);
    // else: fall through to the poll.
  } else if (outcome.status !== 'sent') {
    // 'dismissed' (user closed) or 'timed-out' (never readied / never sent).
    return outcome.status === 'dismissed' ? { status: 'dismissed' } : { status: 'pending' };
  }

  // 3. Magic link sent (bridge couldn't confirm the click) or bound-but-still-
  //    thin. If the caller opted out of waiting, hand back control.
  if (opts.waitForLink === false) return { status: 'pending' };

  // 4. Re-exchange on return: poll until the identity links or we time out.
  //    Re-mint per attempt so a slow email click doesn't hit an expired token.
  //    With a STATIC valuToken there is nothing fresh to re-mint, so once the
  //    server rejects it (expiry) every further attempt fails identically —
  //    break out with the error instead of spinning silently to the deadline
  //    and returning a bare `pending` that hides a possibly-completed link.
  const pollIntervalMs = opts.pollIntervalMs ?? 2500;
  const pollTimeoutMs = opts.pollTimeoutMs ?? 120_000;
  const canRemint = opts.getValuToken !== undefined;
  const deadline = now() + pollTimeoutMs;
  let lastError: CuOidcConnectError | undefined;
  while (now() < deadline) {
    await sleep(pollIntervalMs);
    let attempt: ExchangeResult;
    try {
      attempt = await exchange(await mintValuToken());
    } catch (err) {
      lastError = err instanceof CuOidcConnectError ? err : undefined;
      // A rejected exchange on a non-re-mintable (static) token can never
      // recover — the same expired token would be re-sent. Stop and surface it
      // so the caller re-invokes with a fresh token. Transient network faults
      // (`exchange_request_failed`) and re-mintable tokens keep polling.
      if (!canRemint && lastError?.reason === 'exchange_failed') break;
      continue;
    }
    lastError = undefined; // a successful (still-thin) exchange clears the error
    if (isLinked(attempt.claims)) {
      return settleLinked(attempt, true);
    }
  }
  return lastError ? { status: 'pending', lastError } : { status: 'pending' };
}
