// frontend/src/components/RecipeList.tsx
import React from "react";
import { useTranslation } from "react-i18next";
import type { Recipe } from "../services/recipeService";
import ParticleButton from './ParticleButton';

interface Props {
  recipes: Recipe[];
  onClear?: () => void;
}

const RecipeList: React.FC<Props> = ({ recipes, onClear }) => {
  const { t } = useTranslation();
  if (!recipes || recipes.length === 0) return null;

  return (
    <div style={{ marginTop: "1rem" }}>
      <div style={{ marginBottom: 8 }}>
        <ParticleButton variant="outline" onClick={onClear} hideIcon>
          {t('recipes.clearRecipes')}
        </ParticleButton>
      </div>
      {recipes.map((r, idx) => (
        <div key={idx} style={{
          border: "1.5px solid var(--gg-border)",
          borderRadius: 'var(--gg-radius-lg)',
          padding: 16,
          marginBottom: 12,
          backgroundColor: "var(--gg-cream)",
          boxShadow: 'var(--gg-shadow-sm)',
        }}>
          <h3 style={{ margin: "0 0 8px 0", fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, color: 'var(--gg-espresso)', letterSpacing: '-0.3px' }}>{idx + 1}. {r.name}</h3>
          <pre style={{ whiteSpace: "pre-wrap", margin: 0, fontFamily: "'Lato', sans-serif", color: 'var(--gg-taupe)', fontSize: '0.9rem' }}>{r.instructions}</pre>
        </div>
      ))}
    </div>
  );
};

export default RecipeList;
