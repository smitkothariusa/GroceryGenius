# ParticleButton — GroceryGenius Adaptation

Replace the contents of `frontend/src/components/ParticleButton.tsx` with this implementation.

**Key changes from the KokonutUI original:**
- Particle colors: GroceryGenius palette (tomato, forest, amber, parchment)
- Button style: tomato background, Bricolage Grotesque font
- Icon: `Sparkles` (replaces `MousePointerClick`)
- Scale on active: 0.96 (slightly less aggressive)

```tsx
"use client";

import { Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type RefObject, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// GroceryGenius particle colors
const GG_PARTICLES = ["#e8391a", "#2d6a4f", "#e8962a", "#eddecb", "#c42f14"];

interface ParticleButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  successDuration?: number;
  variant?: "primary" | "outline";
}

function SuccessParticles({
  buttonRef,
}: {
  buttonRef: React.RefObject<HTMLButtonElement>;
}) {
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
          className="fixed h-1.5 w-1.5 rounded-full"
          initial={{ scale: 0, x: 0, y: 0 }}
          style={{
            left: centerX,
            top: centerY,
            background: GG_PARTICLES[i % GG_PARTICLES.length],
          }}
          transition={{
            duration: 0.65,
            delay: i * 0.07,
            ease: "easeOut",
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
  variant = "primary",
  className,
  ...props
}: ParticleButtonProps) {
  const [showParticles, setShowParticles] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setShowParticles(true);
    setTimeout(() => setShowParticles(false), successDuration);
    onClick?.(e);
  };

  const isPrimary = variant === "primary";

  return (
    <>
      {showParticles && (
        <SuccessParticles buttonRef={buttonRef as RefObject<HTMLButtonElement>} />
      )}
      <button
        ref={buttonRef}
        onClick={handleClick}
        className={cn(
          "relative inline-flex items-center justify-center gap-2",
          "px-5 py-2.5 rounded-[var(--gg-radius-md)]",
          "font-['Bricolage_Grotesque',sans-serif] font-semibold text-sm",
          "transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gg-tomato)] focus-visible:ring-offset-2",
          showParticles && "scale-[0.96]",
          className
        )}
        style={
          isPrimary
            ? {
                background: showParticles
                  ? "var(--gg-tomato-hover)"
                  : "var(--gg-tomato)",
                color: "#ffffff",
                boxShadow: showParticles
                  ? "none"
                  : "0 2px 8px rgba(232, 57, 26, 0.30)",
              }
            : {
                background: "transparent",
                color: "var(--gg-tomato)",
                border: "1.5px solid var(--gg-tomato)",
              }
        }
        {...props}
      >
        {children}
        <Sparkles className="h-4 w-4 flex-shrink-0" />
      </button>
    </>
  );
}
```

## Usage

Wrap primary CTA buttons:

```tsx
import ParticleButton from "./ParticleButton";

// Generate recipes
<ParticleButton onClick={handleGenerate}>
  Generate Recipes
</ParticleButton>

// Add to meal plan (outline variant)
<ParticleButton variant="outline" onClick={handleAddToMealPlan}>
  Add to Meal Plan
</ParticleButton>

// Save to pantry
<ParticleButton onClick={handleSave}>
  Save to Pantry
</ParticleButton>
```

> Note: If the project does not use `@/lib/utils`, replace `cn(...)` calls with plain template literals or a `style` prop approach.
