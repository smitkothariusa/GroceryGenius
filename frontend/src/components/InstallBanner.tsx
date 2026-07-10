import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'gg_install_dismissed';
const SHOW_DELAY_MS = 30_000;
const DEBUG = new URLSearchParams(window.location.search).has('install');

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

const InstallBanner: React.FC = () => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<'android' | 'ios' | 'ios-other' | null>(null);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (!DEBUG && (
      !isMobileDevice() ||
      isAlreadyInstalled() ||
      localStorage.getItem(DISMISSED_KEY)
    )) {
      return;
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
    };

    const handleAppInstalled = () => {
      localStorage.setItem(DISMISSED_KEY, 'true');
      setVisible(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    const timer = setTimeout(() => {
      if (!DEBUG && localStorage.getItem(DISMISSED_KEY)) return;

      if (deferredPrompt.current) {
        setPlatform('android');
        setVisible(true);
      } else if (isIOSSafari()) {
        setPlatform('ios');
        setVisible(true);
      } else if (isIOS()) {
        setPlatform('ios-other');
        setVisible(true);
      } else if (DEBUG) {
        // Desktop debug mode — show ios-other as a representative example
        setPlatform('ios-other');
        setVisible(true);
      }
    }, DEBUG ? 500 : SHOW_DELAY_MS);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setVisible(false);
  };

  const handleOpenInSafari = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'GroceryGenius', url: window.location.href });
      } catch {
        // user cancelled share sheet — do nothing
      }
    }
  };

  const handleInstall = async () => {
    if (!deferredPrompt.current) return;
    await deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    if (outcome === 'accepted') {
      localStorage.setItem(DISMISSED_KEY, 'true');
    }
    deferredPrompt.current = null;
    setVisible(false);
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
        padding: '1rem 1.25rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        zIndex: 9999,
        boxShadow: '0 -4px 24px rgba(0,0,0,0.2)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <span style={{ fontSize: '1.75rem', lineHeight: 1, flexShrink: 0 }}>📱</span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
          {t('install.banner.title')}
        </div>
        <div style={{ fontSize: '0.8rem', opacity: 0.9, lineHeight: 1.4 }}>
          {platform === 'ios'
            ? t('install.banner.iosInstruction')
            : platform === 'ios-other'
            ? t('install.banner.iosChromeInstruction')
            : t('install.banner.description')}
        </div>

        {platform === 'ios-other' && (
          <button
            onClick={handleOpenInSafari}
            style={{
              marginTop: '0.75rem',
              background: 'white',
              color: '#667eea',
              border: 'none',
              borderRadius: '8px',
              padding: '0.45rem 1rem',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            {t('install.banner.openInSafari')}
          </button>
        )}

        {platform === 'android' && (
          <button
            onClick={handleInstall}
            style={{
              marginTop: '0.75rem',
              background: 'white',
              color: '#667eea',
              border: 'none',
              borderRadius: '8px',
              padding: '0.45rem 1rem',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            {t('install.banner.addButton')}
          </button>
        )}

        {platform === 'ios' && (
          <button
            onClick={handleDismiss}
            style={{
              marginTop: '0.5rem',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '0.4rem 1rem',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            {t('install.banner.gotIt')}
          </button>
        )}
      </div>

      <button
        onClick={handleDismiss}
        aria-label={t('install.banner.dismiss')}
        style={{
          background: 'rgba(255,255,255,0.2)',
          border: 'none',
          color: 'white',
          borderRadius: '50%',
          width: '28px',
          height: '28px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.1rem',
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
};

export default InstallBanner;
