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

const BASE_URL = "http://127.0.0.1:8000";

export async function fetchRecipes(ingredients: string[], dietary?: string): Promise<Recipe[]> {
  const url = new URL(`${BASE_URL}/recipes/`);
  if (dietary) {
    url.searchParams.set('dietary', dietary);
  }

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ingredients }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => null);
    throw new Error(body || "Server error");
  }

  const data = await res.json();
  return data || [];
}

// Amazon affiliate link generator (you'll need to replace with your affiliate ID)
export const generateAmazonLink = (ingredient: string): string => {
  const searchQuery = encodeURIComponent(ingredient);
  // Replace 'your-affiliate-id' with your actual Amazon affiliate ID
  return `https://www.amazon.com/s?k=${searchQuery}&tag=your-affiliate-id&linkCode=ll2&linkId=your-link-id`;
};

// Price comparison and budget suggestions
export const getBudgetAlternatives = (ingredient: string): string[] => {
  const alternatives: { [key: string]: string[] } = {
    'salmon': ['canned salmon', 'frozen salmon fillets', 'salmon steaks on sale'],
    'quinoa': ['brown rice', 'bulgur wheat', 'whole wheat couscous'],
    'almonds': ['peanuts', 'sunflower seeds', 'bulk mixed nuts'],
    'olive oil': ['canola oil', 'avocado oil on sale', 'bulk olive oil'],
    'organic vegetables': ['frozen vegetables', 'seasonal fresh vegetables', 'canned vegetables (low sodium)'],
    'chicken breast': ['chicken thighs', 'whole chicken', 'chicken leg quarters'],
    'greek yogurt': ['regular yogurt', 'homemade yogurt', 'yogurt on sale'],
    'honey': ['maple syrup', 'agave nectar', 'sugar'],
    'nuts': ['seeds', 'legumes', 'peanut butter']
  };

  const key = Object.keys(alternatives).find(k => ingredient.toLowerCase().includes(k));
  return key ? alternatives[key] : [`generic ${ingredient}`, `store brand ${ingredient}`, `bulk ${ingredient}`];
};