import { useTranslation } from 'react-i18next';
import { useFavorites, type FavoriteRecipe } from '../favorites/FavoritesContext';
import { useRecipes } from './RecipesContext';

interface RecipeDetailModalProps {
  isMobile: boolean;
  cardBg: string;
  mutedText: string;
}

/**
 * The recipe detail modal — physically distant from the recipe list/grid in
 * the old App.tsx (it rendered ~3000 lines further down), but conceptually
 * part of the Recipes feature: it's opened both from the Recipes tab's cards
 * and from the Favorites tab (via `setSelectedRecipe`/`setShowDetailedView`,
 * both owned by RecipesContext).
 */
export function RecipeDetailModal({ isMobile, cardBg, mutedText }: RecipeDetailModalProps) {
  const { t } = useTranslation();
  const { translatedFavoriteNames } = useFavorites();
  const {
    selectedRecipe,
    showDetailedView,
    setShowDetailedView,
    setSelectedIngredient,
    setShowSubstitution,
  } = useRecipes();

  if (!showDetailedView || !selectedRecipe) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={() => setShowDetailedView(false)}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center',
        alignItems: 'center', zIndex: 1000, padding: '2rem', overflow: 'auto'
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: cardBg,
          borderRadius: '20px',
          padding: isMobile ? '1.5rem' : '2rem',
          maxWidth: isMobile ? '95vw' : '800px',
          width: isMobile ? '95vw' : 'auto',
          maxHeight: '90vh',
          overflow: 'auto',
          position: 'relative',
          animation: 'scaleIn 0.3s ease-out'
        }}
      >
        <button onClick={() => setShowDetailedView(false)} style={{
          position: 'absolute', top: '1rem', right: '1rem', background: '#f3f4f6',
          border: 'none', borderRadius: '50%', width: '40px', height: '40px',
          cursor: 'pointer', fontSize: '1.5rem'
        }}>×</button>

        <h2 style={{ marginBottom: '1.5rem', fontSize: '2rem', fontWeight: '700', paddingRight: '3rem' }}>
          {(selectedRecipe as FavoriteRecipe).id && translatedFavoriteNames[(selectedRecipe as FavoriteRecipe).id]
            ? translatedFavoriteNames[(selectedRecipe as FavoriteRecipe).id]
            : selectedRecipe.name}
        </h2>

        <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {selectedRecipe.difficulty && <span style={{ fontSize: '1.1rem' }}>⚡ {selectedRecipe.difficulty}</span>}
          {selectedRecipe.servings && <span style={{ fontSize: '1.1rem' }}>👥 {selectedRecipe.servings} {t('recipes.servings')}</span>}
          {selectedRecipe.prep_time && <span style={{ fontSize: '1.1rem' }}>⏱️ {t('recipes.prepTime')}: {selectedRecipe.prep_time}</span>}
          {selectedRecipe.cook_time && <span style={{ fontSize: '1.1rem' }}>🔥 {t('recipes.cookTime')}: {selectedRecipe.cook_time}</span>}
        </div>

        {selectedRecipe.nutrition && (
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '600', borderBottom: '2px solid #10b981', paddingBottom: '0.5rem' }}>
              📊 {t('recipes.nutritionFacts')}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
              {(Object.entries(selectedRecipe.nutrition) as [string, number][]).map(([key, val]) => {
                const unit = key === 'sodium' ? 'mg' : key === 'calories' ? '' : 'g';
                const labelKey = `recipes.${key}` as const;
                return (
                  <div key={key} style={{ textAlign: 'center', padding: '1rem', background: '#f0fdf4', borderRadius: '12px' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#10b981' }}>{val}{unit}</div>
                    <div style={{ fontSize: '0.875rem', color: mutedText }}>{t(labelKey)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '600', borderBottom: '2px solid #10b981', paddingBottom: '0.5rem' }}>
            📝 {t('recipes.ingredientsHeading')}
          </h3>
          <div style={{
            background: '#f0fdf4',
            padding: '1.5rem',
            borderRadius: '12px',
            marginTop: '1rem',
            fontSize: '0.95rem'
          }}>
            {(() => {
              const detailScale = (selectedRecipe.originalServings && selectedRecipe.servings)
                ? selectedRecipe.servings / selectedRecipe.originalServings
                : 1;
              const fmtQty = (q: number) => {
                const scaled = q * detailScale;
                return parseFloat(scaled.toFixed(2)).toString();
              };
              return (typeof selectedRecipe.ingredients === 'string'
                ? selectedRecipe.ingredients.split('\n')
                : selectedRecipe.ingredients
              ).map((line, idx) => {
                // Parse ingredient from line
              const match = line.match(/^(\d+(?:\.\d+)?(?:\/\d+)?)\s*([a-zA-Z]+)\s+(.+)$/);

              if (match) {
                const [, quantity, unit, name] = match;
                const displayQty = fmtQty(quantity.includes('/') ? (() => { const [n,d] = quantity.split('/').map(Number); return n/d; })() : parseFloat(quantity));
                const cleanName = name.trim().toLowerCase()
                  .replace(/\b(fresh|dried|raw|cooked|minced|chopped|diced|sliced|grated)\b/g, '')
                  .trim();

                // Check if substitutions exist for this ingredient (must match actual substitution database keys)
                const commonIngredients = [
                  'chicken', 'beef', 'pork', 'fish', 'salmon', 'shrimp',
                  'milk', 'butter', 'cheese', 'cream', 'yogurt', 'egg',
                  'rice', 'pasta', 'flour', 'bread',
                  'sugar', 'oil', 'potato', 'tomato'
                ];

                const hasSubstitutions = commonIngredients.some(ing =>
                  cleanName.includes(ing) || ing.includes(cleanName)
                );

                if (hasSubstitutions) {
                  // Clickable ingredient with substitutions
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedIngredient({
                          name: name.trim(),
                          quantity: parseFloat(quantity),
                          unit: unit.toLowerCase()
                        });
                        setShowSubstitution(true);
                      }}
                      style={{
                        padding: '0.75rem',
                        marginBottom: '0.5rem',
                        background: 'white',
                        border: '2px solid #86efac',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        lineHeight: '1.6'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#dcfce7';
                        e.currentTarget.style.borderColor = '#10b981';
                        e.currentTarget.style.transform = 'translateX(4px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.borderColor = '#86efac';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }}
                    >
                      <span style={{ fontWeight: '600', color: '#059669' }}>
                        {displayQty} {unit}
                      </span>
                      {' '}
                      <span style={{ color: '#166534' }}>{name}</span>
                      <span style={{
                        float: 'right',
                        color: '#10b981',
                        fontSize: '0.875rem',
                        opacity: 0.8
                      }}>
                        🔄 {t('recipes.clickToSubstitute')}
                      </span>
                    </div>
                  );
                } else {
                  // Non-clickable ingredient (no substitutions available)
                  return (
                    <div
                      key={idx}
                      style={{
                        padding: '0.75rem',
                        marginBottom: '0.5rem',
                        background: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        lineHeight: '1.6',
                        color: '#6b7280'
                      }}
                    >
                      <span style={{ fontWeight: '600', color: '#374151' }}>
                        {displayQty} {unit}
                      </span>
                      {' '}
                      <span style={{ color: '#4b5563' }}>{name}</span>
                    </div>
                  );
                }
              }

              // Non-parsed lines (just display normally)
              if (line.trim()) {
                return (
                  <div
                    key={idx}
                    style={{
                      padding: '0.5rem',
                      marginBottom: '0.25rem',
                      color: '#6b7280',
                      lineHeight: '1.8'
                    }}
                  >
                    {line}
                  </div>
                );
              }

              return null;
            });})()}
          </div>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '600', borderBottom: '2px solid #10b981', paddingBottom: '0.5rem' }}>
            <img src="/icons/logo-icon.svg" alt="" style={{ height: '1.2em', verticalAlign: 'middle', marginRight: '0.35em' }} />{t('recipes.instructionsHeading')}
          </h3>
          <div style={{
            lineHeight: '2',
            fontSize: isMobile ? '0.95rem' : '1.05rem',
            marginTop: '1rem',
            whiteSpace: 'pre-wrap'
          }}>
            {(() => {
              const instructions = selectedRecipe.instructions as any;

              // If it's a string, display normally
              if (typeof instructions === 'string') {
                return instructions;
              }

              // If it's an array, display with step numbers
              if (Array.isArray(instructions)) {
                return instructions.map((step: any, idx: number) => (
                  <div key={idx} style={{ marginBottom: '1rem', whiteSpace: 'normal' }}>
                    <strong>{t('recipes.step', { n: idx + 1 })}:</strong> {step}
                  </div>
                ));
              }

              // Fallback - convert to string
              return String(instructions);
            })()}
          </div>
        </div>

        {selectedRecipe.health_benefits && (
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '600', borderBottom: '2px solid #10b981', paddingBottom: '0.5rem' }}>
              💚 {t('recipes.healthBenefitsHeading')}
            </h3>
            <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '12px', marginTop: '1rem', color: '#166534' }}>
              {selectedRecipe.health_benefits}
            </div>
          </div>
        )}

        {selectedRecipe.budget_tip && (
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '600', borderBottom: '2px solid #10b981', paddingBottom: '0.5rem' }}>
              💰 {t('recipes.moneySavingHeading')}
            </h3>
            <div style={{ background: '#fef3c7', padding: '1rem', borderRadius: '12px', marginTop: '1rem', color: '#92400e' }}>
              {selectedRecipe.budget_tip}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => setShowDetailedView(false)} style={{
            padding: '1rem 2rem', background: '#f3f4f6', border: '1px solid #d1d5db',
            borderRadius: '12px', cursor: 'pointer', fontWeight: '600', fontSize: '1.1rem'
          }}>{t('common.close')}</button>
        </div>
      </div>
    </div>
  );
}
