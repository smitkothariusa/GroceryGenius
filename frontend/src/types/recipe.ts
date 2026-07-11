export type Recipe = {
  name: string;
  ingredients?: string;
  instructions: string;
  prep_time?: string;
  cook_time?: string;
  difficulty?: string;
  servings?: string | number;
  nutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sodium: number;
  };
  health_benefits?: string;
  budget_tip?: string;
};
