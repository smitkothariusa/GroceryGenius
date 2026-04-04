# AttractButton — GroceryGenius Adaptation

Replace the contents of `frontend/src/components/AttractButton.tsx` with this implementation.

**Key changes from the KokonutUI original:**
- Violet color scheme → Tomato & Parchment
- Particles: parchment color (visible against tomato background)
- Label: static "Sign In" — does not change on hover
- Icon: `LogIn` from lucide-react (replaces `Magnet`)
- Used ONLY on the sign-in button in `Auth.tsx`

```tsx
"use client";

import { LogIn } from "lucide-react";
import { motion, useAnimation } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface AttractButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  particleCount?: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
}

export default function AttractButton({
  className,
  particleCount = 12,
  children,
  ...props
}: AttractButtonProps) {
  const [isAttracting, setIsAttracting] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const particlesControl = useAnimation();

  useEffect(() => {
    const newParticles = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * 360 - 180,
      y: Math.random() * 360 - 180,
    }));
    setParticles(newParticles);
  }, [particleCount]);

  const handleInteractionStart = useCallback(async () => {
    setIsAttracting(true);
    await particlesControl.start({
      x: 0,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 50,
        damping: 10,
      },
    });
  }, [particlesControl]);

  const handleInteractionEnd = useCallback(async () => {
    setIsAttracting(false);
    await particlesControl.start((i) => ({
      x: particles[i]?.x ?? 0,
      y: particles[i]?.y ?? 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
      },
    }));
  }, [particlesControl, particles]);

  return (
    <button
      className={cn(
        "relative min-w-40 touch-none overflow-hidden",
        "rounded-[var(--gg-radius-md)] px-6 py-3",
        "font-['Bricolage_Grotesque',sans-serif] font-semibold text-base",
        "transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gg-tomato)] focus-visible:ring-offset-2",
        className
      )}
      style={{
        background: isAttracting
          ? "var(--gg-tomato-hover)"
          : "var(--gg-tomato)",
        color: "#ffffff",
        border: "1.5px solid var(--gg-tomato-hover)",
        boxShadow: isAttracting
          ? "0 4px 16px rgba(232, 57, 26, 0.4)"
          : "0 2px 8px rgba(232, 57, 26, 0.25)",
        transform: isAttracting ? "scale(0.98)" : "scale(1)",
      }}
      onMouseEnter={handleInteractionStart}
      onMouseLeave={handleInteractionEnd}
      onTouchEnd={handleInteractionEnd}
      onTouchStart={handleInteractionStart}
      {...props}
    >
      {/* Parchment particles — visible against tomato bg */}
      {particles.map((_, index) => (
        <motion.div
          animate={particlesControl}
          className="absolute h-1.5 w-1.5 rounded-full"
          custom={index}
          initial={{ x: particles[index]?.x ?? 0, y: particles[index]?.y ?? 0 }}
          key={index}
          style={{
            background: "#fdf6ec",
            opacity: isAttracting ? 0.9 : 0.5,
          }}
        />
      ))}

      {/* Button label — always "Sign In", never changes */}
      <span className="relative flex w-full items-center justify-center gap-2">
        <LogIn
          className={cn(
            "h-4 w-4 transition-transform duration-300",
            isAttracting && "translate-x-0.5"
          )}
        />
        {children ?? "Sign In"}
      </span>
    </button>
  );
}
```

## Usage in Auth.tsx

Replace the existing sign-in `<button>` with:

```tsx
import AttractButton from "./AttractButton";

// Inside the form:
<AttractButton
  type="submit"
  style={{ width: "100%", marginTop: "1.5rem" }}
>
  Sign In
</AttractButton>
```

> Note: If the project does not use `@/lib/utils` (no Tailwind/shadcn), inline the `cn` utility or replace `className` with a `style` prop approach using `Object.assign`.
