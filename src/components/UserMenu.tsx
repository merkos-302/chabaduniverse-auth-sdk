import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useUniverseAuth } from '../hooks/useUniverseAuth';
import type { UserMenuProps, UserMenuItem } from '../types/components';

/**
 * UserMenu - Dropdown menu showing user info with logout
 *
 * @example
 * ```tsx
 * // Basic usage
 * <UserMenu />
 *
 * // With custom options
 * <UserMenu
 *   showProviders
 *   showEmail
 *   onLogout={() => console.log('Logged out')}
 * />
 *
 * // With custom menu items
 * <UserMenu
 *   menuItems={[
 *     { key: 'profile', label: 'Profile', onClick: () => navigate('/profile') },
 *     { key: 'settings', label: 'Settings', href: '/settings', divider: true },
 *   ]}
 * />
 * ```
 */
export function UserMenu({
  trigger,
  showProviders = false,
  showEmail = true,
  showAvatar = true,
  avatarSize = 'md',
  menuItems = [],
  onLogout,
  logoutText = 'Sign Out',
  redirectOnLogout = false,
  logoutRedirectUrl = '/',
  placement = 'bottom-end',
  className = '',
  style,
  testId = 'user-menu',
}: UserMenuProps) {
  const { user, isAuthenticated, logout, providers } = useUniverseAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      onLogout?.();
      setIsOpen(false);

      if (redirectOnLogout && typeof window !== 'undefined') {
        window.location.href = logoutRedirectUrl;
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [logout, onLogout, redirectOnLogout, logoutRedirectUrl]);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
    }
  }, []);

  // Don't render if not authenticated
  if (!isAuthenticated || !user) {
    return null;
  }

  const displayName = user.displayName || user.email || 'User';
  const avatarUrl = user.avatarUrl;
  const initials = getInitials(displayName);

  // Avatar size mapping
  const avatarSizes = {
    sm: 24,
    md: 32,
    lg: 40,
  };

  const baseClass = 'universe-auth-user-menu';
  const fullClassName = [baseClass, className].filter(Boolean).join(' ');

  // Default trigger
  const defaultTrigger = (
    <button
      type="button"
      className={`${baseClass}__trigger`}
      onClick={handleToggle}
      aria-haspopup="true"
      aria-expanded={isOpen}
    >
      {showAvatar && (
        <span
          className={`${baseClass}__avatar ${baseClass}__avatar--${avatarSize}`}
          style={{
            width: avatarSizes[avatarSize],
            height: avatarSizes[avatarSize],
          }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} />
          ) : (
            <span className={`${baseClass}__initials`}>{initials}</span>
          )}
        </span>
      )}
      <span className={`${baseClass}__name`}>{displayName}</span>
      <span className={`${baseClass}__caret`}>&#9662;</span>
    </button>
  );

  return (
    <div
      ref={menuRef}
      className={fullClassName}
      style={style}
      data-testid={testId}
      data-placement={placement}
      onKeyDown={handleKeyDown}
    >
      {trigger ? (
        <div onClick={handleToggle} role="button" tabIndex={0}>
          {trigger}
        </div>
      ) : (
        defaultTrigger
      )}

      {isOpen && (
        <div className={`${baseClass}__dropdown ${baseClass}__dropdown--${placement}`} role="menu">
          {/* User Info Header */}
          <div className={`${baseClass}__header`}>
            <span className={`${baseClass}__header-name`}>{displayName}</span>
            {showEmail && user.email && (
              <span className={`${baseClass}__header-email`}>{user.email}</span>
            )}
          </div>

          {/* Provider Status */}
          {showProviders && (
            <div className={`${baseClass}__providers`}>
              <div className={`${baseClass}__provider`}>
                <span className={`${baseClass}__provider-name`}>Merkos</span>
                <span
                  className={`${baseClass}__provider-status ${
                    providers.merkos.isAuthenticated ? `${baseClass}__provider-status--connected` : ''
                  }`}
                >
                  {providers.merkos.isAuthenticated ? 'Connected' : 'Not connected'}
                </span>
              </div>
              <div className={`${baseClass}__provider`}>
                <span className={`${baseClass}__provider-name`}>Valu</span>
                <span
                  className={`${baseClass}__provider-status ${
                    providers.valu.isAuthenticated ? `${baseClass}__provider-status--connected` : ''
                  }`}
                >
                  {providers.valu.isAuthenticated ? 'Connected' : 'Not connected'}
                </span>
              </div>
            </div>
          )}

          {/* Custom Menu Items */}
          {menuItems.length > 0 && (
            <div className={`${baseClass}__items`}>
              {menuItems.map((item) => (
                <React.Fragment key={item.key}>
                  {renderMenuItem(item, baseClass, () => setIsOpen(false))}
                  {item.divider && <div className={`${baseClass}__divider`} />}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Logout */}
          <div className={`${baseClass}__footer`}>
            <button
              type="button"
              className={`${baseClass}__logout`}
              onClick={() => void handleLogout()}
              role="menuitem"
            >
              {logoutText}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Get initials from name
 */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) {
    return parts[0]?.charAt(0).toUpperCase() ?? '?';
  }
  const first = parts[0]?.charAt(0) ?? '';
  const last = parts[parts.length - 1]?.charAt(0) ?? '';
  return (first + last).toUpperCase();
}

/**
 * Render a menu item
 */
function renderMenuItem(
  item: UserMenuItem,
  baseClass: string,
  closeMenu: () => void
): React.ReactElement {
  const handleClick = () => {
    if (!item.disabled) {
      item.onClick?.();
      closeMenu();
    }
  };

  if (item.href) {
    return (
      <a
        className={`${baseClass}__item ${item.disabled ? `${baseClass}__item--disabled` : ''}`}
        href={item.href}
        onClick={item.disabled ? (e) => e.preventDefault() : undefined}
        role="menuitem"
        aria-disabled={item.disabled}
      >
        {item.icon && <span className={`${baseClass}__item-icon`}>{item.icon}</span>}
        <span className={`${baseClass}__item-label`}>{item.label}</span>
      </a>
    );
  }

  return (
    <button
      type="button"
      className={`${baseClass}__item ${item.disabled ? `${baseClass}__item--disabled` : ''}`}
      onClick={handleClick}
      disabled={item.disabled}
      role="menuitem"
    >
      {item.icon && <span className={`${baseClass}__item-icon`}>{item.icon}</span>}
      <span className={`${baseClass}__item-label`}>{item.label}</span>
    </button>
  );
}
