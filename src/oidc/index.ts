/**
 * OIDC Module
 *
 * Merkos OIDC authentication for sibling apps inside Chabad Universe iframes.
 * Provides a 3-step fallback: localStorage cache -> CDSSO -> popup reconnect.
 */

// Hooks
export { useMerkosOIDC } from './useMerkosOIDC';
export { useMerkosAuth, useMerkosAuth as useMerkosOIDCAuth } from './useMerkosAuth';

// Types & Constants
export {
  MERKOS_AUTH_MESSAGE_TYPE,
  DEFAULT_AUTH_URL,
  DEFAULT_RECONNECT_URL,
  DEFAULT_STORAGE_KEY,
  DEFAULT_ENVIRONMENT,
  ENVIRONMENT_URLS,
  BROADCAST_CHANNEL_NAME,
} from './types';

export type {
  MerkosAuthTokenMessage,
  MerkosAuthMethod,
  MerkosReconnectMode,
  MerkosEnvironment,
  UseMerkosOIDCOptions,
  UseMerkosOIDCReturn,
  UseMerkosAuthOptions,
  UseMerkosAuthReturn,
} from './types';
