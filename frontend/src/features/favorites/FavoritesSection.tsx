import { useTranslation } from 'react-i18next';
import { recipesService } from '../../lib/database';
import { useFavorites, type FavoriteRecipe } from './FavoritesContext';

interface FavoritesSectionProps {
  isMobile: boolean;
  cardBg: string;
  mutedText: string;
  onSelectRecipe: (recipe: FavoriteRecipe) => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

/** JSX for the "Favorites" tab: list of saved recipes with remove + open-detail actions. */
export function FavoritesSection({
  isMobile,
  cardBg,
  mutedText,
  onSelectRecipe,
  onSuccess,
  onError,
}: FavoritesSectionProps) {
  const { t } = useTranslation();
  const { favorites, setFavorites, translatedFavoriteNames } = useFavorites();

  return (
    <div style={{
      background: cardBg,
      padding: isMobile ? '1rem' : '2rem',
      borderRadius: '16px'
    }}>
      <h2 style={{
        margin: '0 0 2rem 0',
        fontSize: isMobile ? '1.5rem' : '2rem'
      }}>⭐ {t('favorites.title')} ({favorites.length})</h2>
      <div data-tour="favorites-grid" style={{ display: 'grid', gap: '1rem' }}>
        {favorites.map((recipe, index) => (
          <div
            key={recipe.id}
            onClick={() => onSelectRecipe(recipe)}
            className="card-hover"
            style={{
              padding: '1.5rem',
              background: '#f9fafb',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>{translatedFavoriteNames[recipe.id] || recipe.name}</h3>
                <div style={{ fontSize: '0.875rem', color: mutedText }}>
                  {recipe.prep_time && `⏱ ${recipe.prep_time}`}
                  {recipe.nutrition && ` • ${recipe.nutrition.calories} cal`}
                </div>
                <div style={{ fontSize: '0.75rem', color: mutedText, marginTop: '0.5rem' }}>
                  {t('favorites.savedOn')}: {new Date(recipe.savedDate).toLocaleDateString()}
                </div>
              </div>
              <button
                {...(index === 0 ? { 'data-tour': 'favorites-heart-btn' } : {})}
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    await recipesService.delete(recipe.id);
                    setFavorites(prev => prev.filter(f => f.id !== recipe.id));
                    onSuccess(t('notifications.recipeRemoved'));
                  } catch (error) {
                    console.error('Error deleting recipe:', error);
                    onError(t('notifications.error'));
                  }
                }} style={{
                background: '#fee2e2', color: '#dc2626', border: 'none',
                padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', height: 'fit-content'
              }}>{t('favorites.remove')}</button>
            </div>
          </div>
        ))}
        {favorites.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: mutedText }}>
            <div style={{ fontSize: '3rem' }}>⭐</div>
            <p>{t('favorites.noFavoritesMessage')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
