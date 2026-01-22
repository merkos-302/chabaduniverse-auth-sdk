/**
 * Component prop type definitions for @chabaduniverse/auth-sdk
 *
 * These types define the props for pre-built UI components.
 */

import type { ReactNode, CSSProperties } from 'react';
import type { AuthProvider } from './user';

/**
 * Common props shared across auth components
 */
export interface AuthComponentBaseProps {
  /** Additional CSS class name */
  className?: string;
  /** Inline styles */
  style?: CSSProperties;
  /** Test ID for testing */
  testId?: string;
}

/**
 * Props for LoginButton component
 */
export interface LoginButtonProps extends AuthComponentBaseProps {
  /**
   * Which provider to authenticate with
   * - 'auto': Automatically choose best provider (default)
   * - 'valu': Force Valu authentication
   * - 'merkos': Force Merkos authentication
   */
  provider?: 'auto' | AuthProvider;

  /** Button variant style */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';

  /** Button size */
  size?: 'sm' | 'md' | 'lg';

  /** Button content (overrides default text) */
  children?: ReactNode;

  /** Loading indicator element */
  loadingIndicator?: ReactNode;

  /** Whether button is disabled */
  disabled?: boolean;

  /** Callback before login attempt */
  onBeforeLogin?: () => void | Promise<void>;

  /** Callback after successful login */
  onLoginSuccess?: () => void;

  /** Callback on login error */
  onLoginError?: (error: Error) => void;

  /** Redirect URL after login */
  redirectUrl?: string;

  /** Whether to show provider icon */
  showIcon?: boolean;
}

/**
 * Props for AuthGuard component
 */
export interface AuthGuardProps {
  /** Content to render when authenticated */
  children: ReactNode;

  /**
   * What to render while checking auth
   * - ReactNode: Custom loading component
   * - true: Show default loading indicator
   * - false/undefined: Show nothing while loading
   */
  fallback?: ReactNode;

  /**
   * What to render when not authenticated
   * - ReactNode: Custom unauthenticated component
   * - undefined: Render nothing
   */
  unauthenticatedFallback?: ReactNode;

  /**
   * Require specific provider authentication
   * - undefined: Any provider is sufficient
   * - 'merkos' | 'valu': Require specific provider
   * - ['merkos', 'valu']: Require all specified providers
   */
  requiredProvider?: AuthProvider | AuthProvider[];

  /** Require specific role(s) */
  requiredRoles?: string | string[];

  /** Require specific permission(s) */
  requiredPermissions?: string | string[];

  /** URL to redirect to when not authenticated */
  redirectTo?: string;

  /** Callback when authentication fails requirement */
  onAuthFailure?: (reason: AuthGuardFailureReason) => void;
}

/**
 * Reason why AuthGuard prevented access
 */
export interface AuthGuardFailureReason {
  /** Type of failure */
  type:
    | 'not_authenticated'
    | 'provider_required'
    | 'role_required'
    | 'permission_required';
  /** Missing requirements */
  missing?: string[];
  /** Required values */
  required?: string[];
}

/**
 * Props for UserMenu component
 */
export interface UserMenuProps extends AuthComponentBaseProps {
  /** Menu trigger element (default: avatar with name) */
  trigger?: ReactNode;

  /** Whether to show connected providers */
  showProviders?: boolean;

  /** Whether to show user's email */
  showEmail?: boolean;

  /** Whether to show avatar */
  showAvatar?: boolean;

  /** Avatar size */
  avatarSize?: 'sm' | 'md' | 'lg';

  /** Custom menu items to add */
  menuItems?: UserMenuItem[];

  /** Callback on logout */
  onLogout?: () => void;

  /** Logout button text */
  logoutText?: string;

  /** Whether to redirect after logout */
  redirectOnLogout?: boolean;

  /** URL to redirect to after logout */
  logoutRedirectUrl?: string;

  /** Menu placement */
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
}

/**
 * Custom menu item for UserMenu
 */
export interface UserMenuItem {
  /** Unique key for the item */
  key: string;
  /** Display label */
  label: ReactNode;
  /** Icon to show (optional) */
  icon?: ReactNode;
  /** Click handler */
  onClick?: () => void;
  /** Link href (optional) */
  href?: string;
  /** Whether item is disabled */
  disabled?: boolean;
  /** Whether to show separator after this item */
  divider?: boolean;
}

/**
 * Props for AuthStatus component (debug/status display)
 */
export interface AuthStatusProps extends AuthComponentBaseProps {
  /** Whether to show detailed provider info */
  showProviders?: boolean;
  /** Whether to show user details */
  showUser?: boolean;
  /** Whether to show tokens (careful in production!) */
  showTokens?: boolean;
  /** Whether to show error details */
  showErrors?: boolean;
  /** Compact display mode */
  compact?: boolean;
}

/**
 * Props for ProviderButton component
 */
export interface ProviderButtonProps extends AuthComponentBaseProps {
  /** Which provider this button is for */
  provider: AuthProvider;
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'outline';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Whether button is disabled */
  disabled?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Custom label (default: "Connect with {Provider}") */
  children?: ReactNode;
  /** Whether to show provider logo */
  showLogo?: boolean;
}

/**
 * Props for LinkedAccounts component
 */
export interface LinkedAccountsProps extends AuthComponentBaseProps {
  /** Whether to show link/unlink buttons */
  showActions?: boolean;
  /** Whether to show connection status */
  showStatus?: boolean;
  /** Callback when account is linked */
  onLink?: (provider: AuthProvider) => void;
  /** Callback when account is unlinked */
  onUnlink?: (provider: AuthProvider) => void;
}
