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
        border: 'none',
        cursor: 'pointer',
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
