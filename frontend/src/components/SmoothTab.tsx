import React, { useRef, useLayoutEffect, useState } from 'react';
import { motion } from 'motion/react';

interface SmoothTabItem {
  id: string;
  label: string;
  icon: string;
  badge?: string;
}

interface SmoothTabProps {
  tabs: SmoothTabItem[];
  activeTab: string;
  onChange: (tabId: any) => void;
  isMobile?: boolean;
}

const SmoothTab: React.FC<SmoothTabProps> = ({ tabs, activeTab, onChange, isMobile = false }) => {
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [dimensions, setDimensions] = useState({ width: 0, left: 0 });

  useLayoutEffect(() => {
    const updateDimensions = () => {
      const activeButton = buttonRefs.current.get(activeTab);
      if (activeButton) {
        const parent = activeButton.parentElement;
        if (parent) {
          const parentRect = parent.getBoundingClientRect();
          const buttonRect = activeButton.getBoundingClientRect();
          setDimensions({
            width: buttonRect.width,
            left: buttonRect.left - parentRect.left,
          });
        }
      }
    };

    updateDimensions();

    const observer = new ResizeObserver(updateDimensions);
    const activeButton = buttonRefs.current.get(activeTab);
    if (activeButton) {
      observer.observe(activeButton);
    }

    return () => observer.disconnect();
  }, [activeTab, tabs]);

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.92)',
        borderRadius: '18px',
        padding: '4px',
        border: '1px solid rgba(237,139,0,0.12)',
        boxShadow: '0 2px 20px rgba(0,0,0,0.06)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        position: 'relative',
        overflowX: isMobile ? 'auto' : 'visible',
        gap: '2px',
      }}
    >
      {/* Sliding pill */}
      {dimensions.width > 0 && (
        <motion.div
          style={{
            position: 'absolute',
            top: '4px',
            bottom: '4px',
            background: '#ED8B00',
            borderRadius: '13px',
            boxShadow: '0 2px 10px rgba(237,139,0,0.4)',
            pointerEvents: 'none',
          }}
          animate={{
            width: dimensions.width - 8,
            x: dimensions.left + 4,
          }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        />
      )}

      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              if (el) {
                buttonRefs.current.set(tab.id, el);
              } else {
                buttonRefs.current.delete(tab.id);
              }
            }}
            onClick={() => onChange(tab.id)}
            style={{
              position: 'relative',
              zIndex: 1,
              background: 'transparent',
              border: 'none',
              borderRadius: '13px',
              padding: isMobile ? '8px 10px' : '9px 18px',
              cursor: 'pointer',
              color: isActive ? 'white' : '#9c9c94',
              fontWeight: isActive ? 700 : 500,
              fontFamily: "'Outfit', sans-serif",
              fontSize: isMobile ? '0.8rem' : '0.9375rem',
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
              flexShrink: isMobile ? 0 : undefined,
              transition: 'color 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>{tab.icon}</span>
            {!isMobile && <span>{tab.label}</span>}
            {tab.badge && (
              <span style={{ fontSize: isMobile ? '0.75rem' : '0.8125rem', opacity: 0.85 }}>
                {tab.badge}
              </span>
            )}
            {isMobile && tab.badge && (
              <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>{tab.badge}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default SmoothTab;
