/**
 * FavoriteHeartButton — adapted from uiverse.io heart toggle
 * Heart fills red on favorite, with a burst-scale animation.
 * Uses motion/react — no external CSS files.
 */
import { motion } from 'motion/react';
import { useState } from 'react';

interface FavoriteHeartButtonProps {
  isFavorited: boolean;
  onClick: (e: React.MouseEvent) => void;
  size?: number;
  style?: React.CSSProperties;
}

export default function FavoriteHeartButton({
  isFavorited,
  onClick,
  size = 34,
  style,
}: FavoriteHeartButtonProps) {
  const [bursting, setBursting] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isFavorited) {
      setBursting(true);
      setTimeout(() => setBursting(false), 450);
    }
    onClick(e);
  };

  return (
    <motion.button
      onClick={handleClick}
      whileTap={{ scale: 0.8 }}
      animate={bursting ? { scale: [1, 1.45, 0.95, 1] } : { scale: 1 }}
      transition={{ duration: 0.4, times: [0, 0.4, 0.7, 1] }}
      title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1,
        ...style,
      }}
    >
      <svg
        viewBox="0 0 256 256"
        width={size}
        height={size}
        style={{ overflow: 'visible' }}
      >
        {/* Filled heart — visible when favorited */}
        <motion.path
          d="M232,102c0,66-104,122-104,122S24,168,24,102A54,54,0,0,1,78,48c22.59,0,41.94,12.31,50,32,8.06-19.69,27.41-32,50-32A54,54,0,0,1,232,102Z"
          animate={{
            fill: isFavorited ? '#EF3340' : 'transparent',
            opacity: isFavorited ? 1 : 0,
          }}
          transition={{ duration: 0.22 }}
        />
        {/* Outline heart — always visible, color shifts */}
        <motion.path
          d="M178,40c-20.65,0-38.73,8.88-50,23.89C116.73,48.88,98.65,40,78,40a62.07,62.07,0,0,0-62,62c0,70,103.79,126.66,108.21,129a8,8,0,0,0,7.58,0C136.21,228.66,240,172,240,102A62.07,62.07,0,0,0,178,40ZM128,214.8C109.74,204.16,32,155.69,32,102A46.06,46.06,0,0,1,78,56c19.45,0,35.78,10.36,42.6,27a8,8,0,0,0,14.8,0c6.82-16.67,23.15-27,42.6-27a46.06,46.06,0,0,1,46,46C224,155.61,146.24,204.15,128,214.8Z"
          animate={{
            fill: isFavorited ? '#EF3340' : '#9ca3af',
          }}
          transition={{ duration: 0.22 }}
        />
      </svg>
    </motion.button>
  );
}
