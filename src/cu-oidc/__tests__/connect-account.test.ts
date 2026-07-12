/**
 * Tier-1 tests for the cross-method identity-linking module (CU-1049).
 *
 * Mocked Valu token + mocked fetch + injected popup/message seams — no real
 * shell, no network. The real-shell end-to-end (mini-app registered, aud =
 * miniapp) is Tier-2 and cannot be exercised headlessly.
 *
 * Environment: happy-dom (real `window`, `MessageEvent`, `localStorage`).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getClaims } from '../claims';
import { resolveCuOidcConfig } from '../config';
import { bytesToBase64Url } from '../crypto-utils';
import { readIdToken } from '../storage';
import {
  CuOidcConnectError,
  driveInterstitial,
  ensureLinkedSession,
  exchangeValuToken,
  isEnrichedClaims,
  MSG_CONNECT_READY,
  MSG_LINKED,
  MSG_MAGIC_LINK_SENT,
  MSG_VALU_TOKEN,
  TOKEN_EXCHANGE_GRANT_TYPE,
  VALU_IDENTITY_SUBJECT_TOKEN_TYPE,
  type PopupLike,
} from '../connect-account';

const config = resolveCuOidcConfig({
  clientId: 'cu-test-harness',
  redirectUri: 'https://harness.example/auth/callback',
  environment: 'staging',
});
const ISSUER_ORIGIN = new URL(config.issuer).origin; // https://staging.oidc.merkos302.com

// --- helpers ----------------------------------------------------------------

/** Build a decodable (UNSIGNED) JWT — getClaims only reads the payload. */
function jwt(payload: Record<string, unknown>): string {
  const enc = (o: unknown) => bytesToBase64Url(new TextEncoder().encode(JSON.stringify(o)));
  return `${enc({ alg: 'none', typ: 'JWT' })}.${enc(payload)}.`;
}

const nowSec = Math.floor(Date.now() / 1000);
const THIN = jwt({
  sub: 'valu-abc',
  iss: config.issuer,
  aud: 'cu-test-harness',
  iat: nowSec,
  exp: nowSec + 300,
  valu: { user_id: 'valu-abc' },
});
const ENRICHED = jwt({
  sub: 'cu-user-1',
  iss: config.issuer,
  aud: 'cu-test-harness',
  iat: nowSec,
  exp: nowSec + 3600,
  email: 'shliach@example.com',
  email_verified: true,
  chabaduniverse: { user_id: 'cu-user-1', is_shliach: true },
  valu: { user_id: 'valu-abc' },
});

/**
 * A DECODABLE Valu identity token (getClaims reads its payload) carrying a known
 * `sub` — the confirm-gate tests assert WHICH identity got pinned to the bind.
 * The gate reads, and driveInterstitial hands the popup, the raw Valu token
 * (NOT the exchanged id_token), so its `sub` is what a consumer's "is this you?"
 * check is shown and what ultimately binds.
 */
const VALU_SUB = 'valu-abc';
const VALU_TOKEN = jwt({
  sub: VALU_SUB,
  iss: 'https://api.roomful.net',
  aud: 'cu-test-harness',
  iat: nowSec,
  exp: nowSec + 300,
});

/** A fetch mock returning a JSON body with the given status. */
function jsonFetch(body: Record<string, unknown>, status = 200): typeof fetch {
  return vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
}

/** A minimal spy-able popup. */
function fakePopup(): PopupLike & { postMessage: ReturnType<typeof vi.fn> } {
  return {
    closed: false,
    close: vi.fn(function (this: PopupLike) {
      this.closed = true;
    }),
    postMessage: vi.fn(),
  };
}

function post(type: string, origin = ISSUER_ORIGIN): void {
  window.dispatchEvent(new MessageEvent('message', { origin, data: { type } }));
}

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  vi.useRealTimers();
});

// ===========================================================================
// exchangeValuToken — RFC 8693 wire
// ===========================================================================

describe('exchangeValuToken', () => {
  it('POSTs the RFC 8693 grant and surfaces the issued id_token from access_token', async () => {
    let capturedBody = '';
    const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => {
      capturedBody = String(init.body);
      return new Response(JSON.stringify({ access_token: ENRICHED, refresh_token: 'RT', scope: 'openid' }), {
        status: 200,
      });
    }) as unknown as typeof fetch;

    const { tokens, claims } = await exchangeValuToken(config, 'valu.jwt', { fetchImpl });

    const params = new URLSearchParams(capturedBody);
    expect(params.get('grant_type')).toBe(TOKEN_EXCHANGE_GRANT_TYPE);
    expect(params.get('subject_token')).toBe('valu.jwt');
    expect(params.get('subject_token_type')).toBe(VALU_IDENTITY_SUBJECT_TOKEN_TYPE);
    // audience defaults to the client_id (acting client === target).
    expect(params.get('audience')).toBe('cu-test-harness');
    expect(params.get('client_id')).toBe('cu-test-harness');

    // Issued id_token rides in access_token per §2.2 — surfaced as id_token too.
    expect(tokens.id_token).toBe(ENRICHED);
    expect(tokens.access_token).toBe(ENRICHED);
    expect(tokens.refresh_token).toBe('RT');
    expect(claims?.email).toBe('shliach@example.com');
  });

  it('honors an explicit audience override', async () => {
    let capturedBody = '';
    const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => {
      capturedBody = String(init.body);
      return new Response(JSON.stringify({ access_token: THIN }), { status: 200 });
    }) as unknown as typeof fetch;

    await exchangeValuToken(config, 'valu.jwt', { fetchImpl, audience: 'miniapp' });
    expect(new URLSearchParams(capturedBody).get('audience')).toBe('miniapp');
  });

  it('throws CuOidcConnectError on a non-2xx / empty response', async () => {
    await expect(
      exchangeValuToken(config, 'valu.jwt', { fetchImpl: jsonFetch({ error: 'invalid_grant' }, 400) }),
    ).rejects.toMatchObject({ name: 'CuOidcConnectError', reason: 'exchange_failed' });
  });

  it('throws when no Valu token is supplied', async () => {
    await expect(exchangeValuToken(config, '', { fetchImpl: jsonFetch({}) })).rejects.toBeInstanceOf(
      CuOidcConnectError,
    );
  });
});

// ===========================================================================
// isEnrichedClaims — linked-vs-thin predicate
// ===========================================================================

describe('isEnrichedClaims', () => {
  it('is true only when a non-empty top-level email is present', () => {
    expect(isEnrichedClaims({ sub: 'x', email: 'a@b.com' })).toBe(true);
    expect(isEnrichedClaims({ sub: 'x' })).toBe(false);
    expect(isEnrichedClaims({ sub: 'x', email: '' })).toBe(false);
    expect(isEnrichedClaims(null)).toBe(false);
  });
});

// ===========================================================================
// driveInterstitial — popup postMessage handshake
// ===========================================================================

describe('driveInterstitial', () => {
  it('CU-1050: hands the token over on connect-ready and resolves BOUND on cu-oidc:linked', async () => {
    const popup = fakePopup();
    const p = driveInterstitial(config, 'valu.jwt', { openPopup: () => popup });

    post(MSG_CONNECT_READY);
    post(MSG_MAGIC_LINK_SENT); // intermediate — does NOT settle
    post(MSG_LINKED); // the bind completed → terminal
    const outcome = await p;

    expect(outcome).toEqual({ status: 'bound' });
    expect(popup.postMessage).toHaveBeenCalledWith(
      { type: MSG_VALU_TOKEN, token: 'valu.jwt' },
      ISSUER_ORIGIN,
    );
    // autoClose default — the popup is closed once the flow settles.
    expect(popup.closed).toBe(true);
  });

  it('CU-1050: magic-link-sent is INTERMEDIATE — does not settle until linked', async () => {
    vi.useFakeTimers();
    const popup = fakePopup();
    const p = driveInterstitial(config, 'valu.jwt', {
      openPopup: () => popup,
      // Keep all the give-up timers far out so only `linked` can settle this.
      readyTimeoutMs: 1_000_000,
      sentTimeoutMs: 1_000_000,
      bindTimeoutMs: 1_000_000,
      closePollMs: 1_000_000,
    });

    post(MSG_CONNECT_READY);
    post(MSG_MAGIC_LINK_SENT);

    // Race the still-pending promise against a sentinel — it must NOT have
    // settled on magic-link-sent alone.
    const sentinel = Symbol('pending');
    const raced = await Promise.race([p, Promise.resolve(sentinel)]);
    expect(raced).toBe(sentinel);

    // Now the bind lands → BOUND.
    post(MSG_LINKED);
    await expect(p).resolves.toEqual({ status: 'bound' });
  });

  it('CU-1050: popup closes AFTER send (before click) → degrades to `sent`, not `dismissed`', async () => {
    vi.useFakeTimers();
    const popup = fakePopup();
    const p = driveInterstitial(config, 'valu.jwt', {
      openPopup: () => popup,
      closePollMs: 100,
    });

    post(MSG_CONNECT_READY);
    post(MSG_MAGIC_LINK_SENT);
    popup.closed = true; // user closed the popup instead of clicking the link
    vi.advanceTimersByTime(150);

    await expect(p).resolves.toEqual({ status: 'sent' });
  });

  it('CU-1050: bind window elapses after send → degrades to `sent`', async () => {
    vi.useFakeTimers();
    const popup = fakePopup();
    const p = driveInterstitial(config, 'valu.jwt', {
      openPopup: () => popup,
      bindTimeoutMs: 5000,
    });

    post(MSG_CONNECT_READY);
    post(MSG_MAGIC_LINK_SENT);
    vi.advanceTimersByTime(5001); // click never landed within the bind window

    await expect(p).resolves.toEqual({ status: 'sent' });
  });

  it('ignores non-issuer-origin messages and hands the token over exactly once', async () => {
    const popup = fakePopup();
    const p = driveInterstitial(config, 'valu.jwt', { openPopup: () => popup });

    // (a) Origin guard — an attacker-origin connect-ready ALONE must not hand
    //     over the token. Asserting BEFORE any valid ping is what actually
    //     exercises the origin check: the tokenSent dedup would ALSO cap calls
    //     at 1, so a test that posts a valid ping first would pass even if the
    //     origin check were deleted. (Message dispatch is synchronous.)
    post(MSG_CONNECT_READY, 'https://evil.example');
    expect(popup.postMessage).not.toHaveBeenCalled();

    // (a′) A `linked` from an attacker origin must NOT complete the bind either.
    post(MSG_LINKED, 'https://evil.example');

    // (b) Dedup — two legitimate re-pings (the real bridge re-pings) → the
    //     token is handed over exactly once, to the issuer origin only.
    post(MSG_CONNECT_READY);
    post(MSG_CONNECT_READY);
    post(MSG_MAGIC_LINK_SENT);
    post(MSG_LINKED); // settle the flow
    const outcome = await p;

    expect(outcome).toEqual({ status: 'bound' });
    expect(popup.postMessage).toHaveBeenCalledTimes(1);
    expect(popup.postMessage).toHaveBeenCalledWith(
      { type: MSG_VALU_TOKEN, token: 'valu.jwt' },
      ISSUER_ORIGIN,
    );
  });

  it('resolves blocked when the popup cannot open', async () => {
    const outcome = await driveInterstitial(config, 'valu.jwt', { openPopup: () => null });
    expect(outcome).toEqual({ status: 'blocked' });
  });

  it('resolves dismissed when the popup closes BEFORE sending', async () => {
    vi.useFakeTimers();
    const popup = fakePopup();
    const p = driveInterstitial(config, 'valu.jwt', {
      openPopup: () => popup,
      closePollMs: 100,
    });
    popup.closed = true;
    vi.advanceTimersByTime(150);
    await expect(p).resolves.toEqual({ status: 'dismissed' });
  });

  it('resolves timed-out when the popup never signals ready', async () => {
    vi.useFakeTimers();
    const popup = fakePopup();
    const p = driveInterstitial(config, 'valu.jwt', {
      openPopup: () => popup,
      readyTimeoutMs: 5000,
    });
    vi.advanceTimersByTime(5001);
    await expect(p).resolves.toEqual({ status: 'timed-out' });
  });
});

// ===========================================================================
// ensureLinkedSession — orchestrator
// ===========================================================================

/**
 * openPopup that drives the bridge handshake all the way to `bound` on the next
 * tick (CU-1050 primary path — the bridge confirms the click via `cu-oidc:linked`).
 */
function autoBindingPopup(popup: PopupLike): () => PopupLike {
  return () => {
    setTimeout(() => {
      post(MSG_CONNECT_READY);
      post(MSG_MAGIC_LINK_SENT);
      post(MSG_LINKED);
    }, 0);
    return popup;
  };
}

/**
 * openPopup that reaches `magic-link-sent` then closes the popup WITHOUT a
 * `cu-oidc:linked` — the fallback path where the bridge couldn't confirm the
 * click (older provider / click didn't land in the popup). driveInterstitial
 * degrades to `sent`, and the orchestrator falls back to the re-exchange poll.
 */
function autoSentPopup(popup: PopupLike): () => PopupLike {
  return () => {
    setTimeout(() => {
      post(MSG_CONNECT_READY);
      post(MSG_MAGIC_LINK_SENT);
      popup.closed = true; // closed after send → `sent`, not `dismissed`
    }, 0);
    return popup;
  };
}

describe('ensureLinkedSession', () => {
  it('already linked → returns the enriched token with no interstitial', async () => {
    const openPopup = vi.fn();
    const res = await ensureLinkedSession(config, {
      valuToken: 'valu.jwt',
      fetchImpl: jsonFetch({ access_token: ENRICHED }),
      interstitial: { openPopup },
    });

    expect(res).toMatchObject({ status: 'linked', viaInterstitial: false });
    expect(openPopup).not.toHaveBeenCalled();
    // Persisted first-party by default.
    expect(readIdToken(config.tokenStorageKey)).toBe(ENRICHED);
  });

  it('CU-1050 primary path: thin → interstitial confirms bind → single re-exchange to linked', async () => {
    let call = 0;
    const fetchImpl = vi.fn(async () => {
      call += 1;
      const body = call === 1 ? { access_token: THIN } : { access_token: ENRICHED };
      return new Response(JSON.stringify(body), { status: 200 });
    }) as unknown as typeof fetch;

    const res = await ensureLinkedSession(config, {
      getValuToken: async () => 'valu.jwt',
      fetchImpl,
      interstitial: { openPopup: autoBindingPopup(fakePopup()) },
      // No poll needed on the bound path; a stub sleep would only be used by the
      // backstop poll, which we should NOT reach here.
      sleep: async () => {
        throw new Error('poll must not run on the bound path');
      },
    });

    expect(res).toMatchObject({ status: 'linked', viaInterstitial: true });
    // Exactly two exchanges: initial (thin) + the single bound re-exchange.
    expect(call).toBe(2);
  });

  it('CU-1050 fallback path: thin → bind unconfirmed (`sent`) → backstop poll re-exchanges to linked', async () => {
    let call = 0;
    const fetchImpl = vi.fn(async () => {
      call += 1;
      const body = call === 1 ? { access_token: THIN } : { access_token: ENRICHED };
      return new Response(JSON.stringify(body), { status: 200 });
    }) as unknown as typeof fetch;

    const res = await ensureLinkedSession(config, {
      getValuToken: async () => 'valu.jwt',
      fetchImpl,
      interstitial: { openPopup: autoSentPopup(fakePopup()), closePollMs: 20 },
      sleep: async () => {}, // no real delay between poll attempts
    });

    expect(res).toMatchObject({ status: 'linked', viaInterstitial: true });
    // First exchange (thin) + at least one re-exchange poll (enriched).
    expect(call).toBeGreaterThanOrEqual(2);
  });

  it('thin → user dismisses the interstitial → dismissed', async () => {
    const popup = fakePopup();
    const openPopup = () => {
      setTimeout(() => {
        popup.closed = true;
      }, 0);
      return popup;
    };
    const res = await ensureLinkedSession(config, {
      valuToken: 'valu.jwt',
      fetchImpl: jsonFetch({ access_token: THIN }),
      interstitial: { openPopup, closePollMs: 20 },
      sleep: async () => {},
    });
    expect(res).toEqual({ status: 'dismissed' });
  });

  it('thin + waitForLink:false → returns pending immediately after send (fallback path)', async () => {
    const res = await ensureLinkedSession(config, {
      valuToken: 'valu.jwt',
      fetchImpl: jsonFetch({ access_token: THIN }),
      interstitial: { openPopup: autoSentPopup(fakePopup()), closePollMs: 20 },
      waitForLink: false,
    });
    expect(res).toEqual({ status: 'pending' });
  });

  it('throws when given neither valuToken nor getValuToken', async () => {
    await expect(
      ensureLinkedSession(config, { fetchImpl: jsonFetch({ access_token: THIN }) }),
    ).rejects.toMatchObject({ name: 'CuOidcConnectError', reason: 'no_valu_token_source' });
  });

  it('static token rejected mid-poll → pending WITH lastError (not a silent false pending)', async () => {
    // First exchange is thin; the interstitial sends; then the static token is
    // rejected on re-exchange (expired). With no getValuToken there is nothing
    // fresh to re-mint, so the poll must break out and surface the error rather
    // than spin to the deadline and return a bare `pending` — which would hide
    // a link that may already be complete server-side.
    let call = 0;
    const fetchImpl = vi.fn(async () => {
      call += 1;
      if (call === 1) return new Response(JSON.stringify({ access_token: THIN }), { status: 200 });
      return new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 });
    }) as unknown as typeof fetch;

    const res = await ensureLinkedSession(config, {
      valuToken: 'valu.jwt', // static — cannot re-mint
      fetchImpl,
      interstitial: { openPopup: autoSentPopup(fakePopup()), closePollMs: 20 },
      sleep: async () => {},
    });

    expect(res.status).toBe('pending');
    const { lastError } = res as { lastError?: CuOidcConnectError };
    expect(lastError).toBeInstanceOf(CuOidcConnectError);
    expect(lastError?.reason).toBe('exchange_failed');
    // Broke on the first failed poll (1 first-exchange + 1 poll) — no spinning.
    expect(call).toBe(2);
  });

  // --- shared-device confirmation gate (CU-1051 — pins the bound Valu sub) ----

  it('shared-device gate: thin + confirmIdentity → false → declined, popup never opens, nothing persisted', async () => {
    const openPopup = vi.fn();
    const confirmIdentity = vi.fn(async () => false);

    const res = await ensureLinkedSession(config, {
      valuToken: VALU_TOKEN,
      fetchImpl: jsonFetch({ access_token: THIN }),
      confirmIdentity,
      interstitial: { openPopup },
    });

    expect(res).toEqual({ status: 'declined' });
    // The gate is pinned to the EXACT sub about to be bound (CU-1051 C1).
    expect(confirmIdentity).toHaveBeenCalledTimes(1);
    expect(confirmIdentity).toHaveBeenCalledWith(VALU_SUB);
    // The gate fires BEFORE the interstitial — no popup, no bind attempted...
    expect(openPopup).not.toHaveBeenCalled();
    // ...and a decline leaves NO first-party session behind.
    expect(readIdToken(config.tokenStorageKey)).toBeNull();
  });

  it('shared-device gate: thin + confirmIdentity → true (receives the bound sub) → proceeds to the bind', async () => {
    let call = 0;
    const fetchImpl = vi.fn(async () => {
      call += 1;
      const body = call === 1 ? { access_token: THIN } : { access_token: ENRICHED };
      return new Response(JSON.stringify(body), { status: 200 });
    }) as unknown as typeof fetch;
    const confirmIdentity = vi.fn(() => true);

    const res = await ensureLinkedSession(config, {
      getValuToken: async () => VALU_TOKEN,
      fetchImpl,
      confirmIdentity,
      interstitial: { openPopup: autoBindingPopup(fakePopup()) },
      sleep: async () => {
        throw new Error('poll must not run on the bound path');
      },
    });

    expect(confirmIdentity).toHaveBeenCalledTimes(1);
    expect(confirmIdentity).toHaveBeenCalledWith(VALU_SUB);
    expect(res).toMatchObject({ status: 'linked', viaInterstitial: true });
  });

  it('shared-device gate: confirmIdentity throws → rejects fail-closed, popup never opens, nothing persisted', async () => {
    const openPopup = vi.fn();
    const boom = new Error('valu profile fetch failed');
    const confirmIdentity = vi.fn(async () => {
      throw boom;
    });

    // A gate that cannot decide must fail CLOSED — the rejection propagates and
    // no bind is attempted, rather than falling through to staple an
    // unconfirmed sub to the email.
    await expect(
      ensureLinkedSession(config, {
        valuToken: VALU_TOKEN,
        fetchImpl: jsonFetch({ access_token: THIN }),
        confirmIdentity,
        interstitial: { openPopup },
      }),
    ).rejects.toBe(boom);

    expect(openPopup).not.toHaveBeenCalled();
    expect(readIdToken(config.tokenStorageKey)).toBeNull();
  });

  it('CU-1051 C1: the confirmed sub IS the bound sub — one mint feeds both gate and interstitial', async () => {
    // getValuToken yields a DIFFERENT identity once the bound token is already in
    // hand, simulating a shared-device session flip mid-flow. Because the fix
    // mints the bound token ONCE and reuses it, the sub shown to the human MUST
    // equal the sub posted to the interstitial — a later re-mint cannot swap the
    // identity out from under the confirmation (the TOCTOU the old double-mint
    // allowed). Sequence: mint#1=first-exchange, mint#2=boundToken (gate +
    // interstitial), mint#3+=the bound re-exchange, which we let drift to ATTACKER
    // to prove the popup still received mint#2.
    const ATTACKER = jwt({
      sub: 'valu-attacker',
      iss: 'https://api.roomful.net',
      aud: 'cu-test-harness',
      iat: nowSec,
      exp: nowSec + 300,
    });
    const seq = [VALU_TOKEN, VALU_TOKEN, ATTACKER, ATTACKER, ATTACKER];
    let n = 0;
    const getValuToken = () => seq[Math.min(n++, seq.length - 1)];

    const popup = fakePopup();
    let confirmedSub: string | null = 'UNSET';
    const confirmIdentity = vi.fn((sub: string | null) => {
      confirmedSub = sub;
      return true;
    });

    await ensureLinkedSession(config, {
      getValuToken,
      fetchImpl: jsonFetch({ access_token: THIN }), // always thin → reaches the bind, stays thin after
      confirmIdentity,
      interstitial: { openPopup: autoBindingPopup(popup) },
      sleep: async () => {},
      pollTimeoutMs: 0, // don't spin the backstop poll — we only inspect what was posted
    });

    // The Valu token actually handed to the interstitial (posted to the popup)...
    const handoff = popup.postMessage.mock.calls.find(
      ([msg]) => (msg as { type?: string } | undefined)?.type === MSG_VALU_TOKEN,
    )?.[0] as { token: string } | undefined;
    const boundSub = getClaims(handoff?.token ?? '')?.sub ?? null;

    // ...decodes to the SAME sub the human confirmed — never mint#3 (ATTACKER).
    expect(confirmedSub).toBe(VALU_SUB);
    expect(boundSub).toBe(VALU_SUB);
    expect(confirmedSub).toBe(boundSub);
  });

  it('shared-device gate: opaque/undecodable Valu token → confirmIdentity receives null (cannot confirm)', async () => {
    // getClaims returns null (never throws) for a token it cannot decode, so a
    // garbage/opaque Valu token surfaces as a null sub. The gate STILL fires and
    // hands the consumer `null` to treat as "cannot confirm" — it must not be
    // silently coerced into a pass.
    const confirmIdentity = vi.fn(() => false);
    const res = await ensureLinkedSession(config, {
      valuToken: 'opaque-not-a-jwt',
      fetchImpl: jsonFetch({ access_token: THIN }),
      confirmIdentity,
      interstitial: { openPopup: vi.fn() },
    });
    expect(res).toEqual({ status: 'declined' });
    expect(confirmIdentity).toHaveBeenCalledWith(null);
  });

  it('shared-device gate: confirmIdentity returns undefined (forgotten return) → fail-closed to declined', async () => {
    const openPopup = vi.fn();
    // A consumer that forgets to `return` yields undefined → falsy → the gate
    // declines rather than falling through to a bind. `!confirmed` fails closed.
    const confirmIdentity = vi.fn(() => undefined as unknown as boolean);
    const res = await ensureLinkedSession(config, {
      valuToken: VALU_TOKEN,
      fetchImpl: jsonFetch({ access_token: THIN }),
      confirmIdentity,
      interstitial: { openPopup },
    });
    expect(res).toEqual({ status: 'declined' });
    expect(openPopup).not.toHaveBeenCalled();
  });

  it('shared-device gate: already linked → confirmIdentity is NOT called (no bind, no prompt)', async () => {
    const confirmIdentity = vi.fn(() => false);

    const res = await ensureLinkedSession(config, {
      valuToken: 'valu.jwt',
      fetchImpl: jsonFetch({ access_token: ENRICHED }),
      confirmIdentity,
    });

    expect(res).toMatchObject({ status: 'linked', viaInterstitial: false });
    // A returning (already-linked) user is never prompted — the gate guards the
    // thin/bind path only, so a `false`-returning gate can't block a linked user.
    expect(confirmIdentity).not.toHaveBeenCalled();
  });
});
