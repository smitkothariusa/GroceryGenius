import React, { useState } from 'react';

interface SlideTextButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text: string;
  hoverText?: string;
  buttonStyle?: React.CSSProperties;
}

const SlideTextButton: React.FC<SlideTextButtonProps> = ({
  text,
  hoverText,
  buttonStyle,
  style,
  ...rest
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const resolvedHoverText = hoverText ?? text;

  return (
    <button
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        overflow: 'hidden',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1.5px solid var(--gg-espresso)',
        borderRadius: 'var(--gg-radius-md)',
        cursor: 'pointer',
        color: isHovered ? '#ffffff' : 'var(--gg-espresso)',
        background: isHovered ? 'var(--gg-tomato)' : 'transparent',
        transition: 'color 0.28s, background 0.28s',
        fontFamily: "'Bricolage Grotesque', sans-serif",
        fontWeight: 600,
        letterSpacing: '0.5px',
        ...buttonStyle,
        ...style,
      }}
      {...rest}
    >
      {/* Primary text */}
      <span
        style={{
          display: 'block',
          transform: isHovered ? 'translateY(-100%)' : 'translateY(0)',
          transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {text}
      </span>

      {/* Hover text */}
      <span
        style={{
          position: 'absolute',
          display: 'block',
          transform: isHovered ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {resolvedHoverText}
      </span>
    </button>
  );
};

export default SlideTextButton;
