// frontend/src/components/RecipeList.tsx
import React from "react";
import { useTranslation } from "react-i18next";
import type { Recipe } from "../services/recipeService";

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
        <button onClick={onClear} style={{ padding: "6px 10px" }}>{t('recipes.clearRecipes')}</button>
      </div>
      {recipes.map((r, idx) => (
        <div key={idx} style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 12,
          marginBottom: 12,
          backgroundColor: "#fafafa"
        }}>
          <h3 style={{ margin: "0 0 8px 0" }}>{idx + 1}. {r.name}</h3>
          <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{r.instructions}</pre>
        </div>
      ))}
    </div>
  );
};

export default RecipeList;
