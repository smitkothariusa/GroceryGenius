/**
 * Mouse Effect Card — adapted from kokonutui.com
 * Customised for GroceryGenius brand: warm amber/orange dots, inline styles only.
 */
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

const SPRING_CONFIG = { stiffness: 300, damping: 30, mass: 0.5 };
const OPACITY_DURATION_BASE = 0.8;
const OPACITY_DURATION_VARIATION = 0.2;
const OPACITY_EASE = [0.4, 0, 0.2, 1] as const;
const OPACITY_DELAY_CYCLE = 1.5;
const OPACITY_DELAY_STEP = 0.02;
const MIN_OPACITY_MULTIPLIER = 0.5;
const MAX_OPACITY_MULTIPLIER = 1.5;
const MIN_OPACITY_FALLBACK = 0.2;
const PROXIMITY_MULTIPLIER = 1.2;
const PROXIMITY_OPACITY_BOOST = 0.7;

// Brand dot color — warm amber tint that works on white cards
const DOT_COLOR = 'rgba(232, 57, 26, 0.35)';

interface Dot {
  id: string;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  opacity: number;
}

function generateDots(width: number, height: number, spacing: number): Dot[] {
  const dots: Dot[] = [];
  const cols = Math.ceil(width / spacing);
  const rows = Math.ceil(height / spacing);
  const centerX = width / 2;
  const centerY = height / 2;
  const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);

  for (let row = 0; row <= rows; row++) {
    for (let col = 0; col <= cols; col++) {
      const x = col * spacing;
      const y = row * spacing;
      const dx = x - centerX;
      const dy = y - centerY;
      const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
      const edgeFactor = Math.min(distanceFromCenter / (maxDistance * 0.7), 1);

      if (Math.random() > edgeFactor) continue;

      const pattern = (row + col) % 3;
      const baseOpacities = [0.15, 0.25, 0.35];
      const opacity = baseOpacities[pattern] * edgeFactor;

      dots.push({ id: `dot-${row}-${col}`, x, y, baseX: x, baseY: y, opacity });
    }
  }
  return dots;
}

interface DotProps {
  dot: Dot;
  index: number;
  dotSize: number;
  mouseX: ReturnType<typeof useMotionValue<number>>;
  mouseY: ReturnType<typeof useMotionValue<number>>;
  repulsionRadius: number;
  repulsionStrength: number;
}

function DotComponent({ dot, index, dotSize, mouseX, mouseY, repulsionRadius, repulsionStrength }: DotProps) {
  const posX = useTransform([mouseX, mouseY], () => {
    const mx = mouseX.get(); const my = mouseY.get();
    if (!Number.isFinite(mx) || !Number.isFinite(my)) return 0;
    const dx = dot.baseX - mx; const dy = dot.baseY - my;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < repulsionRadius) {
      const force = (1 - dist / repulsionRadius) * repulsionStrength;
      return Math.cos(Math.atan2(dy, dx)) * force;
    }
    return 0;
  });

  const posY = useTransform([mouseX, mouseY], () => {
    const mx = mouseX.get(); const my = mouseY.get();
    if (!Number.isFinite(mx) || !Number.isFinite(my)) return 0;
    const dx = dot.baseX - mx; const dy = dot.baseY - my;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < repulsionRadius) {
      const force = (1 - dist / repulsionRadius) * repulsionStrength;
      return Math.sin(Math.atan2(dy, dx)) * force;
    }
    return 0;
  });

  const opacityBoost = useTransform([mouseX, mouseY], () => {
    const mx = mouseX.get(); const my = mouseY.get();
    if (!Number.isFinite(mx) || !Number.isFinite(my)) return 0;
    const dx = dot.baseX - mx; const dy = dot.baseY - my;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = repulsionRadius * PROXIMITY_MULTIPLIER;
    if (dist < maxDist) return (1 - dist / maxDist) * PROXIMITY_OPACITY_BOOST;
    return 0;
  });

  const x = useSpring(posX, SPRING_CONFIG);
  const y = useSpring(posY, SPRING_CONFIG);

  const baseMin = Math.max(dot.opacity * MIN_OPACITY_MULTIPLIER, MIN_OPACITY_FALLBACK);
  const baseMax = Math.min(dot.opacity * MAX_OPACITY_MULTIPLIER, 1);
  const minWithBoost = useTransform(opacityBoost, (b) => Math.min(baseMin + b, 1));
  const delay = (index * OPACITY_DELAY_STEP) % OPACITY_DELAY_CYCLE;

  return (
    <motion.div
      animate={{ opacity: [baseMin, baseMax, baseMin] }}
      initial={{ opacity: baseMin }}
      style={{
        position: 'absolute',
        width: dotSize,
        height: dotSize,
        borderRadius: '50%',
        backgroundColor: DOT_COLOR,
        left: dot.baseX,
        top: dot.baseY,
        x,
        y,
        opacity: useSpring(minWithBoost, { stiffness: 150, damping: 25 }),
        willChange: 'transform',
        pointerEvents: 'none',
      }}
      transition={{
        opacity: {
          duration: OPACITY_DURATION_BASE + (index % 4) * OPACITY_DURATION_VARIATION,
          repeat: Infinity,
          ease: OPACITY_EASE,
          delay,
          times: [0, 0.5, 1],
        },
      }}
    />
  );
}

interface MouseEffectCardProps {
  children: React.ReactNode;
  dotSize?: number;
  dotSpacing?: number;
  repulsionRadius?: number;
  repulsionStrength?: number;
  style?: React.CSSProperties;
}

export default function MouseEffectCard({
  children,
  dotSize = 2,
  dotSpacing = 18,
  repulsionRadius = 75,
  repulsionStrength = 22,
  style,
}: MouseEffectCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(Infinity);
  const mouseY = useMotionValue(Infinity);
  const [dots, setDots] = useState<Dot[]>([]);
  const [isMobileDevice] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches
  );

  useEffect(() => {
    const update = () => {
      if (!containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      setDots(generateDots(width, height, dotSpacing));
    };
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [dotSpacing]);

  return (
    <div
      ref={containerRef}
      onMouseMove={isMobileDevice ? undefined : (e) => {
        if (!containerRef.current) return;
        const { left, top } = containerRef.current.getBoundingClientRect();
        mouseX.set(e.clientX - left);
        mouseY.set(e.clientY - top);
      }}
      onMouseLeave={isMobileDevice ? undefined : () => { mouseX.set(Infinity); mouseY.set(Infinity); }}
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--gg-cream)',
        border: '1.5px solid var(--gg-border)',
        borderRadius: 'var(--gg-radius-lg)',
        boxShadow: 'var(--gg-shadow-sm)',
        ...style
      }}
    >
      {/* Dot layer — behind content */}
      {!isMobileDevice && dots.map((dot, i) => (
        <DotComponent
          key={dot.id}
          dot={dot}
          index={i}
          dotSize={dotSize}
          mouseX={mouseX}
          mouseY={mouseY}
          repulsionRadius={repulsionRadius}
          repulsionStrength={repulsionStrength}
        />
      ))}
      {/* Content on top */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}
