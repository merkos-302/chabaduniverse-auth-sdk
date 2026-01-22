import { useState, useCallback } from 'react';
import { useUniverseAuth } from '../hooks/useUniverseAuth';
import type { LoginButtonProps } from '../types/components';

/**
 * LoginButton - Pre-built button component for triggering authentication
 *
 * @example
 * ```tsx
 * // Basic usage
 * <LoginButton />
 *
 * // With specific provider
 * <LoginButton provider="merkos" />
 *
 * // Styled variant
 * <LoginButton variant="primary" size="lg">
 *   Sign In
 * </LoginButton>
 *
 * // With callbacks
 * <LoginButton
 *   onLoginSuccess={() => navigate('/dashboard')}
 *   onLoginError={(error) => console.error(error)}
 * />
 * ```
 */
export function LoginButton({
  provider = 'auto',
  variant = 'primary',
  size = 'md',
  children,
  loadingIndicator,
  disabled = false,
  onBeforeLogin,
  onLoginSuccess,
  onLoginError,
  redirectUrl,
  showIcon = true,
  className = '',
  style,
  testId = 'login-button',
}: LoginButtonProps) {
  const { login, isLoading, isAuthenticated } = useUniverseAuth();
  const [isLoginPending, setIsLoginPending] = useState(false);

  const handleClick = useCallback(async () => {
    if (disabled || isLoading || isLoginPending || isAuthenticated) {
      return;
    }

    try {
      setIsLoginPending(true);

      // Call before login hook
      if (onBeforeLogin) {
        await onBeforeLogin();
      }

      // Determine provider to use
      const targetProvider = provider === 'auto' ? 'merkos' : provider;

      // Trigger login
      await login({ provider: targetProvider });

      // Call success callback
      onLoginSuccess?.();

      // Redirect if specified
      if (redirectUrl && typeof window !== 'undefined') {
        window.location.href = redirectUrl;
      }
    } catch (error) {
      onLoginError?.(error instanceof Error ? error : new Error('Login failed'));
    } finally {
      setIsLoginPending(false);
    }
  }, [
    disabled,
    isLoading,
    isLoginPending,
    isAuthenticated,
    provider,
    login,
    onBeforeLogin,
    onLoginSuccess,
    onLoginError,
    redirectUrl,
  ]);

  // Generate class names based on props
  const baseClass = 'universe-auth-login-button';
  const variantClass = `${baseClass}--${variant}`;
  const sizeClass = `${baseClass}--${size}`;
  const disabledClass = disabled || isLoading || isLoginPending ? `${baseClass}--disabled` : '';
  const fullClassName = [baseClass, variantClass, sizeClass, disabledClass, className]
    .filter(Boolean)
    .join(' ');

  // Determine button content
  const isLoadingState = isLoading || isLoginPending;
  const buttonContent = isLoadingState
    ? loadingIndicator ?? 'Loading...'
    : children ?? getDefaultLabel(provider, showIcon);

  // If already authenticated, hide the button
  if (isAuthenticated) {
    return null;
  }

  return (
    <button
      type="button"
      className={fullClassName}
      style={style}
      onClick={() => void handleClick()}
      disabled={disabled || isLoadingState}
      data-testid={testId}
      data-provider={provider}
      data-variant={variant}
      data-size={size}
    >
      {buttonContent}
    </button>
  );
}

/**
 * Get default button label based on provider
 */
function getDefaultLabel(provider: 'auto' | 'merkos' | 'valu', _showIcon: boolean): string {
  const labels: Record<string, string> = {
    auto: 'Sign In',
    merkos: 'Sign in with Merkos',
    valu: 'Connect with Valu',
  };

  const label = labels[provider] ?? 'Sign In';
  return label;
}
