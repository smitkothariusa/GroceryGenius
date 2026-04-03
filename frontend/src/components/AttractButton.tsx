/**
 * AttractButton — GroceryGenius adaptation of kokonutui.com attract button
 * Tomato palette, parchment particles, LogIn icon.
 * Used ONLY on the Auth sign-in button.
 */
import { LogIn } from 'lucide-react';
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
        opacity: 0.9,
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

  const handleTouchStart = useCallback(
    async (e: React.TouchEvent<HTMLButtonElement>) => {
      if (disabled || loading) return;
      setIsAttracting(true);
      await controls.start({
        x: 0, y: 0, opacity: 0.9,
        transition: { type: 'spring', stiffness: 55, damping: 11 },
      });
    },
    [controls, disabled, loading]
  );

  const handleTouchEnd = useCallback(async () => {
    setIsAttracting(false);
    await controls.start((i: number) => ({
      x: particles[i]?.x ?? 0,
      y: particles[i]?.y ?? 0,
      opacity: 0.45,
      transition: { type: 'spring', stiffness: 90, damping: 14 },
    }));
  }, [controls, particles]);

  const isDisabled = disabled || loading;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Parchment particles — visible against tomato background */}
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
            background: '#fdf6ec',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      ))}

      <button
        disabled={isDisabled}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          padding: '0.85rem 1.5rem',
          background: isDisabled
            ? 'var(--gg-taupe)'
            : isAttracting
            ? 'var(--gg-tomato-hover)'
            : 'var(--gg-tomato)',
          color: 'white',
          border: '1.5px solid var(--gg-tomato-hover)',
          borderRadius: 'var(--gg-radius-md)',
          fontWeight: 600,
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontSize: '1rem',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s ease, box-shadow 0.2s ease',
          boxShadow: isAttracting && !isDisabled
            ? '0 4px 16px rgba(232, 57, 26, 0.4)'
            : '0 2px 8px rgba(232, 57, 26, 0.25)',
          transform: isAttracting ? 'scale(0.98)' : 'scale(1)',
          letterSpacing: '0.02em',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          ...style,
        }}
        {...props}
      >
        {loading ? (
          <>
            <span style={{
              display: 'inline-block',
              width: 16,
              height: 16,
              borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.35)',
              borderTopColor: 'white',
              animation: 'attractBtn-spin 0.75s linear infinite',
            }} />
            {children}
          </>
        ) : (
          <>
            <LogIn size={16} />
            {children ?? 'Sign In'}
          </>
        )}
      </button>

      <style>{`
        @keyframes attractBtn-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
