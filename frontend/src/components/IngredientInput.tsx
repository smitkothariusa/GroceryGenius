import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ParticleButton from './ParticleButton';

interface Props {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  onSubmit: () => void;
  loading: boolean;
}

const IngredientInput: React.FC<Props> = ({ tags, onTagsChange, onSubmit, loading }) => {
  const { t } = useTranslation();
  const [input, setInput] = useState('');

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      const newTag = input.trim().toLowerCase();
      if (!tags.includes(newTag)) {
        onTagsChange([...tags, newTag]);
      }
      setInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        {tags.map(tag => (
          <span 
            key={tag} 
            style={{
              background: 'linear-gradient(135deg, var(--gg-tomato), var(--gg-tomato-hover))',
              color: 'white',
              padding: '0.4rem 0.9rem',
              borderRadius: 'var(--gg-radius-xl)',
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontWeight: 600,
              fontSize: '0.875rem',
              minHeight: '36px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {tag}
            <button 
              onClick={() => removeTag(tag)}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'white', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '0'
              }}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      
      <input
        type="text"
        placeholder={t('recipes.ingredientsPlaceholder')}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={handleKeyPress}
        style={{ 
          width: '100%',
          padding: '1rem',
          border: '1.5px solid var(--gg-border)',
          borderRadius: 'var(--gg-radius-md)',
          fontSize: '16px',
          fontFamily: "'Lato', sans-serif",
          background: 'var(--gg-cream)',
          color: 'var(--gg-espresso)',
          marginBottom: '1rem',
          boxSizing: 'border-box'
        }}
        disabled={loading}
      />
      
      <ParticleButton
        onClick={onSubmit}
        disabled={loading || tags.length === 0}
        style={{ width: '100%', justifyContent: 'center', padding: '0.75rem 2rem' }}
      >
        {loading ? t('recipes.generating') : t('recipes.getRecipes')}
      </ParticleButton>
    </div>
  );
};

export default IngredientInput;
