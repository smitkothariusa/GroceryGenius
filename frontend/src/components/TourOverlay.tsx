// frontend/src/components/TourOverlay.tsx
import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { TourStep } from '../tourSteps';

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const TOOLTIP_EST_HEIGHT = 220;
const SCROLL_SETTLE_MS = 500; // extra headroom after instant-reset + smooth scroll

interface TourOverlayProps {
  steps: TourStep[];
  currentStep: number;
  isMobile: boolean;
  onNext: () => void;
  onSkip: () => void;
}

const PADDING = 6;

const SCROLL_BLOCK_KEYS = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', ' '];

export default function TourOverlay({ steps, currentStep, isMobile, onNext, onSkip }: TourOverlayProps) {
  const { t } = useTranslation();
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const [tooltipAbove, setTooltipAbove] = useState(false);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const step = steps[currentStep];
  const total = steps.length;

  // Lock all user-initiated scrolling for the lifetime of the overlay.
  // Programmatic scrollIntoView is unaffected — it does not fire these events.
  useEffect(() => {
    const preventScroll = (e: Event) => e.preventDefault();
    const preventScrollKeys = (e: KeyboardEvent) => {
      if (SCROLL_BLOCK_KEYS.includes(e.key)) e.preventDefault();
    };
    document.addEventListener('wheel', preventScroll, { passive: false });
    document.addEventListener('touchmove', preventScroll, { passive: false });
    document.addEventListener('keydown', preventScrollKeys);
    return () => {
      document.removeEventListener('wheel', preventScroll);
      document.removeEventListener('touchmove', preventScroll);
      document.removeEventListener('keydown', preventScrollKeys);
    };
  }, []);

  if (!step) return null;

  useEffect(() => {
    // Handle skipOnMobile immediately — no DOM lookup needed
    if (isMobile && step.skipOnMobile) {
      onNext();
      return;
    }

    const selector = isMobile && step.mobileSelector ? step.mobileSelector : step.selector;

    function applyRect(el: HTMLElement) {
      const r = el.getBoundingClientRect();
      setRect({
        top: r.top - PADDING,
        left: r.left - PADDING,
        width: r.width + PADDING * 2,
        height: r.height + PADDING * 2,
      });
      // Mobile: flip tooltip above when element is in the lower 45% of the screen
      // Desktop: flip above when there isn't enough space below
      const spaceBelow = window.innerHeight - (r.top + r.height) - 10;
      setTooltipAbove(isMobile ? r.top > window.innerHeight * 0.45 : spaceBelow < TOOLTIP_EST_HEIGHT);
    }

    function measure(attempt = 0) {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (!el) {
        if (attempt < 10) {
          retryRef.current = setTimeout(() => measure(attempt + 1), 150);
        } else {
          onNext();
        }
        return;
      }

      const r = el.getBoundingClientRect();
      // Element is CSS-hidden (display:none) — treat as not found
      if (r.width === 0 && r.height === 0) {
        if (attempt < 10) {
          retryRef.current = setTimeout(() => measure(attempt + 1), 150);
        } else {
          onNext();
        }
        return;
      }

      // Fixed-position elements (e.g. the mobile FAB) don't move with the page —
      // no scrollIntoView needed; just measure after a short layout settle.
      if (getComputedStyle(el).position === 'fixed') {
        retryRef.current = setTimeout(() => applyRect(el), 150);
        return;
      }

      // Smooth-scroll the element to the centre of the viewport, then measure
      // once the animation has settled.
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      retryRef.current = setTimeout(() => applyRect(el), SCROLL_SETTLE_MS);
    }

    setRect(null);
    measure();

    // Debounce resize so rapid address-bar animation events (mobile) don't cause
    // a stale spotlight mid-transition.
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const handleResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const el = document.querySelector(selector) as HTMLElement | null;
        if (el) applyRect(el);
      }, 200);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (retryRef.current) clearTimeout(retryRef.current);
      if (resizeTimer) clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
    };
  }, [step.selector, step.mobileSelector, step.skipOnMobile, currentStep, isMobile]);

  const isLast = currentStep === total - 1;

  // Tooltip positioning
  let tooltipStyle: React.CSSProperties;
  if (isMobile) {
    tooltipStyle = {
      position: 'fixed',
      left: 0,
      right: 0,
      zIndex: 10001,
      background: 'white',
      padding: '16px',
      boxShadow: '0 6px 32px rgba(0,0,0,0.45)',
      ...(tooltipAbove
        ? { top: 0, borderRadius: '0 0 16px 16px' }
        : { bottom: 0, borderRadius: '16px 16px 0 0' }),
    };
  } else {
    const tooltipTop = tooltipAbove
      ? Math.max(8, (rect?.top ?? 0) - TOOLTIP_EST_HEIGHT - 10)
      : Math.min((rect?.top ?? 0) + (rect?.height ?? 0) + 10, window.innerHeight - TOOLTIP_EST_HEIGHT - 8);
    tooltipStyle = {
      position: 'fixed',
      left: Math.max(8, Math.min(rect?.left ?? 8, window.innerWidth - Math.min(320, window.innerWidth - 24) - 8)),
      width: Math.min(320, window.innerWidth - 24),
      top: tooltipTop,
      background: 'white',
      borderRadius: '12px',
      padding: '16px',
      boxShadow: '0 6px 32px rgba(0,0,0,0.45)',
      zIndex: 10001,
    };
  }

  return (
    <>
      {/* Full-screen backdrop — always rendered so the screen stays locked between steps */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10000,
          pointerEvents: 'all',
          background: rect ? undefined : 'rgba(0,0,0,0.72)',
        }}
      >
        {rect && (
          <div
            style={{
              position: 'fixed',
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
              borderRadius: '8px',
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.72), 0 0 0 3px #10b981, 0 0 0 6px rgba(16,185,129,0.2)',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>

      {/* Tooltip — only shown once we know where the element is */}
      {rect && (
        <div style={tooltipStyle}>
          {isMobile && !tooltipAbove && (
            <div style={{ width: 36, height: 4, background: '#d1d5db', borderRadius: 2, margin: '0 auto 12px' }} />
          )}

          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827', marginBottom: 6 }}>
            {t(step.titleKey)}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#6b7280', lineHeight: 1.55, marginBottom: 14 }}>
            {t(step.descKey)}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {Array.from({ length: Math.min(total, 10) }).map((_, i) => {
                const dotCount = Math.min(total, 10);
                const filled = total === 1
                  ? true
                  : i <= Math.floor(currentStep * (dotCount - 1) / (total - 1));
                return (
                  <div
                    key={i}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: filled ? '#10b981' : '#d1d5db',
                      transition: 'background 0.2s',
                    }}
                  />
                );
              })}
              <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginLeft: 4 }}>
                {t('tour.stepOf', { current: currentStep + 1, total })}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={onSkip}
                style={{
                  padding: '6px 12px',
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#6b7280',
                }}
              >
                {t('tour.skip')}
              </button>
              <button
                onClick={onNext}
                style={{
                  padding: '6px 14px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: 'white',
                }}
              >
                {isLast ? t('tour.finish') : t('tour.next')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
