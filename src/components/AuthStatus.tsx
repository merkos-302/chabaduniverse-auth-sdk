// AuthStatus component - debug/status display
import { useUniverseAuth } from '../hooks/useUniverseAuth';
import { useAuthStatus } from '../hooks/useAuthStatus';
import type { AuthStatusProps } from '../types/components';

/**
 * AuthStatus - Debug/status component showing current auth state
 *
 * Useful for development and debugging authentication flows.
 * Should NOT be used in production with showTokens enabled.
 *
 * @example
 * ```tsx
 * // Basic status display
 * <AuthStatus />
 *
 * // Full debug info (development only!)
 * <AuthStatus
 *   showProviders
 *   showUser
 *   showTokens
 *   showErrors
 * />
 *
 * // Compact mode
 * <AuthStatus compact />
 * ```
 */
export function AuthStatus({
  showProviders = true,
  showUser = true,
  showTokens = false,
  showErrors = true,
  compact = false,
  className = '',
  style,
  testId = 'auth-status',
}: AuthStatusProps) {
  const { user, providers, error, status, isAuthenticated, isLoading, isInitialized } =
    useUniverseAuth();
  const { isFullyAuthenticated, isPartiallyAuthenticated, needsLinking, getStatusMessage } =
    useAuthStatus();

  const baseClass = 'universe-auth-status';
  const compactClass = compact ? `${baseClass}--compact` : '';
  const fullClassName = [baseClass, compactClass, className].filter(Boolean).join(' ');

  // Compact mode
  if (compact) {
    return (
      <div className={fullClassName} style={style} data-testid={testId}>
        <span className={`${baseClass}__badge ${baseClass}__badge--${status.toLowerCase()}`}>
          {status}
        </span>
        {isLoading && <span className={`${baseClass}__loading`}>Loading...</span>}
        {user && <span className={`${baseClass}__user-compact`}>{user.displayName}</span>}
      </div>
    );
  }

  return (
    <div className={fullClassName} style={style} data-testid={testId}>
      <div className={`${baseClass}__header`}>
        <h4 className={`${baseClass}__title`}>Auth Status</h4>
        <span className={`${baseClass}__badge ${baseClass}__badge--${status.toLowerCase()}`}>
          {status}
        </span>
      </div>

      {/* Status Message */}
      <div className={`${baseClass}__message`}>{getStatusMessage()}</div>

      {/* Flags */}
      <div className={`${baseClass}__flags`}>
        <StatusFlag label="Authenticated" value={isAuthenticated} />
        <StatusFlag label="Loading" value={isLoading} />
        <StatusFlag label="Initialized" value={isInitialized} />
        <StatusFlag label="Fully Auth'd" value={isFullyAuthenticated} />
        <StatusFlag label="Partially Auth'd" value={isPartiallyAuthenticated} />
        <StatusFlag label="Needs Linking" value={needsLinking} />
      </div>

      {/* User Info */}
      {showUser && user && (
        <div className={`${baseClass}__section`}>
          <h5 className={`${baseClass}__section-title`}>User</h5>
          <div className={`${baseClass}__user`}>
            {user.avatarUrl && (
              <img
                src={user.avatarUrl}
                alt={user.displayName}
                className={`${baseClass}__user-avatar`}
              />
            )}
            <div className={`${baseClass}__user-info`}>
              <span className={`${baseClass}__user-name`}>{user.displayName}</span>
              {user.email && <span className={`${baseClass}__user-email`}>{user.email}</span>}
              <span className={`${baseClass}__user-id`}>ID: {user.id}</span>
              {user.linkedAccounts && (
                <span className={`${baseClass}__user-linked`}>
                  Linked: {user.linkedAccounts.join(', ')}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Provider Status */}
      {showProviders && (
        <div className={`${baseClass}__section`}>
          <h5 className={`${baseClass}__section-title`}>Providers</h5>

          <div className={`${baseClass}__providers`}>
            {/* Merkos */}
            <div className={`${baseClass}__provider`}>
              <span className={`${baseClass}__provider-name`}>Merkos</span>
              <StatusBadge connected={providers.merkos.isAuthenticated} />
              {providers.merkos.user && (
                <span className={`${baseClass}__provider-user`}>
                  {providers.merkos.user.name ?? providers.merkos.user.email}
                </span>
              )}
              {showTokens && providers.merkos.token && (
                <code className={`${baseClass}__token`}>
                  {maskToken(providers.merkos.token)}
                </code>
              )}
            </div>

            {/* Valu */}
            <div className={`${baseClass}__provider`}>
              <span className={`${baseClass}__provider-name`}>Valu</span>
              <StatusBadge connected={providers.valu.isAuthenticated} />
              <span className={`${baseClass}__provider-detail`}>
                {providers.valu.isInIframe ? 'In iframe' : 'Not in iframe'}
              </span>
              {providers.valu.isConnected && (
                <span className={`${baseClass}__provider-detail`}>Connected</span>
              )}
              {providers.valu.user && (
                <span className={`${baseClass}__provider-user`}>
                  {providers.valu.user.displayName ?? providers.valu.user.email}
                </span>
              )}
            </div>

            {/* Universe (Linked Status) */}
            <div className={`${baseClass}__provider`}>
              <span className={`${baseClass}__provider-name`}>Universe</span>
              <span className={`${baseClass}__provider-detail`}>
                {providers.universe.isLinked ? 'Linked' : 'Not linked'}
              </span>
              {providers.universe.primaryProvider && (
                <span className={`${baseClass}__provider-detail`}>
                  Primary: {providers.universe.primaryProvider}
                </span>
              )}
              {providers.universe.linkedProviders.length > 0 && (
                <span className={`${baseClass}__provider-detail`}>
                  Providers: {providers.universe.linkedProviders.join(', ')}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Errors */}
      {showErrors && error && (
        <div className={`${baseClass}__section ${baseClass}__section--error`}>
          <h5 className={`${baseClass}__section-title`}>Error</h5>
          <div className={`${baseClass}__error`}>
            <span className={`${baseClass}__error-code`}>{error.code}</span>
            <span className={`${baseClass}__error-message`}>{error.message}</span>
            {error.provider && (
              <span className={`${baseClass}__error-provider`}>Provider: {error.provider}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Status flag component
 */
function StatusFlag({ label, value }: { label: string; value: boolean }) {
  return (
    <span className={`universe-auth-status__flag ${value ? 'universe-auth-status__flag--true' : ''}`}>
      <span className="universe-auth-status__flag-indicator">{value ? '✓' : '✗'}</span>
      <span className="universe-auth-status__flag-label">{label}</span>
    </span>
  );
}

/**
 * Status badge component
 */
function StatusBadge({ connected }: { connected: boolean }) {
  return (
    <span
      className={`universe-auth-status__status-badge ${
        connected
          ? 'universe-auth-status__status-badge--connected'
          : 'universe-auth-status__status-badge--disconnected'
      }`}
    >
      {connected ? 'Connected' : 'Not connected'}
    </span>
  );
}

/**
 * Mask a token for display
 */
function maskToken(token: string): string {
  if (token.length <= 8) return '••••••••';
  return token.substring(0, 4) + '••••••••' + token.substring(token.length - 4);
}
