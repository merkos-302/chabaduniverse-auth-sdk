import { useUniverseAuth } from '../hooks/useUniverseAuth';
import type { AuthGuardProps } from '../types/components';

/**
 * AuthGuard - Protects routes/components that require authentication
 *
 * @example
 * ```tsx
 * <AuthGuard
 *   fallback={<Spinner />}
 *   unauthenticatedFallback={<LoginPage />}
 * >
 *   <ProtectedContent />
 * </AuthGuard>
 * ```
 */
export function AuthGuard({
  children,
  fallback = null,
  unauthenticatedFallback,
  requiredProvider,
  requiredRoles,
  requiredPermissions,
  redirectTo,
  onAuthFailure,
}: AuthGuardProps) {
  const { isAuthenticated, isLoading, isAuthenticatedWith, hasRole, hasPermission } =
    useUniverseAuth();

  // Show fallback while loading
  if (isLoading) {
    if (fallback === true) {
      return <div>Loading...</div>;
    }
    return <>{fallback}</>;
  }

  // Check authentication
  if (!isAuthenticated) {
    onAuthFailure?.({ type: 'not_authenticated' });
    if (redirectTo && typeof window !== 'undefined') {
      window.location.href = redirectTo;
      return null;
    }
    return <>{unauthenticatedFallback}</>;
  }

  // Check required providers
  if (requiredProvider) {
    const providers = Array.isArray(requiredProvider)
      ? requiredProvider
      : [requiredProvider];
    const missingProviders = providers.filter((p) => !isAuthenticatedWith(p));
    if (missingProviders.length > 0) {
      onAuthFailure?.({
        type: 'provider_required',
        missing: missingProviders,
        required: providers,
      });
      return <>{unauthenticatedFallback}</>;
    }
  }

  // Check required roles
  if (requiredRoles) {
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    const missingRoles = roles.filter((r) => !hasRole(r));
    if (missingRoles.length > 0) {
      onAuthFailure?.({
        type: 'role_required',
        missing: missingRoles,
        required: roles,
      });
      return <>{unauthenticatedFallback}</>;
    }
  }

  // Check required permissions
  if (requiredPermissions) {
    const perms = Array.isArray(requiredPermissions)
      ? requiredPermissions
      : [requiredPermissions];
    const missingPerms = perms.filter((p) => !hasPermission(p));
    if (missingPerms.length > 0) {
      onAuthFailure?.({
        type: 'permission_required',
        missing: missingPerms,
        required: perms,
      });
      return <>{unauthenticatedFallback}</>;
    }
  }

  return <>{children}</>;
}
