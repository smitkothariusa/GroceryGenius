import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { safeStorage } from '../lib/safeStorage';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Window {
    __gg_install_prompt?: BeforeInstallPromptEvent;
  }
}

const DISMISSED_KEY = 'gg_install_dismissed';
const SHOW_DELAY_MS = 30_000;

function isMobileDevice(): boolean {
  return window.innerWidth < 768 && 'ontouchstart' in window;
}

function isAlreadyInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches;
}

function isIOS(): boolean {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) && !(window as any).MSStream;
}

function isIOSSafari(): boolean {
  return (
    isIOS() &&
    /Safari/i.test(navigator.userAgent) &&
    !/CriOS|FxiOS|OPiOS|mercury/i.test(navigator.userAgent)
  );
}

const btnPrimary: React.CSSProperties = {
  marginTop: '0.75rem',
  background: 'white',
  color: '#667eea',
  border: 'none',
  borderRadius: '8px',
  padding: '0.5rem 1.25rem',
  fontWeight: 700,
  fontSize: '0.875rem',
  cursor: 'pointer',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
};

const btnSecondary: React.CSSProperties = {
  marginTop: '0.5rem',
  background: 'rgba(255,255,255,0.18)',
  color: 'white',
  border: '1px solid rgba(255,255,255,0.35)',
  borderRadius: '8px',
  padding: '0.45rem 1.25rem',
  fontWeight: 600,
  fontSize: '0.875rem',
  cursor: 'pointer',
  fontFamily: 'system-ui, -apple-system, sans-serif',
};

const InstallBanner: React.FC = () => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<'android' | 'ios' | 'ios-other' | null>(null);
  const [copied, setCopied] = useState(false);
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const debug = new URLSearchParams(window.location.search).has('install');

    if (!debug && (
      !isMobileDevice() ||
      isAlreadyInstalled() ||
      safeStorage.getItem(DISMISSED_KEY)
    )) {
      return;
    }

    const handleAppInstalled = () => {
      safeStorage.setItem(DISMISSED_KEY, 'true');
      setVisible(false);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    const timer = setTimeout(() => {
      if (!debug && safeStorage.getItem(DISMISSED_KEY)) return;

      const captured = window.__gg_install_prompt;
      if (captured) {
        promptRef.current = captured;
        setPlatform('android');
        setVisible(true);
      } else if (isIOSSafari()) {
        setPlatform('ios');
        setVisible(true);
      } else if (isIOS()) {
        setPlatform('ios-other');
        setVisible(true);
      } else if (debug) {
        setPlatform('ios');
        setVisible(true);
      }
    }, debug ? 500 : SHOW_DELAY_MS);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleDismiss = () => {
    safeStorage.setItem(DISMISSED_KEY, 'true');
    setVisible(false);
  };

  const handleInstall = async () => {
    if (!promptRef.current) return;
    await promptRef.current.prompt();
    const { outcome } = await promptRef.current.userChoice;
    if (outcome === 'accepted') {
      safeStorage.setItem(DISMISSED_KEY, 'true');
    }
    promptRef.current = null;
    window.__gg_install_prompt = undefined;
    setVisible(false);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin + window.location.pathname);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // clipboard not available
    }
  };

  if (!visible || !platform) return null;

  return (
    <div
      role="banner"
      aria-label={t('install.banner.title')}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '1.1rem 1.25rem 1.25rem',
        borderRadius: '16px 16px 0 0',
        boxShadow: '0 -8px 32px rgba(102,126,234,0.45)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.875rem',
        zIndex: 9999,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* App icon — uses the same apple-touch-icon that iOS puts on the home screen */}
      <img
        src="/apple-touch-icon.png"
        alt="GroceryGenius"
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          border: '2px solid rgba(255,255,255,0.7)',
          flexShrink: 0,
          marginTop: 2,
        }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.2rem', letterSpacing: '-0.01em' }}>
          {t('install.banner.title')}
        </div>

        {platform === 'android' && (
          <>
            <div style={{ fontSize: '0.82rem', opacity: 0.88, lineHeight: 1.45 }}>
              {t('install.banner.description')}
            </div>
            <button onClick={handleInstall} style={btnPrimary}>
              {t('install.banner.addButton')}
            </button>
          </>
        )}

        {platform === 'ios' && (
          <>
            <div style={{ fontSize: '0.82rem', opacity: 0.88, lineHeight: 1.55 }}>
              <div>1. {t('install.banner.iosStep1')}</div>
              <div>2. {t('install.banner.iosStep2')}</div>
            </div>
            <button onClick={handleDismiss} style={btnSecondary}>
              {t('install.banner.gotIt')}
            </button>
          </>
        )}

        {platform === 'ios-other' && (
          <>
            <div style={{ fontSize: '0.82rem', opacity: 0.88, lineHeight: 1.45 }}>
              {t('install.banner.iosChromeInstruction')}
            </div>
            <button onClick={handleCopyLink} style={btnPrimary}>
              {copied ? t('install.banner.copied') : t('install.banner.copyLink')}
            </button>
          </>
        )}
      </div>

      <button
        onClick={handleDismiss}
        aria-label={t('install.banner.dismiss')}
        style={{
          background: 'rgba(255,255,255,0.18)',
          border: 'none',
          color: 'white',
          borderRadius: '50%',
          width: 28,
          height: 28,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.1rem',
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        ×
      </button>
    </div>
  );
};

export default InstallBanner;
