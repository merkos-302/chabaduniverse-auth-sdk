/**
 * One-shot console warnings for deprecated / invalid SDK options.
 *
 * Tracks which (kind, optionName) pairs have already produced a warning during
 * the lifetime of this module so we don't spam consumers on every render.
 * Test-only `__resetDeprecationWarnings` clears the tracking Set.
 */

const warned = new Set<string>();

function warnOnce(key: string, message: string): void {
  if (warned.has(key)) return;
  warned.add(key);
  // eslint-disable-next-line no-console
  console.warn(message);
}

/**
 * Emit a deprecation warning the first time `optionName` is reported.
 * Subsequent calls with the same `optionName` are no-ops.
 */
export function warnDeprecatedOption(optionName: string, replacementHint: string): void {
  warnOnce(
    `deprecated:${optionName}`,
    `[@chabaduniverse/auth-sdk] \`${optionName}\` is deprecated and will be removed in a future major version. ${replacementHint}`,
  );
}

/**
 * Emit an invalid-value warning the first time `optionName` is reported.
 * Subsequent calls with the same `optionName` are no-ops.
 */
export function warnInvalidOption(optionName: string, detail: string): void {
  warnOnce(
    `invalid:${optionName}`,
    `[@chabaduniverse/auth-sdk] Invalid \`${optionName}\` option: ${detail}`,
  );
}

/** Test-only: reset the one-shot tracking. */
export function __resetDeprecationWarnings(): void {
  warned.clear();
}
