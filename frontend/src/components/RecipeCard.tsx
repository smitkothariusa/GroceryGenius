import React from 'react';
import { Recipe } from '../services/recipeService';

interface Props {
  recipe: Recipe;
  index: number;
}

const RecipeCard: React.FC<Props> = ({ recipe, index }) => {
  const cleanName = (() => {
    let name = recipe.name;
    
    // Remove array/object syntax artifacts
    name = name.replace(/^\s*\[?\s*{\s*"?name"?\s*:?\s*"?/i, '');
    name = name.replace(/^\s*\[?\s*{\s*/i, '');
    name = name.replace(/\s*}?\s*\]?\s*$/i, '');
    
    // Remove numbering
    name = name.replace(/^\d+\.\s*/, '');
    
    // Remove quotes
    name = name.replace(/^["']+|["']+$/g, '');
    
    // Remove markdown/json artifacts
    name = name.replace(/^\*\*\d+\.\s*```json\s*\[\s*{\s*"name"\*\*\s*/, '');
    name = name.replace(/```json/g, '');
    name = name.replace(/```/g, '');
    
    return name.trim();
  })();

  const cleanInstructions = (() => {
    let text = recipe.instructions;
    
    // Remove JSON/markdown artifacts
    text = text.replace(/```json/g, '');
    text = text.replace(/```/g, '');
    text = text.replace(/^\s*\[?\s*{?\s*"?instructions"?\s*:?\s*"?/i, '');
    text = text.replace(/"\s*}?\s*]?\s*$/g, '');
    text = text.trim();
    
    // Handle JSON array format like ['step1', 'step2']
    if (text.startsWith('[') && text.endsWith(']')) {
      try {
        const stepsArray = JSON.parse(text);
        if (Array.isArray(stepsArray)) {
          return stepsArray.join(' ');
        }
      } catch (e) {
        // Manual parsing - remove brackets and quotes
        text = text
          .replace(/^\[|\]$/g, '')
          .replace(/["']/g, '')
          .split(',')
          .map(s => s.trim())
          .filter(s => s.length > 0)
          .join(' ');
      }
    }
    
    // Remove any remaining quotes
    text = text.replace(/^["']+|["']+$/g, '');
    
    return text.trim();
  })();

  // Calculate health rating based on nutrition (A-F scale)
  const calculateHealthRating = (): string => {
    if (!recipe.nutrition) return 'B';
    
    const { calories, protein, fiber, sodium, fat } = recipe.nutrition;
    let score = 70;
    
    if (protein >= 20) score += 10;
    else if (protein >= 15) score += 5;
    
    if (fiber >= 6) score += 10;
    else if (fiber >= 4) score += 5;
    
    if (calories > 600) score -= 10;
    else if (calories < 300) score -= 5;
    
    if (sodium > 900) score -= 10;
    else if (sodium < 500) score += 5;
    
    if (fat > 20) score -= 5;
    else if (fat < 10) score += 5;
    
    if (score >= 90) return 'A+';
    if (score >= 85) return 'A';
    if (score >= 80) return 'A-';
    if (score >= 75) return 'B+';
    if (score >= 70) return 'B';
    if (score >= 65) return 'B-';
    if (score >= 60) return 'C+';
    if (score >= 55) return 'C';
    return 'C-';
  };

  const healthRating = calculateHealthRating();
  
  const getRatingColor = (rating: string): string => {
    if (rating.startsWith('A')) return '#10b981';
    if (rating.startsWith('B')) return '#3b82f6';
    if (rating.startsWith('C')) return '#f59e0b';
    return '#ef4444';
  };

  // Better format instructions preview - get first meaningful sentence
  const formatInstructionsPreview = (text: string, maxLength: number = 150): string => {
    // Remove numbering at start
    let cleaned = text.replace(/^\d+[\.)]\s*/, '').trim();
    
    // Split by common delimiters
    const sentences = cleaned.split(/[.!?]\n/);
    let preview = sentences[0]?.trim() || cleaned;
    
    // If still starts with just a number, try to get more context
    if (/^\d+$/.test(preview) || preview.length < 20) {
      preview = cleaned.substring(0, maxLength);
    }
    
    if (preview.length > maxLength) {
      preview = preview.substring(0, maxLength);
    }
    
    // Clean up any trailing punctuation before adding ellipsis
    preview = preview.replace(/[.,;:]$/, '');
    
    return preview + '...';
  };

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.95)',
      borderRadius: '16px',
      padding: '1.5rem',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
      marginBottom: '1rem',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      transition: 'all 0.3s ease',
      cursor: 'pointer'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <h3 style={{ 
          margin: '0', 
          color: '#1f2937', 
          fontSize: '1.25rem', 
          fontWeight: '700',
          lineHeight: '1.4',
          flex: 1,
          paddingRight: '1rem'
        }}>
          {index + 1}. {cleanName}
        </h3>
        
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.25rem'
        }}>
          <div style={{
            background: getRatingColor(healthRating),
            color: 'white',
            padding: '0.5rem 0.75rem',
            borderRadius: '12px',
            fontSize: '1rem',
            fontWeight: '700',
            minWidth: '50px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}>
            {healthRating}
          </div>
          <span style={{
            fontSize: '0.7rem',
            color: '#6b7280',
            fontWeight: '500'
          }}>
            Health Grade
          </span>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {recipe.prep_time && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ fontSize: '1rem' }}>⏱</span>
            <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
              <strong>Prep:</strong> {recipe.prep_time}
            </span>
          </div>
        )}
        
        {recipe.cook_time && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ fontSize: '1rem' }}>🔥</span>
            <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
              <strong>Cook:</strong> {recipe.cook_time}
            </span>
          </div>
        )}

        {recipe.difficulty && (
          <span style={{
            padding: '0.25rem 0.75rem',
            borderRadius: '12px',
            fontSize: '0.875rem',
            fontWeight: '500',
            background: recipe.difficulty.toLowerCase().includes('easy') ? '#dcfce7' : 
                       recipe.difficulty.toLowerCase().includes('medium') ? '#fef3c7' : 
                       recipe.difficulty.toLowerCase().includes('hard') ? '#fee2e2' : '#e0e7ff',
            color: recipe.difficulty.toLowerCase().includes('easy') ? '#166534' : 
                   recipe.difficulty.toLowerCase().includes('medium') ? '#92400e' :
                   recipe.difficulty.toLowerCase().includes('hard') ? '#dc2626' : '#3730a3'
          }}>
            {recipe.difficulty}
          </span>
        )}
        
        {recipe.servings && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ fontSize: '1rem' }}>👥</span>
            <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
              <strong>Servings:</strong> {recipe.servings}
            </span>
          </div>
        )}
      </div>

      {recipe.nutrition && (
        <div style={{
          background: '#f8fafc',
          padding: '1rem',
          borderRadius: '12px',
          marginBottom: '1rem',
          border: '1px solid #e2e8f0'
        }}>
          <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>
            Nutrition per serving
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', fontSize: '0.85rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: '600', color: '#059669' }}>{recipe.nutrition.calories}</div>
              <div style={{ color: '#6b7280' }}>Calories</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: '600', color: '#7c3aed' }}>{recipe.nutrition.protein}g</div>
              <div style={{ color: '#6b7280' }}>Protein</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: '600', color: '#dc2626' }}>{recipe.nutrition.carbs}g</div>
              <div style={{ color: '#6b7280' }}>Carbs</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: '600', color: '#f59e0b' }}>{recipe.nutrition.fat}g</div>
              <div style={{ color: '#6b7280' }}>Fat</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: '600', color: '#10b981' }}>{recipe.nutrition.fiber}g</div>
              <div style={{ color: '#6b7280' }}>Fiber</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: '600', color: '#ef4444' }}>{recipe.nutrition.sodium}mg</div>
              <div style={{ color: '#6b7280' }}>Sodium</div>
            </div>
          </div>
        </div>
      )}

      {recipe.health_benefits && (
        <div style={{
          background: '#f0fdf4',
          padding: '0.75rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          border: '1px solid #bbf7d0'
        }}>
          <div style={{ fontSize: '0.85rem', color: '#166534', fontWeight: '500', marginBottom: '0.25rem' }}>
            Health Benefits:
          </div>
          <div style={{ fontSize: '0.8rem', color: '#047857', lineHeight: '1.4' }}>
            {recipe.health_benefits}
          </div>
        </div>
      )}

      {recipe.budget_tip && (
        <div style={{
          background: '#fef3c7',
          padding: '0.75rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          border: '1px solid #fbbf24'
        }}>
          <div style={{ fontSize: '0.85rem', color: '#92400e', fontWeight: '500', marginBottom: '0.25rem' }}>
            Money-Saving Tip:
          </div>
          <div style={{ fontSize: '0.8rem', color: '#a16207', lineHeight: '1.4' }}>
            {recipe.budget_tip}
          </div>
        </div>
      )}
      
      <div style={{
        background: '#fafafa',
        padding: '1rem',
        borderRadius: '8px',
        marginBottom: '1rem',
        border: '1px solid #e5e7eb'
      }}>
        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>
          Quick Preview:
        </h4>
        <p style={{ 
          color: '#4b5563', 
          lineHeight: '1.6', 
          margin: 0,
          fontSize: '0.9rem'
        }}>
          {formatInstructionsPreview(cleanInstructions, 150)}
        </p>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        color: '#10b981',
        fontWeight: '600',
        fontSize: '0.9rem',
        padding: '0.75rem',
        background: '#f0fdf4',
        borderRadius: '8px',
        border: '1px solid #bbf7d0'
      }}>
        Click for full recipe with detailed ingredients & measurements
      </div>
    </div>
  );
};

export default RecipeCard;