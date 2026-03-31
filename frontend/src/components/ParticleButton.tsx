import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  dx: number;
  dy: number;
}

interface ParticleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  particleCount?: number;
  children: React.ReactNode;
  buttonStyle?: React.CSSProperties;
}

const PARTICLE_COLORS = ['#ED8B00', '#789A01', '#EF3340'];

const ParticleButton: React.FC<ParticleButtonProps> = ({
  particleCount = 10,
  children,
  buttonStyle,
  onClick,
  ...rest
}) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isPressed, setIsPressed] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const counterRef = useRef(0);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const newParticles: Particle[] = Array.from({ length: particleCount }, (_, i) => {
        const angle = (Math.PI * 2 * i) / particleCount;
        const spread = 40 + Math.random() * 20;
        return {
          id: ++counterRef.current,
          x: centerX,
          y: centerY,
          color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
          dx: Math.cos(angle) * spread,
          dy: Math.sin(angle) * spread - 20,
        };
      });

      setParticles((prev) => [...prev, ...newParticles]);
      setIsPressed(true);

      setTimeout(() => setIsPressed(false), 100);
      setTimeout(() => {
        setParticles((prev) =>
          prev.filter((p) => !newParticles.find((np) => np.id === p.id))
        );
      }, 700);
    }

    if (onClick) {
      onClick(e);
    }
  };

  return (
    <>
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            initial={{ scale: 0, x: particle.x - 3, y: particle.y - 3, opacity: 1 }}
            animate={{
              scale: [0, 1, 0],
              x: particle.x - 3 + particle.dx,
              y: particle.y - 3 + particle.dy,
              opacity: [1, 1, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: particle.color,
              pointerEvents: 'none',
              zIndex: 9999,
            }}
          />
        ))}
      </AnimatePresence>

      <motion.button
        ref={buttonRef}
        onClick={handleClick}
        animate={{ scale: isPressed ? 0.96 : 1 }}
        transition={{ duration: 0.1 }}
        style={{
          ...buttonStyle,
          border: 'none',
          cursor: 'pointer',
        }}
        {...(rest as any)}
      >
        {children}
      </motion.button>
    </>
  );
};

export default ParticleButton;
