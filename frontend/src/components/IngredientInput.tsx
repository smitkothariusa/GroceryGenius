import React, { useState } from 'react';

interface Props {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  onSubmit: () => void;
  loading: boolean;
}

const IngredientInput: React.FC<Props> = ({ tags, onTagsChange, onSubmit, loading }) => {
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
              background: 'linear-gradient(45deg, #10b981, #059669)',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: '500'
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
        placeholder="Type ingredients and press Enter..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={handleKeyPress}
        style={{ 
          width: '100%', 
          padding: '1rem', 
          border: '2px solid #e5e7eb',
          borderRadius: '12px',
          fontSize: '1rem',
          marginBottom: '1rem',
          boxSizing: 'border-box'
        }}
        disabled={loading}
      />
      
      <button 
        onClick={onSubmit} 
        disabled={loading || tags.length === 0}
        style={{
          background: loading ? '#9ca3af' : 'linear-gradient(45deg, #10b981, #059669)',
          color: 'white',
          border: 'none',
          padding: '0.75rem 2rem',
          borderRadius: '12px',
          fontWeight: '600',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '1rem'
        }}
      >
        {loading ? 'Generating...' : 'Get Recipes'}
      </button>
    </div>
  );
};

export default IngredientInput;
