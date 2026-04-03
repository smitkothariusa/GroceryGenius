import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getStyles = () => {
    switch (type) {
      case 'success':
        return {
          background: 'linear-gradient(135deg, var(--gg-forest) 0%, var(--gg-forest-hover) 100%)',
          icon: '✅'
        };
      case 'error':
        return {
          background: 'linear-gradient(135deg, var(--gg-red) 0%, var(--gg-red-hover) 100%)',
          icon: '❌'
        };
      case 'warning':
        return {
          background: 'linear-gradient(135deg, var(--gg-amber) 0%, var(--gg-amber-hover) 100%)',
          icon: '⚠️'
        };
      case 'info':
        return {
          background: 'linear-gradient(135deg, var(--gg-espresso) 0%, #3a2a1a 100%)',
          icon: 'ℹ️'
        };
      default:
        return {
          background: 'linear-gradient(135deg, var(--gg-espresso) 0%, #3a2a1a 100%)',
          icon: 'ℹ️'
        };
    }
  };

  const styles = getStyles();

  return (
    <div
      className="gg-toast"
      style={{
        position: 'fixed',
        bottom: '2rem',
        right: '2rem',
        background: styles.background,
        color: 'white',
        padding: '1rem 1.5rem',
        borderRadius: 'var(--gg-radius-lg)',
        boxShadow: 'var(--gg-shadow-lg)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        zIndex: 10000,
        minWidth: '300px',
        maxWidth: '500px',
        animation: 'slideInRight 0.3s ease-out',
        cursor: 'pointer'
      }}
      onClick={onClose}
    >
      <span style={{ fontSize: '1.5rem' }}>{styles.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontFamily: "'Bricolage Grotesque', sans-serif", marginBottom: '0.25rem' }}>
          {type.charAt(0).toUpperCase() + type.slice(1)}
        </div>
        <div style={{ fontSize: '0.875rem', opacity: 0.9, fontFamily: "'Lato', sans-serif" }}>
          {message}
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        style={{
          background: 'rgba(255,255,255,0.2)',
          border: 'none',
          color: 'white',
          borderRadius: '50%',
          width: '24px',
          height: '24px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1rem'
        }}
      >
        ×
      </button>
    </div>
  );
};

export default Toast;