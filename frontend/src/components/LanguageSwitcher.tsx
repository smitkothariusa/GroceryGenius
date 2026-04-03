import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
];

interface LanguageSwitcherProps {
  compact?: boolean;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ compact = false }) => {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LANGUAGES.find(l => l.code === i18n.language) ?? LANGUAGES[0];

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const select = (code: string) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Change language"
        style={{
          padding: compact ? '0.4rem 0.5rem' : '0.4rem 0.65rem',
          background: 'var(--gg-cream)',
          border: '1px solid var(--gg-border)',
          borderRadius: 'var(--gg-radius-md)',
          cursor: 'pointer',
          fontWeight: '700',
          fontFamily: "'Lato', sans-serif",
          color: 'var(--gg-espresso)',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.3rem',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ fontSize: compact ? '1.1rem' : '1rem' }}>🌐</span>
        {!compact && <span>{current.code.toUpperCase()}</span>}
        {!compact && <span style={{ fontSize: '0.6rem', opacity: 0.6 }}>{open ? '▲' : '▼'}</span>}
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          right: 0,
          background: 'var(--gg-cream)',
          border: '1px solid var(--gg-border)',
          borderRadius: 'var(--gg-radius-md)',
          boxShadow: 'var(--gg-shadow-md)',
          zIndex: 999,
          minWidth: '150px',
          overflow: 'hidden',
        }}>
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => select(lang.code)}
              style={{
                width: '100%',
                padding: '0.6rem 1rem',
                background: lang.code === i18n.language ? 'var(--gg-parchment)' : 'var(--gg-cream)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                fontSize: '0.875rem',
                fontWeight: lang.code === i18n.language ? 600 : '400',
                fontFamily: lang.code === i18n.language ? "'Bricolage Grotesque', sans-serif" : 'inherit',
                color: lang.code === i18n.language ? 'var(--gg-tomato)' : 'var(--gg-espresso)',
                textAlign: 'left',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => {
                if (lang.code !== i18n.language)
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--gg-parchment)';
              }}
              onMouseLeave={e => {
                if (lang.code !== i18n.language)
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--gg-cream)';
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>{lang.flag}</span>
              {lang.label}
              {lang.code === i18n.language && <span style={{ marginLeft: 'auto' }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
