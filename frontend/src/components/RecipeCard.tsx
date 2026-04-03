import React from 'react';
import { useTranslation } from 'react-i18next';
import { Recipe } from '../services/recipeService';

interface Props {
  recipe: Recipe;
  index: number;
}

const RecipeCard: React.FC<Props> = ({ recipe, index }) => {
  const { t } = useTranslation();
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
    if (rating.startsWith('A')) return 'var(--gg-forest)';
    if (rating.startsWith('B')) return 'var(--gg-forest)';
    if (rating.startsWith('C')) return 'var(--gg-amber)';
    return 'var(--gg-red)';
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
      background: 'var(--gg-cream)',
      borderRadius: 'var(--gg-radius-lg)',
      padding: '1.5rem',
      boxShadow: 'var(--gg-shadow-sm)',
      marginBottom: '1rem',
      border: '1.5px solid var(--gg-border)',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <h3 style={{
          margin: '0',
          color: 'var(--gg-espresso)',
          fontSize: '1.3rem',
          fontWeight: 800,
          fontFamily: "'Bricolage Grotesque', sans-serif",
          lineHeight: '1.3',
          letterSpacing: '-0.5px',
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
            borderRadius: 'var(--gg-radius-md)',
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
            color: 'var(--gg-taupe)',
            fontWeight: '500'
          }}>
            {t('recipes.healthGrade')}
          </span>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {recipe.prep_time && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ fontSize: '1rem' }}>⏱</span>
            <span style={{ color: 'var(--gg-taupe)', fontSize: '0.875rem' }}>
              <strong>{t('recipes.prepTime')}:</strong> {recipe.prep_time}
            </span>
          </div>
        )}
        
        {recipe.cook_time && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ fontSize: '1rem' }}>🔥</span>
            <span style={{ color: 'var(--gg-taupe)', fontSize: '0.875rem' }}>
              <strong>{t('recipes.cookTime')}:</strong> {recipe.cook_time}
            </span>
          </div>
        )}

        {recipe.difficulty && (
          <span style={{
            padding: '0.25rem 0.75rem',
            borderRadius: '12px',
            fontSize: '0.875rem',
            fontWeight: '500',
            background: recipe.difficulty.toLowerCase().includes('easy') ? 'var(--gg-forest-light)' :
                       recipe.difficulty.toLowerCase().includes('medium') ? 'var(--gg-amber-light)' :
                       'var(--gg-red-light)',
            color: recipe.difficulty.toLowerCase().includes('easy') ? 'var(--gg-forest)' :
                   recipe.difficulty.toLowerCase().includes('medium') ? 'var(--gg-amber-hover)' :
                   'var(--gg-red)',
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontWeight: 600,
          }}>
            {recipe.difficulty}
          </span>
        )}
        
        {recipe.servings && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ fontSize: '1rem' }}>👥</span>
            <span style={{ color: 'var(--gg-taupe)', fontSize: '0.875rem' }}>
              <strong>{t('recipes.servings')}:</strong> {recipe.servings}
            </span>
          </div>
        )}
      </div>

      {recipe.nutrition && (
        <div style={{
          background: 'var(--gg-parchment)',
          padding: '1rem',
          borderRadius: '12px',
          marginBottom: '1rem',
          border: '1px solid var(--gg-border)',
        }}>
          <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.8rem', fontWeight: 600, color: 'var(--gg-taupe)', fontFamily: "'Bricolage Grotesque', sans-serif", textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {t('recipes.nutritionFacts')}
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', fontSize: '0.85rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: '600', color: 'var(--gg-forest)' }}>{recipe.nutrition.calories}</div>
              <div style={{ color: 'var(--gg-taupe)' }}>{t('recipes.calories')}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: '600', color: 'var(--gg-espresso)' }}>{recipe.nutrition.protein}g</div>
              <div style={{ color: 'var(--gg-taupe)' }}>{t('recipes.protein')}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: '600', color: 'var(--gg-espresso)' }}>{recipe.nutrition.carbs}g</div>
              <div style={{ color: 'var(--gg-taupe)' }}>{t('recipes.carbs')}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: '600', color: 'var(--gg-amber)' }}>{recipe.nutrition.fat}g</div>
              <div style={{ color: 'var(--gg-taupe)' }}>{t('recipes.fat')}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: '600', color: 'var(--gg-forest)' }}>{recipe.nutrition.fiber}g</div>
              <div style={{ color: 'var(--gg-taupe)' }}>{t('recipes.fiber')}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: '600', color: 'var(--gg-red)' }}>{recipe.nutrition.sodium}mg</div>
              <div style={{ color: 'var(--gg-taupe)' }}>{t('recipes.sodium')}</div>
            </div>
          </div>
        </div>
      )}

      {recipe.health_benefits && (
        <div style={{
          background: 'var(--gg-forest-light)',
          padding: '0.75rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          border: '1px solid var(--gg-border)',
        }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--gg-forest)', fontWeight: '500', marginBottom: '0.25rem' }}>
            {t('recipes.healthBenefitsHeading')}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--gg-forest)', lineHeight: '1.4' }}>
            {recipe.health_benefits}
          </div>
        </div>
      )}

      {recipe.budget_tip && (
        <div style={{
          background: 'var(--gg-amber-light)',
          padding: '0.75rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          border: '1px solid var(--gg-border)',
        }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--gg-amber-hover)', fontWeight: '500', marginBottom: '0.25rem' }}>
            {t('recipes.moneySavingHeading')}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--gg-amber-hover)', lineHeight: '1.4' }}>
            {recipe.budget_tip}
          </div>
        </div>
      )}
      
      <div style={{
        background: 'var(--gg-parchment)',
        padding: '1rem',
        borderRadius: '8px',
        marginBottom: '1rem',
        border: '1px solid var(--gg-border)',
      }}>
        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: '600', color: 'var(--gg-espresso)' }}>
          {t('recipes.quickPreview')}
        </h4>
        <p style={{ 
          color: 'var(--gg-taupe)',
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
        color: 'var(--gg-tomato)',
        fontWeight: 600,
        fontSize: '0.9rem',
        padding: '0.75rem',
        background: 'var(--gg-tomato-subtle)',
        borderRadius: '8px',
        border: '1.5px solid var(--gg-tomato)',
        fontFamily: "'Bricolage Grotesque', sans-serif",
      }}>
        {t('recipes.clickForFullRecipe')}
      </div>
    </div>
  );
};

export default RecipeCard;