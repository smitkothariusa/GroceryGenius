/**
 * AttractButton — adapted from kokonutui.com for GroceryGenius
 * Particles spread out from button center at rest, attract inward on hover.
 * No shadcn/lucide dependencies — pure React + motion/react.
 */
import { motion, useAnimation } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';

interface AttractButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  particleCount?: number;
  loading?: boolean;
}

interface Particle {
  id: number;
  x: number;
  y: number;
}

export default function AttractButton({
  particleCount = 14,
  loading,
  disabled,
  children,
  style,
  onMouseEnter,
  onMouseLeave,
  ...props
}: AttractButtonProps) {
  const [isAttracting, setIsAttracting] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const controls = useAnimation();

  useEffect(() => {
    setParticles(
      Array.from({ length: particleCount }, (_, i) => ({
        id: i,
        x: Math.random() * 280 - 140,
        y: Math.random() * 80 - 40,
      }))
    );
  }, [particleCount]);

  const handleEnter = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || loading) return;
      setIsAttracting(true);
      await controls.start({
        x: 0,
        y: 0,
        opacity: 1,
        transition: { type: 'spring', stiffness: 55, damping: 11 },
      });
      onMouseEnter?.(e);
    },
    [controls, disabled, loading, onMouseEnter]
  );

  const handleLeave = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      setIsAttracting(false);
      await controls.start((i: number) => ({
        x: particles[i]?.x ?? 0,
        y: particles[i]?.y ?? 0,
        opacity: 0.45,
        transition: { type: 'spring', stiffness: 90, damping: 14 },
      }));
      onMouseLeave?.(e);
    },
    [controls, particles, onMouseLeave]
  );

  const isDisabled = disabled || loading;

  return (
    /* Wrapper gives particles room to exist outside button bounds */
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Particle layer — rendered behind button text, outside overflow clip */}
      {particles.map((p, i) => (
        <motion.div
          key={p.id}
          custom={i}
          animate={controls}
          initial={{ x: p.x, y: p.y, opacity: 0.45 }}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 7,
            height: 7,
            marginTop: -3.5,
            marginLeft: -3.5,
            borderRadius: '50%',
            background: i % 3 === 0 ? '#ED8B00' : i % 3 === 1 ? '#789A01' : 'rgba(255,255,255,0.8)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      ))}

      <button
        disabled={isDisabled}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          padding: '1rem',
          background: isDisabled
            ? '#9ca3af'
            : isAttracting
            ? 'linear-gradient(135deg, #b86200 0%, #ED8B00 100%)'
            : 'linear-gradient(135deg, #ED8B00 0%, #f59e0b 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          fontWeight: '700',
          fontSize: '1rem',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          transition: 'background 0.3s ease, box-shadow 0.3s ease',
          boxShadow: isAttracting && !isDisabled
            ? '0 6px 24px rgba(237,139,0,0.45)'
            : '0 2px 8px rgba(0,0,0,0.12)',
          letterSpacing: '0.02em',
          ...style,
        }}
        {...props}
      >
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
          }}
        >
          {loading ? (
            <>
              <span
                style={{
                  display: 'inline-block',
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.35)',
                  borderTopColor: 'white',
                  animation: 'attractBtn-spin 0.75s linear infinite',
                }}
              />
              {children}
            </>
          ) : (
            children
          )}
        </span>
      </button>

      <style>{`
        @keyframes attractBtn-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
