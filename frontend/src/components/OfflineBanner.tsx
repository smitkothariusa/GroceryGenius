import React from 'react';
import { useTranslation } from 'react-i18next';

interface OfflineBannerProps {
  isOnline: boolean;
  pendingCount: number;
}

/**
 * Persistent banner shown while the browser is offline, or while queued
 * pantry/shopping writes are still waiting to sync (e.g. briefly after
 * coming back online, before the drain finishes). Sits in normal document
 * flow above the sticky header (see App.tsx) so it never overlaps it or the
 * toast stack, and is a no-op (renders nothing) for normal online usage.
 */
const OfflineBanner: React.FC<OfflineBannerProps> = ({ isOnline, pendingCount }) => {
  const { t } = useTranslation();

  if (isOnline && pendingCount === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 150,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '0.5rem 1rem',
        textAlign: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '0.82rem',
        fontWeight: 600,
        lineHeight: 1.4,
        boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
      }}
    >
      {!isOnline
        ? t('offline.banner.offline')
        : t('offline.banner.syncing', { count: pendingCount })}
    </div>
  );
};

export default OfflineBanner;
