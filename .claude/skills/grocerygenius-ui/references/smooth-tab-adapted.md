# SmoothTab — GroceryGenius Adaptation

Replace the contents of `frontend/src/components/SmoothTab.tsx` with this implementation.

**Key changes from the KokonutUI original:**
- Toolbar: `--gg-cream` background, `--gg-border` border
- Active pill: `--gg-espresso` (dark on cream — high contrast, distinctive)
- Active text: white; inactive text: `--gg-taupe`
- Card area: `--gg-cream` background, `--gg-border` border
- Waveform color: `--gg-tomato` for all tabs
- **Tab names**: "Recipes", "Meal Plan", "Pantry", "Shopping"
- **Desktop only**: hidden on mobile via CSS class

Add to `frontend/src/index.css` or `mobile-responsive.css`:
```css
@media (max-width: 768px) {
  .gg-smooth-tab {
    display: none !important;
  }
}
```

```tsx
"use client";

import { AnimatePresence, motion } from "motion/react";
import * as React from "react";

interface TabItem {
  id: string;
  title: string;
  cardContent?: React.ReactNode;
}

const WaveformPath = () => (
  <motion.path
    animate={{
      x: [0, 10, 0],
      transition: {
        duration: 5,
        ease: "linear",
        repeat: Number.POSITIVE_INFINITY,
      },
    }}
    d="M0 50
       C 20 40, 40 30, 60 50
       C 80 70, 100 60, 120 50
       C 140 40, 160 30, 180 50
       C 200 70, 220 60, 240 50
       C 260 40, 280 30, 300 50
       C 320 70, 340 60, 360 50
       C 380 40, 400 30, 420 50
       L 420 100 L 0 100 Z"
    initial={false}
  />
);

// GroceryGenius tab definitions
const GG_TABS: TabItem[] = [
  {
    id: "Recipes",
    title: "Recipes",
    cardContent: (
      <div className="relative h-full">
        <div className="absolute inset-0 overflow-hidden">
          <svg
            aria-hidden="true"
            className="absolute bottom-0 h-32 w-full"
            preserveAspectRatio="none"
            viewBox="0 0 420 100"
          >
            <motion.g
              animate={{ opacity: 0.12 }}
              initial={{ opacity: 0 }}
              style={{ fill: "#e8391a", stroke: "#e8391a", strokeWidth: 1 }}
              transition={{ duration: 0.5 }}
            >
              <WaveformPath />
            </motion.g>
            <motion.g
              animate={{ opacity: 0.07 }}
              initial={{ opacity: 0 }}
              style={{
                fill: "#e8391a",
                stroke: "#e8391a",
                strokeWidth: 1,
                transform: "translateY(10px)",
              }}
              transition={{ duration: 0.5 }}
            >
              <WaveformPath />
            </motion.g>
          </svg>
        </div>
        <div className="relative flex h-full flex-col p-6">
          <h3
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontWeight: 800,
              fontSize: "1.4rem",
              letterSpacing: "-0.5px",
              color: "var(--gg-espresso)",
              marginBottom: "0.35rem",
            }}
          >
            Recipes
          </h3>
          <p style={{ fontFamily: "'Lato', sans-serif", color: "var(--gg-taupe)", fontSize: "0.875rem" }}>
            Discover and save recipes tailored to your pantry
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "MealPlan",
    title: "Meal Plan",
    cardContent: (
      <div className="relative h-full">
        <div className="absolute inset-0 overflow-hidden">
          <svg
            aria-hidden="true"
            className="absolute bottom-0 h-32 w-full"
            preserveAspectRatio="none"
            viewBox="0 0 420 100"
          >
            <motion.g
              animate={{ opacity: 0.12 }}
              initial={{ opacity: 0 }}
              style={{ fill: "#2d6a4f", stroke: "#2d6a4f", strokeWidth: 1 }}
              transition={{ duration: 0.5 }}
            >
              <WaveformPath />
            </motion.g>
            <motion.g
              animate={{ opacity: 0.07 }}
              initial={{ opacity: 0 }}
              style={{
                fill: "#2d6a4f",
                stroke: "#2d6a4f",
                strokeWidth: 1,
                transform: "translateY(10px)",
              }}
              transition={{ duration: 0.5 }}
            >
              <WaveformPath />
            </motion.g>
          </svg>
        </div>
        <div className="relative flex h-full flex-col p-6">
          <h3
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontWeight: 800,
              fontSize: "1.4rem",
              letterSpacing: "-0.5px",
              color: "var(--gg-espresso)",
              marginBottom: "0.35rem",
            }}
          >
            Meal Plan
          </h3>
          <p style={{ fontFamily: "'Lato', sans-serif", color: "var(--gg-taupe)", fontSize: "0.875rem" }}>
            Plan your week, reduce waste, eat well
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "Pantry",
    title: "Pantry",
    cardContent: (
      <div className="relative h-full">
        <div className="absolute inset-0 overflow-hidden">
          <svg
            aria-hidden="true"
            className="absolute bottom-0 h-32 w-full"
            preserveAspectRatio="none"
            viewBox="0 0 420 100"
          >
            <motion.g
              animate={{ opacity: 0.12 }}
              initial={{ opacity: 0 }}
              style={{ fill: "#e8962a", stroke: "#e8962a", strokeWidth: 1 }}
              transition={{ duration: 0.5 }}
            >
              <WaveformPath />
            </motion.g>
            <motion.g
              animate={{ opacity: 0.07 }}
              initial={{ opacity: 0 }}
              style={{
                fill: "#e8962a",
                stroke: "#e8962a",
                strokeWidth: 1,
                transform: "translateY(10px)",
              }}
              transition={{ duration: 0.5 }}
            >
              <WaveformPath />
            </motion.g>
          </svg>
        </div>
        <div className="relative flex h-full flex-col p-6">
          <h3
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontWeight: 800,
              fontSize: "1.4rem",
              letterSpacing: "-0.5px",
              color: "var(--gg-espresso)",
              marginBottom: "0.35rem",
            }}
          >
            Pantry
          </h3>
          <p style={{ fontFamily: "'Lato', sans-serif", color: "var(--gg-taupe)", fontSize: "0.875rem" }}>
            Track what you have, nothing goes to waste
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "Shopping",
    title: "Shopping",
    cardContent: (
      <div className="relative h-full">
        <div className="absolute inset-0 overflow-hidden">
          <svg
            aria-hidden="true"
            className="absolute bottom-0 h-32 w-full"
            preserveAspectRatio="none"
            viewBox="0 0 420 100"
          >
            <motion.g
              animate={{ opacity: 0.12 }}
              initial={{ opacity: 0 }}
              style={{ fill: "#c42f14", stroke: "#c42f14", strokeWidth: 1 }}
              transition={{ duration: 0.5 }}
            >
              <WaveformPath />
            </motion.g>
            <motion.g
              animate={{ opacity: 0.07 }}
              initial={{ opacity: 0 }}
              style={{
                fill: "#c42f14",
                stroke: "#c42f14",
                strokeWidth: 1,
                transform: "translateY(10px)",
              }}
              transition={{ duration: 0.5 }}
            >
              <WaveformPath />
            </motion.g>
          </svg>
        </div>
        <div className="relative flex h-full flex-col p-6">
          <h3
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontWeight: 800,
              fontSize: "1.4rem",
              letterSpacing: "-0.5px",
              color: "var(--gg-espresso)",
              marginBottom: "0.35rem",
            }}
          >
            Shopping
          </h3>
          <p style={{ fontFamily: "'Lato', sans-serif", color: "var(--gg-taupe)", fontSize: "0.875rem" }}>
            Smart lists built from your meal plan
          </p>
        </div>
      </div>
    ),
  },
];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "100%" : "-100%",
    opacity: 0,
    filter: "blur(8px)",
    scale: 0.95,
    position: "absolute" as const,
  }),
  center: {
    x: 0,
    opacity: 1,
    filter: "blur(0px)",
    scale: 1,
    position: "absolute" as const,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? "100%" : "-100%",
    opacity: 0,
    filter: "blur(8px)",
    scale: 0.95,
    position: "absolute" as const,
  }),
};

const transition = { duration: 0.4, ease: [0.32, 0.72, 0, 1] };

interface SmoothTabProps {
  items?: TabItem[];
  defaultTabId?: string;
  className?: string;
  onChange?: (tabId: string) => void;
}

export default function SmoothTab({
  items = GG_TABS,
  defaultTabId = GG_TABS[0].id,
  className,
  onChange,
}: SmoothTabProps) {
  const [selected, setSelected] = React.useState(defaultTabId);
  const [direction, setDirection] = React.useState(0);
  const [dimensions, setDimensions] = React.useState({ width: 0, left: 0 });

  const buttonRefs = React.useRef<Map<string, HTMLButtonElement>>(new Map());
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    const updateDimensions = () => {
      const btn = buttonRefs.current.get(selected);
      const container = containerRef.current;
      if (btn && container) {
        const rect = btn.getBoundingClientRect();
        const cRect = container.getBoundingClientRect();
        setDimensions({ width: rect.width, left: rect.left - cRect.left });
      }
    };
    requestAnimationFrame(updateDimensions);
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [selected]);

  const handleTabClick = (tabId: string) => {
    const currentIdx = items.findIndex((i) => i.id === selected);
    const newIdx = items.findIndex((i) => i.id === tabId);
    setDirection(newIdx > currentIdx ? 1 : -1);
    setSelected(tabId);
    onChange?.(tabId);
  };

  const selectedItem = items.find((i) => i.id === selected);

  return (
    // gg-smooth-tab class is used by CSS to hide on mobile
    <div className={`gg-smooth-tab flex h-full flex-col ${className ?? ""}`}>
      {/* Card content */}
      <div className="relative mb-4 flex-1">
        <div
          className="relative h-[200px] w-full overflow-hidden"
          style={{
            background: "var(--gg-cream)",
            border: "1.5px solid var(--gg-border)",
            borderRadius: "var(--gg-radius-lg)",
          }}
        >
          <AnimatePresence custom={direction} initial={false} mode="popLayout">
            <motion.div
              animate="center"
              className="absolute inset-0 h-full w-full will-change-transform"
              custom={direction}
              exit="exit"
              initial="enter"
              key={`card-${selected}`}
              style={{
                background: "var(--gg-cream)",
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
              }}
              transition={transition as any}
              variants={slideVariants as any}
            >
              {selectedItem?.cardContent}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Tab toolbar */}
      <div
        aria-label="Navigation tabs"
        className="relative mt-auto flex items-center justify-between gap-1 py-1"
        ref={containerRef}
        role="tablist"
        style={{
          background: "var(--gg-cream)",
          border: "1.5px solid var(--gg-border)",
          borderRadius: "var(--gg-radius-xl)",
          boxShadow: "var(--gg-shadow-sm)",
        }}
      >
        {/* Sliding espresso pill */}
        <motion.div
          animate={{
            width: dimensions.width - 8,
            x: dimensions.left + 4,
            opacity: 1,
          }}
          initial={false}
          style={{
            position: "absolute",
            height: "calc(100% - 8px)",
            top: "4px",
            background: "var(--gg-espresso)",
            borderRadius: "calc(var(--gg-radius-xl) - 4px)",
            zIndex: 1,
          }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />

        <div className="relative z-[2] grid w-full gap-1" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
          {items.map((item) => {
            const isSelected = selected === item.id;
            return (
              <motion.button
                aria-selected={isSelected}
                id={`tab-${item.id}`}
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                ref={(el) => {
                  if (el) buttonRefs.current.set(item.id, el);
                  else buttonRefs.current.delete(item.id);
                }}
                role="tab"
                tabIndex={isSelected ? 0 : -1}
                type="button"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "6px 8px",
                  borderRadius: "calc(var(--gg-radius-xl) - 6px)",
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  color: isSelected ? "#ffffff" : "var(--gg-taupe)",
                  transition: "color 0.2s",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.title}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

## Notes on the app's existing tab structure

The current app uses `SmoothTab` for navigation between "Recipes", "Meal Plan", etc. The adapted version above preserves that routing — just update the `onChange` prop to call your existing navigation handler.

If the current tab IDs differ from "Recipes/MealPlan/Pantry/Shopping", adjust the `GG_TABS` array to match the actual section IDs used in the app.
