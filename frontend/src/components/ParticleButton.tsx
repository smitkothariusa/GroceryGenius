/**
 * ParticleButton — GroceryGenius adaptation
 * Tomato/forest/amber particles, Sparkles icon.
 * Wraps: Generate Recipes, Add to Meal Plan, Save to Pantry.
 */
import { Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useRef, useState } from 'react';

const GG_PARTICLES = ['#e8391a', '#2d6a4f', '#e8962a', '#eddecb', '#c42f14'];

interface ParticleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  successDuration?: number;
  variant?: 'primary' | 'outline';
  hideIcon?: boolean;
}

function SuccessParticles({ buttonRef }: { buttonRef: React.RefObject<HTMLButtonElement> }) {
  const rect = buttonRef.current?.getBoundingClientRect();
  if (!rect) return null;

  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  return (
    <AnimatePresence>
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          animate={{
            scale: [0, 1.2, 0],
            x: [0, (i % 2 ? 1 : -1) * (Math.random() * 60 + 20)],
            y: [0, -Math.random() * 60 - 20],
            opacity: [1, 1, 0],
          }}
          style={{
            position: 'fixed',
            width: 6,
            height: 6,
            borderRadius: '50%',
            left: centerX,
            top: centerY,
            background: GG_PARTICLES[i % GG_PARTICLES.length],
            pointerEvents: 'none',
            zIndex: 9999,
          }}
          initial={{ scale: 0, x: 0, y: 0 }}
          transition={{
            duration: 0.65,
            delay: i * 0.07,
            ease: 'easeOut',
          }}
        />
      ))}
    </AnimatePresence>
  );
}

export default function ParticleButton({
  children,
  onClick,
  successDuration = 900,
  variant = 'primary',
  hideIcon = false,
  style,
  disabled,
  ...props
}: ParticleButtonProps) {
  const [showParticles, setShowParticles] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    setShowParticles(true);
    setTimeout(() => setShowParticles(false), successDuration);
    onClick?.(e);
  };

  const isPrimary = variant === 'primary';

  return (
    <>
      {showParticles && <SuccessParticles buttonRef={buttonRef} />}
      <button
        ref={buttonRef}
        onClick={handleClick}
        disabled={disabled}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          padding: '0.65rem 1.5rem',
          borderRadius: 'var(--gg-radius-md)',
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontWeight: 600,
          fontSize: '0.925rem',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease',
          transform: showParticles ? 'scale(0.96)' : 'scale(1)',
          border: isPrimary ? 'none' : '1.5px solid var(--gg-tomato)',
          background: disabled
            ? 'var(--gg-taupe)'
            : isPrimary
            ? showParticles ? 'var(--gg-tomato-hover)' : 'var(--gg-tomato)'
            : 'transparent',
          color: isPrimary ? '#ffffff' : 'var(--gg-tomato)',
          boxShadow: isPrimary && !disabled && !showParticles
            ? '0 2px 8px rgba(232, 57, 26, 0.30)'
            : 'none',
          ...style,
        }}
        {...props}
      >
        {children}
        {!hideIcon && <Sparkles size={15} style={{ flexShrink: 0 }} />}
      </button>
    </>
  );
}
