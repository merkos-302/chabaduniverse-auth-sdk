/**
 * useProviders Hook - Direct access to individual provider states
 *
 * Provides access to Valu and Merkos provider states separately.
 * Useful when you need provider-specific functionality.
 *
 * @example
 * ```tsx
 * import { useProviders } from '@chabaduniverse/auth-sdk';
 *
 * function MyComponent() {
 *   const { valu, merkos, isProviderAuthenticated } = useProviders();
 *
 *   if (isProviderAuthenticated('valu')) {
 *     // Show Valu-specific features
 *   }
 *
 *   return <div>Merkos User: {merkos.user?.name}</div>;
 * }
 * ```
 */

import { useUniverseAuthContext } from '../providers/UniverseAuthProvider';
import type { UseProvidersReturn } from '../types/hooks';
import type { AuthProvider, ValuUser, MerkosUser } from '../types/user';

/**
 * useProviders hook
 *
 * Returns individual provider states and helper functions.
 *
 * @returns UseProvidersReturn - Provider states and helpers
 */
export function useProviders(): UseProvidersReturn {
  const context = useUniverseAuthContext();

  const isProviderAuthenticated = (provider: AuthProvider): boolean => {
    if (provider === 'merkos') {
      return context.providers.merkos.isAuthenticated;
    }
    if (provider === 'valu') {
      return context.providers.valu.isAuthenticated;
    }
    return false;
  };

  const getProviderUser = (provider: AuthProvider): ValuUser | MerkosUser | null => {
    if (provider === 'merkos') {
      return context.providers.merkos.user;
    }
    if (provider === 'valu') {
      return context.providers.valu.user;
    }
    return null;
  };

  return {
    providers: context.providers,
    valu: context.providers.valu,
    merkos: context.providers.merkos,
    isProviderAuthenticated,
    getProviderUser,
  };
}

/**
 * useValuProvider hook
 *
 * Returns Valu-specific state. Must be used within UniverseAuthProvider.
 */
export function useValuProvider() {
  const context = useUniverseAuthContext();
  return context.providers.valu;
}

/**
 * useMerkosProvider hook
 *
 * Returns Merkos-specific state. Must be used within UniverseAuthProvider.
 */
export function useMerkosProvider() {
  const context = useUniverseAuthContext();
  return context.providers.merkos;
}

/**
 * useUniverseProvider hook
 *
 * Returns unified universe provider state (linking info, primary provider).
 */
export function useUniverseProvider() {
  const context = useUniverseAuthContext();
  return context.providers.universe;
}
