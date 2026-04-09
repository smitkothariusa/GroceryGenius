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

interface TourOverlayProps {
  steps: TourStep[];
  currentStep: number;
  isMobile: boolean;
  onNext: () => void;
  onSkip: () => void;
}

const PADDING = 6; // px extra padding around spotlight

export default function TourOverlay({ steps, currentStep, isMobile, onNext, onSkip }: TourOverlayProps) {
  const { t } = useTranslation();
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const [tooltipAbove, setTooltipAbove] = useState(false);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const step = steps[currentStep];
  const total = steps.length;

  if (!step) return null;

  // Measure the target element position
  useEffect(() => {
    function measure(attempt = 0) {
      const el = document.querySelector(step.selector) as HTMLElement | null;
      if (!el) {
        if (attempt < 10) {
          retryRef.current = setTimeout(() => measure(attempt + 1), 150);
        }
        // After 10 attempts (~1.5s), give up and leave rect null — tour remains hidden for this step
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({
        top: r.top - PADDING,
        left: r.left - PADDING,
        width: r.width + PADDING * 2,
        height: r.height + PADDING * 2,
      });
      // Decide whether tooltip goes above or below
      setTooltipAbove(r.top > window.innerHeight / 2);
    }

    setRect(null);
    measure();

    const handleResize = () => {
      if (retryRef.current) clearTimeout(retryRef.current);
      measure();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (retryRef.current) clearTimeout(retryRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [step.selector, currentStep]);

  if (!rect) return null;

  const isLast = currentStep === total - 1;

  // Tooltip box style
  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    left: isMobile ? '12px' : Math.max(8, Math.min(rect.left, window.innerWidth - Math.min(320, window.innerWidth - 24) - 8)),
    right: isMobile ? '12px' : undefined,
    width: isMobile ? undefined : Math.min(320, window.innerWidth - 24),
    background: 'white',
    borderRadius: isMobile ? '16px 16px 0 0' : '12px',
    padding: '16px',
    boxShadow: '0 6px 32px rgba(0,0,0,0.45)',
    zIndex: 10001,
    ...(isMobile
      ? { bottom: 0, left: 0, right: 0, borderRadius: '16px 16px 0 0' }
      : tooltipAbove
      ? { bottom: window.innerHeight - rect.top + 10 }
      : { top: rect.top + rect.height + 10 }),
  };

  return (
    <>
      {/* Full-screen overlay with spotlight hole via box-shadow */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10000,
          pointerEvents: 'none',
        }}
      >
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
      </div>

      {/* Tooltip */}
      <div style={tooltipStyle}>
        {isMobile && (
          <div style={{ width: 36, height: 4, background: '#d1d5db', borderRadius: 2, margin: '0 auto 12px' }} />
        )}

        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827', marginBottom: 6 }}>
          {t(step.titleKey)}
        </div>
        <div style={{ fontSize: '0.85rem', color: '#6b7280', lineHeight: 1.55, marginBottom: 14 }}>
          {t(step.descKey)}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Progress dots + step count */}
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

          {/* Buttons */}
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
    </>
  );
}
