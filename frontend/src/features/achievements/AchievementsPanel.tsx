import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { streakService } from '../../lib/database';
import { daysUntilExpiry } from '../../lib/pantryExpiry';
import { usePantry } from '../pantry/PantryContext';
import { useDonation } from '../donation/DonationContext';
import { safeStorage } from '../../lib/safeStorage';

const HIDE_STORAGE_KEY = 'gg_hide_achievements';

// Meals-donated thresholds for donation badges. Fully derived from
// `donation_impact.total_meals` each render — no persistence. Icons step up
// per tier purely as a visual cue; no i18n needed for them.
const BADGE_THRESHOLDS: { threshold: number; icon: string; nameKey: string }[] = [
  { threshold: 10, icon: '🥉', nameKey: 'achievements.badge10Name' },
  { threshold: 50, icon: '🥈', nameKey: 'achievements.badge50Name' },
  { threshold: 100, icon: '🥇', nameKey: 'achievements.badge100Name' },
  { threshold: 500, icon: '🏆', nameKey: 'achievements.badge500Name' },
];

interface AchievementsPanelProps {
  isMobile: boolean;
  cardBg: string;
  mutedText: string;
}

/**
 * Donation-tab gamification: a zero-waste streak chip (lightweight daily
 * check-in — see streakService in lib/database.ts, NOT a rigorous audit) and
 * a row of donation-milestone badges (fully derived from
 * `donation_impact.total_meals`, no persistence). On by default; dismissible
 * via a `gg_hide_achievements` localStorage flag, mirroring the
 * `locationPermission` pattern in DonationContext/DonationSection.
 */
export function AchievementsPanel({ isMobile, cardBg, mutedText }: AchievementsPanelProps) {
  const { t } = useTranslation();
  const { pantry } = usePantry();
  const { donationImpact } = useDonation();

  const [hidden, setHidden] = useState(() => safeStorage.getItem(HIDE_STORAGE_KEY) === 'true');
  const [streakDays, setStreakDays] = useState<number | null>(null);
  const checkedInRef = useRef(false);

  // Check in once per mount (not on every render) using the pantry's current
  // stale-item state at the moment the Donate tab is visited.
  useEffect(() => {
    if (checkedInRef.current) return;
    checkedInRef.current = true;

    const hasStaleExpiredItems = pantry.some(item => {
      const days = daysUntilExpiry(item);
      return days !== null && days < 0;
    });

    let cancelled = false;
    streakService.checkIn(hasStaleExpiredItems)
      .then(updated => {
        if (!cancelled) setStreakDays(updated.zero_waste_streak_days);
      })
      .catch(err => {
        console.error('❌ Error checking in zero-waste streak:', err);
      });

    return () => { cancelled = true; };
    // Intentionally run once on mount — this is a once-per-visit check-in,
    // not something that should re-fire as pantry/donation state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setHiddenPersisted = (value: boolean) => {
    setHidden(value);
    safeStorage.setItem(HIDE_STORAGE_KEY, String(value));
  };

  if (hidden) {
    return (
      <button
        onClick={() => setHiddenPersisted(false)}
        style={{
          background: 'transparent',
          border: 'none',
          color: mutedText,
          fontSize: '0.8rem',
          cursor: 'pointer',
          padding: '0.25rem 0',
          marginBottom: isMobile ? '1rem' : '1.5rem',
          textDecoration: 'underline',
        }}
      >
        🏅 {t('achievements.show')}
      </button>
    );
  }

  return (
    <div
      style={{
        background: cardBg,
        padding: isMobile ? '1rem' : '1.5rem',
        borderRadius: '16px',
        marginBottom: isMobile ? '1rem' : '1.5rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <h3 style={{ margin: 0, fontSize: isMobile ? '1.1rem' : '1.25rem' }}>
          🎖️ {t('achievements.title')}
        </h3>
        <button
          onClick={() => setHiddenPersisted(true)}
          title={t('achievements.hide')}
          aria-label={t('achievements.hide')}
          style={{
            background: 'transparent',
            border: 'none',
            color: mutedText,
            cursor: 'pointer',
            fontSize: '1rem',
            padding: '0.25rem',
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>

      {/* Zero-waste streak chip */}
      {streakDays !== null && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: streakDays > 0
              ? 'linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)'
              : '#f3f4f6',
            color: streakDays > 0 ? '#9a3412' : mutedText,
            padding: '0.5rem 0.9rem',
            borderRadius: '999px',
            fontWeight: 700,
            fontSize: isMobile ? '0.8rem' : '0.875rem',
            marginBottom: '1rem',
          }}
        >
          {streakDays > 0
            ? <>🔥 {t('achievements.streakActive', { count: streakDays })}</>
            : <>🌱 {t('achievements.streakStart')}</>}
        </div>
      )}

      {/* Donation milestone badges */}
      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: mutedText, marginBottom: '0.5rem' }}>
        {t('achievements.badgesTitle')}
      </div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        {BADGE_THRESHOLDS.map(badge => {
          const unlocked = donationImpact.totalMeals >= badge.threshold;
          const remaining = Math.max(0, badge.threshold - donationImpact.totalMeals);
          return (
            <div
              key={badge.threshold}
              title={unlocked
                ? t('achievements.badgeUnlockedDesc', { count: badge.threshold })
                : t('achievements.badgeLockedDesc', { count: remaining })}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.15rem',
                padding: '0.6rem 0.75rem',
                borderRadius: '12px',
                background: unlocked ? '#f0fdf4' : '#f9fafb',
                border: unlocked ? '2px solid #86efac' : '2px solid #e5e7eb',
                opacity: unlocked ? 1 : 0.6,
                minWidth: isMobile ? '72px' : '84px',
              }}
            >
              <div style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', filter: unlocked ? 'none' : 'grayscale(1)' }}>
                {unlocked ? badge.icon : '🔒'}
              </div>
              <div style={{
                fontSize: isMobile ? '0.65rem' : '0.7rem',
                fontWeight: 700,
                textAlign: 'center',
                color: unlocked ? '#166534' : mutedText,
              }}>
                {t(badge.nameKey)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
