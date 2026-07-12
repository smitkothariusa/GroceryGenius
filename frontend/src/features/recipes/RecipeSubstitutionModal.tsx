import IngredientSubstitution from '../../components/IngredientSubstitution';
import { useRecipes } from './RecipesContext';

interface RecipeSubstitutionModalProps {
  onSuccess: (message: string) => void;
}

/** The ingredient-substitution modal opened from the recipe detail view. */
export function RecipeSubstitutionModal({ onSuccess }: RecipeSubstitutionModalProps) {
  const {
    showSubstitution,
    selectedIngredient,
    selectedRecipe,
    setSelectedRecipe,
    setShowSubstitution,
    setSelectedIngredient,
  } = useRecipes();

  if (!showSubstitution || !selectedIngredient) return null;

  return (
    <IngredientSubstitution
      ingredientName={selectedIngredient.name}
      quantity={selectedIngredient.quantity}
      unit={selectedIngredient.unit}
      onSubstitute={(newName, newQty, newUnit) => {
        if (selectedRecipe) {
          // Update the recipe with the substitution
          const updatedIngredients = selectedRecipe.ingredients
            .split('\n')
            .map(line => {
              if (line.toLowerCase().includes(selectedIngredient.name.toLowerCase())) {
                return `${newQty} ${newUnit} ${newName}`;
              }
              return line;
            })
            .join('\n');

          setSelectedRecipe({
            ...selectedRecipe,
            ingredients: updatedIngredients
          });

          onSuccess(`Substituted ${selectedIngredient.name} with ${newName}!`);
        }
        setShowSubstitution(false);
        setSelectedIngredient(null);
      }}
      onClose={() => {
        setShowSubstitution(false);
        setSelectedIngredient(null);
      }}
    />
  );
}
