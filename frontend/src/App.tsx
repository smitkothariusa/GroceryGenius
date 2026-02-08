import { FoodBank, DonationRecord, DonationImpact } from './types/donation';
import { foodBanks, calculateMeals } from './data/foodBanks';
import Toast from './components/Toast';
import { useToast } from './hooks/useToast';
import { useState, useEffect } from 'react';
import { authService } from './lib/supabase';
import { pantryService, shoppingService, recipesService, mealPlansService, donationService } from './lib/database';
import Auth from './components/Auth';
import MealPlanCalendar from './components/MealPlanCalendar';
import IngredientSubstitution from './components/IngredientSubstitution';


interface PantryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  expiryDate?: string;
}

interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  checked: boolean;
  category: string;
  priority?: 'high' | 'medium' | 'low';
}

interface Recipe {
  name: string;
  ingredients: string;
  instructions: string;
  prep_time?: string;
  cook_time?: string;
  difficulty?: string;
  servings?: number;
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
}

interface ParsedIngredient {
  name: string;
  quantity: number;
  unit: string;
}

interface FavoriteRecipe extends Recipe {
  id: string;
  savedDate: string;
}

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [showSubstitution, setShowSubstitution] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<{
    name: string;
    quantity: number;
    unit: string;
  } | null>(null);
  const [currentTab, setCurrentTab] = useState<'pantry' | 'recipes' | 'mealplan' | 'shopping' | 'donate' | 'favorites'>('pantry');  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [recipeSearchQuery, setRecipeSearchQuery] = useState('');
  const [recipeServings, setRecipeServings] = useState<number | ''>(2);  
  const [ingredientTags, setIngredientTags] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [dietaryFilter, setDietaryFilter] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [showAddPantry, setShowAddPantry] = useState(false);
  const [newPantryItem, setNewPantryItem] = useState<{ 
    name: string;
    quantity: number | '';
    unit: string;
    category: string;
    expiryDate: string;
  }>({ 
  name: '', 
  quantity: 1,
    unit: 'pc', 
    category: 'other',
    expiryDate: ''
  });
  const [showMissionPopup, setShowMissionPopup] = useState(false);
  const [showDemoConfirm, setShowDemoConfirm] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteRecipe[]>([]);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [sortShoppingBy, setSortShoppingBy] = useState<'category' | 'alphabetical'>('category');
  const [donationImpact, setDonationImpact] = useState<DonationImpact>({
    totalDonations: 0,
    totalMeals: 0,
    totalPounds: 0,
    co2Saved: 0
  });
  const [cameraSource, setCameraSource] = useState<'recipes' | 'pantry'>('recipes');
  const [donationHistory, setDonationHistory] = useState<DonationRecord[]>([]);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [selectedFoodBank, setSelectedFoodBank] = useState<FoodBank | null>(null);
  const [itemsToDonate, setItemsToDonate] = useState<string[]>([]);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [showCalorieTracker, setShowCalorieTracker] = useState(false);
  const [dailyCalorieGoal, setDailyCalorieGoal] = useState(2000);
  const [todayCalories, setTodayCalories] = useState(0);
  const { toasts, removeToast, success, error, warning, info } = useToast();
  const [isTabChanging, setIsTabChanging] = useState(false);
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const bgColor = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  const cardBg = 'rgba(255, 255, 255, 0.95)';
  const textColor = '#1f2937';
  const mutedText = '#6b7280';
  const [showAddShopping, setShowAddShopping] = useState(false);
  const [newShoppingItem, setNewShoppingItem] = useState<{
    name: string;
    quantity: number | '';
    unit: string;
    category: string;
  }>({
    name: '',
    quantity: 1,
    unit: 'pc',
    category: 'other'
  });
  const [editingPantryItem, setEditingPantryItem] = useState<PantryItem | null>(null);
  const [showEditPantry, setShowEditPantry] = useState(false);
  // Load all user data from Supabase
  const loadUserData = async () => {
    console.log('📦 Loading user data from Supabase...');

    // Load each data source independently so one failure doesn't break everything
    
    // Load pantry items
    try {
      const pantryData = await pantryService.getAll();
      setPantry(pantryData.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        expiryDate: item.expiry_date,
      })));
      console.log('✅ Pantry loaded:', pantryData.length, 'items');
    } catch (error) {
      console.error('❌ Error loading pantry:', error);
      setPantry([]); // Reset to empty instead of leaving in broken state
    }

    // Load shopping items
    try {
      const shoppingData = await shoppingService.getAll();
      setShoppingList(shoppingData.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        checked: item.checked,
        priority: item.priority as 'high' | 'medium' | 'low',
      })));
      console.log('✅ Shopping list loaded:', shoppingData.length, 'items');
    } catch (error) {
      console.error('❌ Error loading shopping list:', error);
      setShoppingList([]);
    }

    // Load favorite recipes
    try {
      const recipesData = await recipesService.getAll();
      setFavorites(recipesData.map(recipe => ({
        id: recipe.id,
        name: recipe.name,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        prep_time: recipe.prep_time,
        cook_time: recipe.cook_time,
        difficulty: recipe.difficulty,
        servings: recipe.servings,
        nutrition: recipe.nutrition,
        health_benefits: recipe.health_benefits,
        budget_tip: recipe.budget_tip,
        savedDate: recipe.created_at,
      })));
      console.log('✅ Favorites loaded:', recipesData.length, 'recipes');
    } catch (error) {
      console.error('❌ Error loading favorites:', error);
      setFavorites([]);
    }

    // Load donation history
    try {
      const historyData = await donationService.getHistory();
      setDonationHistory(historyData.map(donation => ({
        id: donation.id,
        date: donation.date,
        foodBank: donation.food_bank,
        items: donation.items,
        totalMeals: donation.total_meals,
      })));
      console.log('✅ Donation history loaded:', historyData.length, 'donations');
    } catch (error) {
      console.error('❌ Error loading donation history:', error);
      setDonationHistory([]);
    }

    // Load donation impact
    try {
      const impactData = await donationService.getImpact();
      setDonationImpact({
        totalDonations: impactData.total_donations || 0,
        totalMeals: impactData.total_meals || 0,
        totalPounds: impactData.total_pounds || 0,
        co2Saved: impactData.co2_saved || 0,
        lastDonation: impactData.last_donation,
      });
      console.log('✅ Donation impact loaded');
    } catch (error) {
      console.error('❌ Error loading donation impact:', error);
      setDonationImpact({
        totalDonations: 0,
        totalMeals: 0,
        totalPounds: 0,
        co2Saved: 0
      });
    }

    console.log('✅ All user data loading attempts complete');
  };
  useEffect(() => {
      const initAuth = async () => {
        try {
          console.log('🔐 Initializing auth...');
          const session = await authService.getSession();
          console.log('📝 Session:', session ? 'Found' : 'None');
          setUser(session?.user || null);
          setAuthLoading(false);
          if (session?.user) {
            console.log('👤 User authenticated, loading data...');
            try {
              await loadUserData();
            } catch (loadError) {
              console.error('⚠️ Error loading user data:', loadError);
              // User is still authenticated, just failed to load data
            }
          }
        } catch (err) {
          console.error('❌ Auth error:', err);
          setUser(null);
        } finally {
          console.log('✅ Auth initialization complete');
          setAuthLoading(false);  // ✅ ALWAYS runs
        }
      };

      initAuth();

      const { data: authListener } = authService.onAuthStateChange(async (event, session) => {
        console.log('🔄 Auth state changed:', event);
        setUser(session?.user || null);
        setAuthLoading(false); // ← ADD THIS LINE to fix stuck loading
        
        if (event === 'SIGNED_IN' && session?.user) {
          try {
            await loadUserData();
          } catch (loadError) {
            console.error('Error loading user data on sign in:', loadError);
          }
        }
        
        if (event === 'SIGNED_OUT') {
          setPantry([]);
          setShoppingList([]);
          setFavorites([]);
          setDonationHistory([]);
          setDonationImpact({
            totalDonations: 0,
            totalMeals: 0,
            totalPounds: 0,
            co2Saved: 0
          });
        }
      });

      return () => {
        authListener?.subscription?.unsubscribe();
      };
    }, []);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleTabChange = (tab: typeof currentTab) => {
    setIsTabChanging(true);
    setTimeout(() => {
      setCurrentTab(tab);
      setIsTabChanging(false);
    }, 150);
  };
  const getExpiringItems = () => {
    const today = new Date();
    return pantry.filter(item => {
      if (!item.expiryDate) return false;
      const expiry = new Date(item.expiryDate);
      const daysUntil = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil <= 3 && daysUntil >= 0;
    });
  };

  // Parse ingredients from recipe text
  const parseIngredients = (recipe: Recipe): ParsedIngredient[] => {
    const ingredients: ParsedIngredient[] = [];
    const text = `${recipe.ingredients}\n${recipe.instructions}`.toLowerCase();
    
    // Split by newlines to process each ingredient line
    const lines = recipe.ingredients.split('\n').filter(line => line.trim());
    
    const seen = new Set<string>();
    
    lines.forEach(line => {
      const cleanLine = line.trim().toLowerCase();
      if (!cleanLine || cleanLine.length < 3) return;
      
      // Pattern 1: Quantity + Unit + Ingredient (e.g., "2 cups flour", "1 tbsp oil")
      const pattern1 = /^(\d+(?:\/\d+)?|\d+\.\d+)\s*(cups?|cup|tablespoons?|tbsp|teaspoons?|tsp|ounces?|oz|pounds?|lbs?|lb|grams?|g|kilograms?|kg|milliliters?|ml|liters?|l|cloves?|pieces?|pcs?|slices?)\s+(?:of\s+)?(.+)$/i;
      const match1 = cleanLine.match(pattern1);
      
      if (match1) {
        let quantity = match1[1];
        const unit = match1[2];
        let name = match1[3].trim();
        
        // Handle fractions
        if (quantity.includes('/')) {
          const [num, denom] = quantity.split('/').map(Number);
          quantity = (num / denom).toFixed(2);
        }
        
        // Clean up the name
        name = name
          .replace(/\b(fresh|dried|raw|cooked|minced|chopped|diced|sliced|grated|large|medium|small|ripe|frozen|canned)\b/gi, '')
          .replace(/[,;()]/g, '')
          .trim();
        
        if (name.length > 2 && name.length < 40 && !seen.has(name)) {
          seen.add(name);
          ingredients.push({
            name,
            quantity: parseFloat(quantity),
            unit: unit.toLowerCase()
          });
        }
        return;
      }
      
      // Pattern 2: Just Quantity + Ingredient (e.g., "2 avocados", "3 eggs", "4 tomatoes")
      const pattern2 = /^(\d+(?:\/\d+)?|\d+\.\d+)\s+(?:whole|medium|large|small)?\s*(.+)$/i;
      const match2 = cleanLine.match(pattern2);
      
      if (match2) {
        let quantity = match2[1];
        let name = match2[2].trim();
        
        // Handle fractions
        if (quantity.includes('/')) {
          const [num, denom] = quantity.split('/').map(Number);
          quantity = (num / denom).toFixed(2);
        }
        
        // Clean up the name
        name = name
          .replace(/\b(fresh|dried|raw|cooked|minced|chopped|diced|sliced|grated|large|medium|small|ripe|frozen|canned)\b/gi, '')
          .replace(/[,;()]/g, '')
          .trim();
        
        if (name.length > 2 && name.length < 40 && !seen.has(name)) {
          seen.add(name);
          ingredients.push({
            name,
            quantity: parseFloat(quantity),
            unit: 'pc'
          });
        }
        return;
      }
      
      // Pattern 3: Ingredient with descriptive words (e.g., "large avocado", "ripe banana")
      const pattern3 = /^(?:a|an|one|some)?\s*(?:large|medium|small|ripe|fresh)?\s*(.+)$/i;
      const match3 = cleanLine.match(pattern3);
      
      if (match3 && !cleanLine.match(/^\d/)) {
        let name = match3[1].trim();
        
        // Clean up the name
        name = name
          .replace(/\b(fresh|dried|raw|cooked|minced|chopped|diced|sliced|grated|large|medium|small|ripe|frozen|canned)\b/gi, '')
          .replace(/[,;()]/g, '')
          .trim();
        
        // Only add if it looks like a real ingredient (not instructions)
        if (name.length > 2 && name.length < 40 && !seen.has(name) && 
            !name.includes('mix') && !name.includes('stir') && !name.includes('cook') &&
            !name.includes('heat') && !name.includes('add') && !name.includes('serve')) {
          seen.add(name);
          ingredients.push({
            name,
            quantity: 1,
            unit: 'pc'
          });
        }
      }
    });
    
    return ingredients.slice(0, 20); // Increased from 12 to 20
  };

  const calculateHealthGrade = (recipe: Recipe) => {
    if (!recipe.nutrition) return 'B';
    const { calories, protein, fiber, sodium, fat } = recipe.nutrition;
    let score = 70;
    
    if (protein >= 25) score += 12; else if (protein >= 20) score += 10; else if (protein >= 15) score += 6;
    if (fiber >= 8) score += 12; else if (fiber >= 6) score += 8; else if (fiber >= 4) score += 4;
    if (calories > 700) score -= 15; else if (calories > 600) score -= 10; else if (calories >= 350 && calories <= 500) score += 5;
    if (sodium > 1000) score -= 15; else if (sodium > 800) score -= 10; else if (sodium < 400) score += 8;
    if (fat > 25) score -= 8; else if (fat > 20) score -= 5; else if (fat >= 10 && fat <= 15) score += 5;
    
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 85) return 'A-';
    if (score >= 80) return 'B+';
    if (score >= 75) return 'B';
    if (score >= 70) return 'B-';
    if (score >= 65) return 'C+';
    if (score >= 60) return 'C';
    return 'D';
  };

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return '#10b981';
    if (grade.startsWith('B')) return '#3b82f6';
    if (grade.startsWith('C')) return '#f59e0b';
    return '#ef4444';
  };

  const handleGetRecipes = async () => {
    if (ingredientTags.length === 0 && !recipeSearchQuery.trim()) {
      setErrorMsg('Please add ingredients or enter a recipe search.');
      return;
    }

    setRecipeLoading(true);
    setErrorMsg('');
    setRecipes([]);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    try {
      const params = new URLSearchParams();
      if (dietaryFilter) params.append('dietary', dietaryFilter);

      const allIngredients = recipeSearchQuery.trim() 
        ? [recipeSearchQuery, ...ingredientTags]
        : ingredientTags;

      const response = await fetch(`${API_BASE}/recipes?${params.toString()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: allIngredients }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Scale recipes to requested servings
      const scaledRecipes = data.map((recipe: Recipe) => {
        const originalServings = recipe.servings || 2;
        const servings = typeof recipeServings === 'number' ? recipeServings : 2;
        const scale = servings / originalServings;
        
        return {
          ...recipe,
          servings: servings,
          nutrition: recipe.nutrition ? {
            calories: Math.round(recipe.nutrition.calories * scale),
            protein: Math.round(recipe.nutrition.protein * scale),
            carbs: Math.round(recipe.nutrition.carbs * scale),
            fat: Math.round(recipe.nutrition.fat * scale),
            fiber: Math.round(recipe.nutrition.fiber * scale),
            sodium: Math.round(recipe.nutrition.sodium * scale)
          } : undefined
        };
      });
      
      setRecipes(scaledRecipes);
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('Recipe generation error:', err);
      if (err.name === 'AbortError') {
        setErrorMsg('⏱️ Request timed out. OpenAI is taking too long. Please try with fewer ingredients or try again.');
      } else {
        setErrorMsg('Failed to generate recipes. Please check your backend is running on http://localhost:8000');
      }
    } finally {
      setRecipeLoading(false);
    }
  };

  const addPantryToIngredients = () => {
    const names = pantry.map(item => item.name.toLowerCase());
    setIngredientTags(Array.from(new Set([...ingredientTags, ...names])));
  };

  const addMissingToShopping = async (recipe: Recipe) => {
    const ingredients = parseIngredients(recipe);
    const pantryNames = pantry.map(i => i.name.toLowerCase());
    const existingItems = shoppingList.map(i => i.name.toLowerCase());
    
    // List of ingredients to exclude from shopping list
    const excludedIngredients = [
      // Liquids you don't buy
      'water', 'ice', 'ice cube', 'ice water', 'tap water', 'cold water', 'hot water', 'boiling water',
      
      // Basic seasonings (usually already in pantry)
      'salt', 'pepper', 'black pepper', 'white pepper', 'sea salt', 'kosher salt',
      
      // Instructions that might be parsed as ingredients
      'to taste', 'as needed', 'optional', 'garnish', 'serve', 'serving'
    ];
    
    const missing = ingredients.filter(ing => {
      const cleanName = ing.name.toLowerCase().trim();
      
      // Skip if it's an excluded ingredient
      if (excludedIngredients.some(excluded => 
        cleanName === excluded || cleanName.includes(excluded) || excluded.includes(cleanName)
      )) {
        return false;
      }
      
      // Skip if already in pantry or shopping list
      return !pantryNames.some(p => p.includes(ing.name) || ing.name.includes(p)) &&
            !existingItems.some(e => e.includes(ing.name) || ing.name.includes(e));
    });

    if (missing.length > 0) {
      try {
        // Add each item to Supabase
        const savedItems = await Promise.all(
          missing.map(ing => 
            shoppingService.add({
              name: ing.name,
              quantity: ing.quantity,
              unit: ing.unit,
              category: 'recipe',
              checked: false,
              priority: 'medium'
            })
          )
        );

        // Update local state
        const newItems: ShoppingItem[] = savedItems.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          checked: item.checked,
          category: item.category,
          priority: item.priority as 'high' | 'medium' | 'low'
        }));

        setShoppingList(prev => [...prev, ...newItems]);
        success(`Added ${newItems.length} ingredients to shopping list!`);
      } catch (error) {
        console.error('Error adding shopping items:', error);
        warning('Failed to add some items');
      }
    } else {
      info('You already have all ingredients!');
    }
  };

  // Shopping list export functions
  const exportAsText = () => {
    const text = shoppingList
      .map(item => `${item.checked ? '☑' : '☐'} ${item.quantity} ${item.unit} ${item.name}`)
      .join('\n');
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shopping-list-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsCSV = () => {
    const csv = [
      'Item,Quantity,Unit,Category,Checked,Priority',
      ...shoppingList.map(item => 
        `"${item.name}",${item.quantity},"${item.unit}","${item.category}",${item.checked},"${item.priority || 'medium'}"`
      )
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shopping-list-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const shareList = async () => {
    const text = shoppingList
      .filter(item => !item.checked)
      .map(item => `• ${item.quantity} ${item.unit} ${item.name}`)
      .join('\n');
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'GroceryGenius Shopping List',
          text: `Shopping List (${shoppingList.filter(i => !i.checked).length} items):\n\n${text}`
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(text);
      success('Shopping list copied to clipboard!');
    }
  };

  const emailList = () => {
    const text = shoppingList
      .filter(item => !item.checked)
      .map(item => `${item.quantity} ${item.unit} ${item.name}`)
      .join('\n');
    
    const subject = encodeURIComponent('Shopping List from GroceryGenius');
    const body = encodeURIComponent(`Here's my shopping list:\n\n${text}\n\nGenerated by GroceryGenius`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const printList = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <title>Shopping List - ${new Date().toLocaleDateString()}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #10b981; }
            .item { padding: 8px; border-bottom: 1px solid #e5e7eb; }
            .checked { text-decoration: line-through; color: #9ca3af; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <h1>🛒 Shopping List</h1>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          <p><strong>Total:</strong> ${shoppingList.length} items (${shoppingList.filter(i => !i.checked).length} remaining)</p>
          <hr>
          ${shoppingList.map(item => `
            <div class="item ${item.checked ? 'checked' : ''}">
              ${item.checked ? '☑' : '☐'} ${item.quantity} ${item.unit} ${item.name}
            </div>
          `).join('')}
        </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };
  const handleEditPantryItem = (item: PantryItem) => {
    setEditingPantryItem(item);
    setNewPantryItem({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      expiryDate: item.expiryDate || ''
    });
    setShowEditPantry(true);
  };

  const handleSaveEditPantryItem = () => {
    if (!editingPantryItem || !newPantryItem.name.trim()) return;
    const quantity = typeof newPantryItem.quantity === 'number' ? newPantryItem.quantity : 1;
    
    setPantry(prev => prev.map(item => 
      item.id === editingPantryItem.id 
        ? {
            ...item,
            name: newPantryItem.name.trim(),
            quantity: quantity,
              unit: newPantryItem.unit,
              category: newPantryItem.category,
              expiryDate: newPantryItem.expiryDate || undefined
            }
          : item
      ));
    
    success('Pantry item updated!');
    setShowEditPantry(false);
    setEditingPantryItem(null);
    setNewPantryItem({ name: '', quantity: 1, unit: 'pc', category: 'other', expiryDate: '' });
  };
  const sortShoppingList = () => {
    const sorted = [...shoppingList];
    if (sortShoppingBy === 'category') {
      sorted.sort((a, b) => a.category.localeCompare(b.category));
    } else {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
    return sorted;
  };

  const estimateCost = () => {
    const estimates: Record<string, number> = {
      'produce': 2.5,
      'dairy': 3.5,
      'meat': 6.0,
      'pantry': 2.0,
      'frozen': 4.0,
      'other': 3.0,
      'recipe': 3.0
    };
    return shoppingList
      .filter(item => !item.checked)
      .reduce((total, item) => total + (estimates[item.category] || 3) * item.quantity, 0);
  };
  const handleCameraCapture = async () => {
    try {
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Use back camera on mobile
      });

      // Create a video element to show camera feed
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;

      // Create modal to show camera
      const modal = document.createElement('div');
      modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.95);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:2000;';
      
      video.style.cssText = 'max-width:90%;max-height:70vh;border-radius:12px;';
      
      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = 'display:flex;gap:1rem;margin-top:2rem;';
      
      const captureBtn = document.createElement('button');
      captureBtn.textContent = '📸 Capture';
      captureBtn.style.cssText = 'padding:1rem 2rem;background:#10b981;color:white;border:none;border-radius:12px;font-weight:600;font-size:1rem;cursor:pointer;';
      
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = '✕ Cancel';
      cancelBtn.style.cssText = 'padding:1rem 2rem;background:#ef4444;color:white;border:none;border-radius:12px;font-weight:600;font-size:1rem;cursor:pointer;';
      
      const cleanup = () => {
        stream.getTracks().forEach(track => track.stop());
        document.body.removeChild(modal);
      };

      captureBtn.onclick = () => {
        // Create canvas to capture image
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0);
        
        // Convert to blob
        canvas.toBlob(async (blob) => {
          if (blob) {
            cleanup();
            setShowImageUpload(false);
            setRecipeLoading(true);

            try {
              const formData = new FormData();
              formData.append('file', blob, 'camera-capture.jpg');

              const response = await fetch(`${API_BASE}/vision/analyze-ingredients`, {
                method: 'POST',
                body: formData
              });

              if (!response.ok) throw new Error(`API error: ${response.status}`);

              const data = await response.json();

              if (data.success && data.ingredients.length > 0) {
                if (cameraSource === 'pantry') {
                  // Add to pantry
                  const newPantryItems: PantryItem[] = data.ingredients.map((ing: string) => ({
                    id: `${Date.now()}-${Math.random()}`,
                    name: ing,
                    quantity: 1,
                    unit: 'pc',
                    category: 'other'
                  }));
                  
                  setPantry(prev => [...prev, ...newPantryItems]);
                  success(`Added ${data.ingredients.length} items to pantry: ${data.ingredients.join(', ')}`);
                  
                  // Switch to pantry tab
                  setCurrentTab('pantry');
                } else {
                  // Add to recipe ingredients
                  const newIngredients = data.ingredients.filter(
                    (ing: string) => !ingredientTags.includes(ing.toLowerCase())
                  );
                  
                  setIngredientTags(prev => [...prev, ...newIngredients]);
                  success(`Found ${data.ingredients.length} ingredients: ${data.ingredients.join(', ')}`);
                  
                  // Switch to recipes tab
                  setCurrentTab('recipes');
                }
                
                window.scrollTo({ top: 0, behavior: 'smooth' });
              } else {
                warning('No items detected. Try a clearer photo with better lighting.');
              }
            } catch (err) {
              console.error('Image analysis error:', err);
              error('Failed to analyze image. Please try again.');
            } finally {
              setRecipeLoading(false);
            }
          }
        }, 'image/jpeg', 0.95);
      };

      cancelBtn.onclick = cleanup;

      buttonContainer.appendChild(captureBtn);
      buttonContainer.appendChild(cancelBtn);
      modal.appendChild(video);
      modal.appendChild(buttonContainer);
      document.body.appendChild(modal);

    } catch (err) {
      console.error('Camera access error:', err);
      error('Camera access denied. Please allow camera permissions.');
    }
  };
  const loadDemoData = () => {
    // Demo pantry items
    const demoPantry: PantryItem[] = [
      { id: '1', name: 'Rice', quantity: 5, unit: 'lbs', category: 'grains', expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
      { id: '2', name: 'Canned Beans', quantity: 12, unit: 'pc', category: 'canned', expiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
      { id: '3', name: 'Pasta', quantity: 3, unit: 'lbs', category: 'grains', expiryDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
      { id: '4', name: 'Canned Tomatoes', quantity: 8, unit: 'pc', category: 'canned', expiryDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
      { id: '5', name: 'Peanut Butter', quantity: 2, unit: 'pc', category: 'pantry', expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
      { id: '6', name: 'Cereal', quantity: 4, unit: 'pc', category: 'breakfast', expiryDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] }
    ];

    // Demo donation history
    const demoDonations: DonationRecord[] = [
      {
        id: '1',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        foodBank: 'Foodbank of Southeastern Virginia',
        totalMeals: 48,
        items: [
          { name: 'Rice', quantity: 2, unit: 'lbs', estimatedMeals: 16 },
          { name: 'Canned Vegetables', quantity: 8, unit: 'pc', estimatedMeals: 16 },
          { name: 'Pasta', quantity: 2, unit: 'lbs', estimatedMeals: 16 }
        ]
      },
      {
        id: '2',
        date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
        foodBank: 'Virginia Beach Community Food Pantry',
        totalMeals: 64,
        items: [
          { name: 'Canned Beans', quantity: 12, unit: 'pc', estimatedMeals: 24 },
          { name: 'Rice', quantity: 3, unit: 'lbs', estimatedMeals: 24 },
          { name: 'Canned Soup', quantity: 8, unit: 'pc', estimatedMeals: 16 }
        ]
      },
      {
        id: '3',
        date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        foodBank: 'Hope House Foundation',
        totalMeals: 72,
        items: [
          { name: 'Pasta', quantity: 4, unit: 'lbs', estimatedMeals: 32 },
          { name: 'Canned Tomatoes', quantity: 10, unit: 'pc', estimatedMeals: 20 },
          { name: 'Cereal', quantity: 2, unit: 'pc', estimatedMeals: 20 }
        ]
      },
      {
        id: '4',
        date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
        foodBank: 'St. Mary\'s Food Pantry',
        totalMeals: 56,
        items: [
          { name: 'Rice', quantity: 2, unit: 'lbs', estimatedMeals: 16 },
          { name: 'Peanut Butter', quantity: 3, unit: 'pc', estimatedMeals: 45 },
          { name: 'Canned Fruit', quantity: 5, unit: 'pc', estimatedMeals: 10 }
        ]
      },
      {
        id: '5',
        date: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
        foodBank: 'Chesapeake Care Center',
        totalMeals: 80,
        items: [
          { name: 'Canned Beans', quantity: 15, unit: 'pc', estimatedMeals: 30 },
          { name: 'Pasta', quantity: 3, unit: 'lbs', estimatedMeals: 24 },
          { name: 'Canned Vegetables', quantity: 13, unit: 'pc', estimatedMeals: 26 }
        ]
      }
    ];

    // Calculate total impact
    const totalMeals = demoDonations.reduce((sum, d) => sum + d.totalMeals, 0);
    const totalPounds = 112; // Estimated
    const co2Saved = totalPounds * 3.8;

    const demoImpact: DonationImpact = {
      totalDonations: demoDonations.length,
      totalMeals: totalMeals,
      totalPounds: totalPounds,
      co2Saved: co2Saved,
      lastDonation: demoDonations[0].date
    };

    // Demo favorites
    const demoFavorites: FavoriteRecipe[] = [
      {
        id: '1',
        name: 'Healthy Chicken Stir-Fry',
        ingredients: '2 chicken breasts\n2 cups broccoli\n1 bell pepper\n2 tbsp soy sauce',
        instructions: '1. Cut chicken into strips\n2. Stir-fry with vegetables\n3. Add sauce and serve',
        prep_time: '15 min',
        cook_time: '20 min',
        difficulty: 'Easy',
        servings: 2,
        nutrition: { calories: 380, protein: 35, carbs: 25, fat: 12, fiber: 6, sodium: 450 },
        health_benefits: 'High protein, rich in vitamins',
        budget_tip: 'Buy frozen vegetables in bulk',
        savedDate: new Date().toISOString()
      }
    ];

    setPantry(demoPantry);
    setDonationHistory(demoDonations);
    setDonationImpact(demoImpact);
    setFavorites(demoFavorites);
    
    success('Demo data loaded! Showing 427 meals donated across 23 donations! 🎉');
    setShowDemoConfirm(false);
    setPantry(demoPantry);
    setDonationHistory(demoDonations);
    setDonationImpact(demoImpact);
    setFavorites(demoFavorites);
    
    success('Demo data loaded! Showing 427 meals donated across 23 donations! 🎉');
    setShowDemoConfirm(false);
    
    // Show mission popup after demo loads
    setTimeout(() => {
      setShowMissionPopup(true);
    }, 500);
  };

  const clearDemoData = () => {
    setPantry([]);
    setDonationHistory([]);
    setDonationImpact({ totalDonations: 0, totalMeals: 0, totalPounds: 0, co2Saved: 0 });
    setFavorites([]);
    setShoppingList([]);
    setRecipes([]);
    success('All data cleared!');
  };
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      error('Please upload an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      error('Image too large. Please use an image under 10MB');
      return;
    }

    setRecipeLoading(true);

    try {
      // Create FormData to send file
      const formData = new FormData();
      formData.append('file', file);

      // Send to backend
      const response = await fetch(`${API_BASE}/vision/analyze-ingredients`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.ingredients.length > 0) {
        if (cameraSource === 'pantry') {
          // Add to pantry
          const newPantryItems: PantryItem[] = data.ingredients.map((ing: string) => ({
            id: `${Date.now()}-${Math.random()}`,
            name: ing,
            quantity: 1,
            unit: 'pc',
            category: 'other'
          }));
          
          setPantry(prev => [...prev, ...newPantryItems]);
          success(`Added ${data.ingredients.length} items to pantry: ${data.ingredients.join(', ')}`);
          
          // Close modal and switch to pantry tab
          setShowImageUpload(false);
          setCurrentTab('pantry');
        } else {
          // Add to recipe ingredients
          const newIngredients = data.ingredients.filter(
            (ing: string) => !ingredientTags.includes(ing.toLowerCase())
          );
          
          setIngredientTags(prev => [...prev, ...newIngredients]);
          success(`Found ${data.ingredients.length} ingredients: ${data.ingredients.join(', ')}`);
          
          // Close modal and switch to recipes tab
          setShowImageUpload(false);
          setCurrentTab('recipes');
        }
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        warning('No items detected. Try a clearer photo with better lighting.');
      }

    } catch (err) {
      console.error('Image analysis error:', err);
      error('Failed to analyze image. Please try again.');
    } finally {
      setRecipeLoading(false);
      // Reset file input
      e.target.value = '';
    }
  };
  const generateShareText = () => {
    return `I've donated ${donationImpact.totalMeals} meals and saved ${Math.round(donationImpact.totalPounds)} lbs of food using GroceryGenius! 🎉

  Together we can fight hunger and reduce food waste. Join me in making an impact! 💚

  #FoodDonation #EndHunger #SustainableLiving #GroceryGenius`;
  };

  const shareImpact = async (platform: 'twitter' | 'facebook' | 'copy') => {
    const text = generateShareText();
    const url = 'https://grocerygenius.app'; // Replace with your actual URL

    if (platform === 'twitter') {
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
        '_blank'
      );
    } else if (platform === 'facebook') {
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`,
        '_blank'
      );
    } else if (platform === 'copy') {
      navigator.clipboard.writeText(text + '\n\n' + url);
      success('Impact message copied to clipboard!');
    }
    
    setShowShareModal(false);
  };
  const handleDonation = async (foodBank: FoodBank, items: PantryItem[]) => {
      if (!foodBank || items.length === 0) {
        warning('Please select a food bank and items to donate');
        return;
      }

      try {
        console.log('🎁 Starting donation process...');
        console.log('📦 Items to donate:', items);
        
        let totalMeals = 0;
        let totalPounds = 0;

        const donationItems = items.map(item => {
          const meals = calculateMeals(item.quantity, item.unit, item.name);
          const pounds = item.unit === 'lbs' ? item.quantity : item.quantity * 0.5;
          
          totalMeals += meals;
          totalPounds += pounds;

          return {
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            estimatedMeals: meals
          };
        });

        const co2Saved = totalPounds * 3.8;

        console.log('💾 Saving donation to Supabase...');
        
        // SAVE TO SUPABASE
        await donationService.add({
          date: new Date().toISOString(),
          food_bank: foodBank.name,
          items: donationItems,
          total_meals: totalMeals
        });

        console.log('📊 Updating impact stats...');

        // Update impact - fetch current values first to avoid duplicate key issues
        try {
          const currentImpact = await donationService.getImpact();
          
          const newImpact = {
            total_donations: (currentImpact.total_donations || 0) + 1,
            total_meals: (currentImpact.total_meals || 0) + totalMeals,
            total_pounds: (currentImpact.total_pounds || 0) + totalPounds,
            co2_saved: (currentImpact.co2_saved || 0) + co2Saved,
            last_donation: new Date().toISOString()
          };

          await donationService.updateImpact(newImpact);
          
          // Update local state
          setDonationImpact({
            totalDonations: newImpact.total_donations,
            totalMeals: newImpact.total_meals,
            totalPounds: newImpact.total_pounds,
            co2Saved: newImpact.co2_saved,
            lastDonation: newImpact.last_donation
          });
          
          console.log('✅ Impact stats updated');
        } catch (impactError) {
          console.error('⚠️ Error updating impact stats:', impactError);
          // Don't fail the whole donation if just stats update fails
        }


        console.log('🗑️ Removing donated items from pantry...');

        // Remove from Supabase AND local state
        await Promise.all(items.map(item => pantryService.delete(item.id)));
        
        const donatedItemIds = items.map(item => item.id);
        setPantry(prev => prev.filter(item => !donatedItemIds.includes(item.id)));

        console.log('📜 Reloading donation history...');

        // Reload donation history to show the new donation
        const historyData = await donationService.getHistory();
        setDonationHistory(historyData.map(donation => ({
          id: donation.id,
          date: donation.date,
          foodBank: donation.food_bank,
          items: donation.items,
          totalMeals: donation.total_meals,
        })));

        console.log('✅ Donation complete!');

        success(`Donation recorded! You're feeding ${totalMeals} meals! 🎉`);
        setShowDonationModal(false);
        setItemsToDonate([]);
        setSelectedFoodBank(null);
        
        // Switch to donate tab to show the impact
        setCurrentTab('donate');
      } catch (err: any) {
        console.error('❌ Error recording donation:', err);
        console.error('Error details:', {
          message: err.message,
          code: err.code,
          details: err.details,
          hint: err.hint
        });
        
        // Show specific error message
        if (err.code === '23505') {
          error('Database sync error. Please refresh the page and try again.');
        } else {
          error(`Failed to record donation: ${err.message || 'Please try again.'}`);
        }
      }
    };
  if (authLoading) {  // ← Changed from loading
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ fontSize: '3rem' }}>👨‍🍳</div>
      </div>
    );
  }

  if (!user) {
    return <Auth onAuthSuccess={() => {}} />;
  }
  return (
    <div style={{ minHeight: '100vh', background: bgColor }}>
      <header style={{
        background: cardBg,
        padding: isMobile ? '0.75rem 1rem' : '1rem',
        boxShadow: '0 2px 20px rgba(0,0,0,0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: isMobile ? '1.25rem' : '1.5rem' }}>👨‍🍳</span>
            <h1 style={{ margin: 0, color: '#10b981', fontSize: isMobile ? '1.25rem' : '1.8rem', fontWeight: '700' }}>
              {isMobile ? 'GG' : 'GroceryGenius'}
            </h1>
          </div>

          <div style={{ display: 'flex', gap: isMobile ? '0.5rem' : '0.75rem', alignItems: 'center' }}>
            <button onClick={() => setShowCalorieTracker(!showCalorieTracker)} style={{
              padding: isMobile ? '0.4rem 0.6rem' : '0.5rem 1rem',
              background: todayCalories > dailyCalorieGoal ? '#fee2e2' : '#f0fdf4',
              border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem',
              fontSize: isMobile ? '0.7rem' : '0.875rem'
            }}>
              <span style={{ fontSize: isMobile ? '0.9rem' : '1.1rem' }}>📊</span>
              <span style={{ fontWeight: '600', color: textColor }}>
                {isMobile ? `${todayCalories}/${dailyCalorieGoal}` : `${todayCalories}/${dailyCalorieGoal} Cal`}
              </span>
            </button>
            
            {!isMobile && (
              <button onClick={() => setShowDemoConfirm(true)} style={{
                padding: '0.5rem 1rem',
                background: 'linear-gradient(45deg, #8b5cf6, #6366f1)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.875rem'
              }}>
                🎬 Demo
              </button>
            )}
            
            <button onClick={async () => {
              await authService.signOut();
              setUser(null);
            }} style={{
              padding: isMobile ? '0.4rem 0.8rem' : '0.5rem 1rem',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: isMobile ? '0.75rem' : '1rem'
            }}>
              {isMobile ? '🚪' : 'Sign Out'}
            </button>
          </div>
        </div>
      </header>

      {getExpiringItems().length > 0 && (
        <div style={{ background: '#fee2e2', borderBottom: '2px solid #dc2626', padding: '0.75rem' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', color: '#dc2626', fontWeight: '600' }}>
            ⚠️ {getExpiringItems().length} items expiring soon! {getExpiringItems().map(i => i.name).join(', ')}
          </div>
        </div>
      )}
      <nav style={{
        background: cardBg, 
        display: 'flex', 
        justifyContent: isMobile ? 'flex-start' : 'center', 
        padding: '0.5rem', 
        gap: '0.5rem',
        position: 'sticky', 
        top: isMobile ? '56px' : '72px', 
        zIndex: 99,
        overflowX: 'auto',
        flexWrap: isMobile ? 'nowrap' : 'wrap'
      }}>
        {(['pantry', 'recipes', 'mealplan', 'shopping', 'donate', 'favorites'] as const).map((tab) => (

          <button key={tab} onClick={() => handleTabChange(tab)} style={{
            padding: isMobile ? '0.5rem 1rem' : '0.75rem 1.5rem', 
            border: 'none',
            background: currentTab === tab ? '#10b981' : 'transparent',
            color: currentTab === tab ? 'white' : mutedText,
            borderRadius: '12px', 
            cursor: 'pointer', 
            fontWeight: '600',
            transition: 'all 0.3s ease',
            fontSize: isMobile ? '0.875rem' : '1rem',
            whiteSpace: 'nowrap',
            flex: isMobile ? '0 0 auto' : 'initial'
          }}>
            {tab === 'recipes' && '🍳 Recipes'}
            {tab === 'mealplan' && (isMobile ? '📅 Plan' : '📅 Meal Plan')}
            {tab === 'pantry' && (isMobile ? `📦 ${pantry.length}` : `📦 Pantry (${pantry.length})`)}
            {tab === 'shopping' && (isMobile ? `🛒 ${shoppingList.filter(i => !i.checked).length}` : `🛒 Shopping (${shoppingList.filter(i => !i.checked).length})`)}
            {tab === 'donate' && (isMobile ? `❤️ ${getExpiringItems().length}` : `❤️ Donate (${getExpiringItems().length})`)}
            {tab === 'favorites' && (isMobile ? `⭐ ${favorites.length}` : `⭐ Favorites (${favorites.length})`)}
          </button>
        ))}
      </nav>
      <main style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: isMobile ? '1rem' : '2rem',
        animation: isTabChanging ? 'fadeOut 0.15s ease-out' : 'fadeIn 0.3s ease-out'
      }}>
        {currentTab === 'recipes' && (
          <>
            <div style={{ background: cardBg, padding: '2rem', borderRadius: '16px', marginBottom: '2rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>🥘 What ingredients do you have?</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                {ingredientTags.map(tag => (
                  <span key={tag} style={{
                    background: 'linear-gradient(45deg, #10b981, #059669)', color: 'white',
                    padding: '0.5rem 1rem', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '0.5rem'
                  }}>
                    {tag}
                    <button onClick={() => setIngredientTags(ingredientTags.filter(t => t !== tag))}
                      style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.25rem' }}>×</button>
                  </span>
                ))}
              </div>
              <input type="text" placeholder="Type ingredients and press Enter..." onKeyPress={(e) => {
                if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                  const tag = (e.target as HTMLInputElement).value.trim().toLowerCase();
                  if (!ingredientTags.includes(tag)) setIngredientTags([...ingredientTags, tag]);
                  (e.target as HTMLInputElement).value = '';
                }
              }} style={{ width: '100%', padding: isMobile ? '0.75rem' : '1rem', border: '2px solid #e5e7eb', borderRadius: '12px', fontSize: isMobile ? '0.875rem' : '1rem', marginBottom: '1rem', boxSizing: 'border-box' }} />

              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>🔍 Or search for a specific recipe:</label>
              <input type="text" placeholder="e.g., apple pie, chicken pasta, orange glazed salmon..." value={recipeSearchQuery}
                onChange={(e) => setRecipeSearchQuery(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && !recipeLoading && handleGetRecipes()}
                style={{ width: '100%', padding: isMobile ? '0.75rem' : '1rem', border: '2px solid #e5e7eb', borderRadius: '12px', fontSize: isMobile ? '0.875rem' : '1rem', marginBottom: '1rem', boxSizing: 'border-box' }} />

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <select value={dietaryFilter} onChange={(e) => setDietaryFilter(e.target.value)}
                  style={{ padding: '0.75rem', border: '2px solid #e5e7eb', borderRadius: '8px', minWidth: '200px' }}>
                  <option value="">Any dietary preference</option>
                  <option value="vegetarian">Vegetarian</option>
                  <option value="vegan">Vegan</option>
                  <option value="gluten-free">Gluten-free</option>
                  <option value="keto">Keto</option>
                </select>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>⚖️</span>
                  <label style={{ fontWeight: '600' }}>Servings:</label>
                  <input type="number" min="1" max="12" value={recipeServings}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setRecipeServings('' as any);
                      } else {
                        setRecipeServings(Math.max(1, Math.min(12, parseInt(val) || 2)));
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value === '' || parseInt(e.target.value) < 1) {
                        setRecipeServings(2);
                      }
                    }}
                    style={{ width: '60px', padding: '0.5rem', border: '2px solid #e5e7eb', borderRadius: '8px', textAlign: 'center', fontWeight: '600' }} />
                </div>

                {pantry.length > 0 && (
                  <button onClick={addPantryToIngredients} style={{
                    padding: '0.75rem 1rem', background: '#8b5cf6', color: 'white',
                    border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600'
                  }}>📦 Add Pantry Items</button>
                )}

                <button onClick={() => { setRecipes([]); setIngredientTags([]); setRecipeSearchQuery(''); setErrorMsg(''); }}
                  style={{ padding: '0.75rem 1rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer' }}>
                  Clear All
                </button>
                <button onClick={() => {
                  setCameraSource('recipes');
                  setShowImageUpload(true);
                }} style={{
                  padding: '0.75rem 1rem', background: '#8b5cf6', color: 'white',
                  border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600',
                  display: 'flex', alignItems: 'center', gap: '0.5rem'
                }}>
                  📷 Scan Ingredients
                </button>
                <button onClick={handleGetRecipes} disabled={recipeLoading}
                  style={{
                    padding: '0.75rem 2rem', background: recipeLoading ? '#9ca3af' : 'linear-gradient(45deg, #10b981, #059669)',
                    color: 'white', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: recipeLoading ? 'not-allowed' : 'pointer'
                  }}>
                  {recipeLoading ? '⏳ Generating...' : '🍳 Get Recipes'}
                </button>
              </div>

              {errorMsg && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #dc2626' }}>{errorMsg}</div>}
            </div>

            {recipeLoading && (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{
                    background: cardBg,
                    borderRadius: '16px',
                    padding: '1.5rem',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                  }}>
                    {/* Header skeleton */}
                    <div style={{
                      height: '24px',
                      background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 1.5s infinite',
                      borderRadius: '4px',
                      marginBottom: '1rem'
                    }} />
                    
                    {/* Content skeleton */}
                    <div style={{
                      height: '16px',
                      background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 1.5s infinite',
                      borderRadius: '4px',
                      marginBottom: '0.5rem',
                      width: '80%'
                    }} />
                    
                    <div style={{
                      height: '16px',
                      background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 1.5s infinite',
                      borderRadius: '4px',
                      marginBottom: '0.5rem',
                      width: '60%'
                    }} />
                    
                    {/* Nutrition skeleton */}
                    <div style={{
                      height: '80px',
                      background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 1.5s infinite',
                      borderRadius: '12px',
                      marginTop: '1rem'
                    }} />
                    
                    {/* Text at bottom */}
                    <div style={{
                      textAlign: 'center',
                      marginTop: '1rem',
                      color: '#10b981',
                      fontWeight: '600'
                    }}>
                      🤖 Generating recipe {i}...
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>              {recipes.map((recipe, idx) => {
                const grade = calculateHealthGrade(recipe);
                const ingredients = parseIngredients(recipe);
                return (
                  <div 
                    key={idx}
                    className="recipe-card"
                    style={{ animationDelay: `${idx * 0.1}s` }}
                  >
                    <div onClick={() => { setSelectedRecipe(recipe); setShowDetailedView(true); }} style={{ cursor: 'pointer', marginBottom: '0.5rem' }}>
                      <div style={{ 
                        background: cardBg, 
                        borderRadius: isMobile ? '12px' : '16px', 
                        padding: isMobile ? '1rem' : '1.5rem', 
                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)' 
                      }}>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          marginBottom: isMobile ? '0.75rem' : '1rem',
                          gap: isMobile ? '0.75rem' : '1rem'
                        }}>
                          <h3 style={{ 
                            margin: 0, 
                            fontSize: isMobile ? '0.95rem' : '1.25rem', 
                            fontWeight: '700', 
                            flex: 1, 
                            paddingRight: isMobile ? '0.5rem' : '1rem',
                            lineHeight: '1.3'
                          }}>
                            {idx + 1}. {recipe.name}
                          </h3>
                          <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            gap: '0.25rem',
                            flexShrink: 0
                          }}>
                            <div style={{
                              background: getGradeColor(grade), 
                              color: 'white', 
                              padding: isMobile ? '0.4rem 0.6rem' : '0.5rem 0.75rem',
                              borderRadius: '12px', 
                              fontSize: isMobile ? '0.9rem' : '1.1rem', 
                              fontWeight: '700', 
                              minWidth: isMobile ? '45px' : '55px', 
                              textAlign: 'center'
                            }}>{grade}</div>
                            <span style={{ 
                              fontSize: isMobile ? '0.65rem' : '0.7rem', 
                              color: mutedText, 
                              fontWeight: '600' 
                            }}>Health</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                          {recipe.prep_time && <span style={{ color: mutedText, fontSize: '0.875rem' }}>⏱ {recipe.prep_time}</span>}
                          {recipe.difficulty && (
                            <span style={{
                              padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.875rem',
                              background: recipe.difficulty.toLowerCase().includes('easy') ? '#dcfce7' : '#fef3c7',
                              color: recipe.difficulty.toLowerCase().includes('easy') ? '#166534' : '#92400e'
                            }}>{recipe.difficulty}</span>
                          )}
                          <span style={{ color: mutedText, fontSize: '0.875rem' }}>👥 {recipe.servings} servings</span>
                        </div>

                        {ingredients.length > 0 && (
                          <div style={{ 
                            background: '#f0fdf4', 
                            padding: isMobile ? '0.75rem' : '1rem', 
                            borderRadius: isMobile ? '8px' : '12px', 
                            marginBottom: isMobile ? '0.75rem' : '1rem', 
                            border: '1px solid #bbf7d0' 
                          }}>
                            <div style={{ 
                              fontWeight: '600', 
                              color: '#166534', 
                              marginBottom: '0.5rem', 
                              fontSize: isMobile ? '0.75rem' : '0.875rem' 
                            }}>📝 Key Ingredients:</div>
                            <div style={{ 
                              display: 'grid', 
                              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', 
                              gap: isMobile ? '0.25rem' : '0.5rem', 
                              fontSize: isMobile ? '0.7rem' : '0.8rem', 
                              color: '#047857' 
                            }}>
                              {ingredients.slice(0, isMobile ? 4 : 8).map((ing, i) => (
                                <div key={i}>• {Math.round(ing.quantity * 10) / 10} {ing.unit} {ing.name}</div>
                              ))}
                              {ingredients.length > (isMobile ? 4 : 8) && (
                                <div style={{ fontStyle: 'italic' }}>+ {ingredients.length - (isMobile ? 4 : 8)} more...</div>
                              )}
                            </div>
                          </div>
                        )}

                        {recipe.nutrition && (
                          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', fontSize: '0.85rem' }}>
                              <div style={{ textAlign: 'center' }}>
                                <div style={{ fontWeight: '600', color: '#059669' }}>{recipe.nutrition.calories}</div>
                                <div style={{ color: mutedText }}>Calories</div>
                              </div>
                              <div style={{ textAlign: 'center' }}>
                                <div style={{ fontWeight: '600', color: '#7c3aed' }}>{recipe.nutrition.protein}g</div>
                                <div style={{ color: mutedText }}>Protein</div>
                              </div>
                              <div style={{ textAlign: 'center' }}>
                                <div style={{ fontWeight: '600', color: '#10b981' }}>{recipe.nutrition.fiber}g</div>
                                <div style={{ color: mutedText }}>Fiber</div>
                              </div>
                            </div>
                          </div>
                        )}

                        <div style={{
                          color: '#10b981', fontWeight: '600', fontSize: '0.9rem', padding: '0.75rem',
                          background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', textAlign: 'center'
                        }}>Click for full recipe with all details</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button onClick={() => addMissingToShopping(recipe)} style={{
                        flex: isMobile ? '1 1 100%' : '1',
                        padding: isMobile ? '0.75rem' : '0.75rem',
                        background: 'linear-gradient(45deg, #ec4899, #8b5cf6)',
                        fontSize: isMobile ? '0.875rem' : '1rem',
                        color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '600',
                        minWidth: isMobile ? 'auto' : '120px'
                      }}>🛒 {isMobile ? 'Add to Shopping' : 'Shopping'}</button>
                      
                      <button onClick={async () => {
                        const exists = favorites.some(f => f.name === recipe.name);
                        if (!exists) {
                          try {
                            const savedRecipe = await recipesService.add({
                              name: recipe.name,
                              ingredients: recipe.ingredients,
                              instructions: recipe.instructions,
                              prep_time: recipe.prep_time,
                              cook_time: recipe.cook_time,
                              difficulty: recipe.difficulty,
                              servings: recipe.servings,
                              nutrition: recipe.nutrition,
                              health_benefits: recipe.health_benefits,
                              budget_tip: recipe.budget_tip,
                            });

                            setFavorites(prev => [...prev, {
                              ...recipe,
                              id: savedRecipe.id,
                              savedDate: savedRecipe.created_at,
                            }]);
                            success('Added to favorites & meal planner!');
                          } catch (error) {
                            console.error('Error saving recipe:', error);
                            warning('Failed to save recipe');
                          }
                        } else {
                          info('Already in favorites!');
                        }
                      }} style={{
                        flex: isMobile ? '1' : 'initial',
                        padding: '0.75rem',
                        background: 'linear-gradient(45deg, #f59e0b, #d97706)',
                        color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer',
                        fontSize: isMobile ? '0.875rem' : '1rem',
                        minWidth: isMobile ? 'auto' : '50px'
                      }}>💖 {isMobile && 'Favorite'}</button>

                      <button onClick={() => {
                        setCurrentTab('mealplan');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        info('Switched to Meal Plan! Drag this recipe onto your calendar.');
                      }} style={{
                        flex: isMobile ? '1' : 'initial',
                        padding: '0.75rem',
                        background: 'linear-gradient(45deg, #3b82f6, #2563eb)',
                        color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '600',
                        fontSize: isMobile ? '0.875rem' : '1rem',
                        minWidth: isMobile ? 'auto' : '120px'
                      }}>📅 {isMobile ? 'Plan' : 'Meal Plan'}</button>
                      
                      {recipe.nutrition && (
                        <button onClick={() => {
                          setTodayCalories(prev => prev + recipe.nutrition!.calories);
                          success(`Added ${recipe.nutrition!.calories} calories`);
                        }} style={{
                          flex: isMobile ? '1' : 'initial',
                          padding: '0.75rem',
                          background: '#10b981', color: 'white',
                          border: 'none', borderRadius: '12px', cursor: 'pointer',
                          fontSize: isMobile ? '0.875rem' : '0.875rem',
                          minWidth: isMobile ? 'auto' : '80px'
                        }}>📊 {recipe.nutrition.calories}</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {recipes.length === 0 && !recipeLoading && (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'white' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🍳</div>
                <p>Add ingredients or search for a specific recipe to get started!</p>
                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Try: "apple pie", "chicken pasta", or add ingredients like "tomatoes", "chicken"</p>
              </div>
            )}
          </>
        )}
        {currentTab === 'mealplan' && (
        <MealPlanCalendar 
          savedRecipes={favorites}
          onAddToShoppingList={async (items) => {
            try {
              // Save to Supabase
              const savedItems = await Promise.all(
                items.map(ing => 
                  shoppingService.add({
                    name: ing.name,
                    quantity: ing.quantity,
                    unit: ing.unit,
                    category: 'meal-plan',
                    checked: false,
                    priority: 'medium'
                  })
                )
              );

              // Update local state
              const newItems = savedItems.map(item => ({
                id: item.id,
                name: item.name,
                quantity: item.quantity,
                unit: item.unit,
                checked: item.checked,
                category: item.category,
                priority: item.priority as 'high' | 'medium' | 'low'
              }));
              
              setShoppingList(prev => [...prev, ...newItems]);
              
              // Switch tab FIRST
              setCurrentTab('shopping');
              window.scrollTo({ top: 0, behavior: 'smooth' });
              
              // Show success message AFTER with a small delay
              setTimeout(() => {
                success(`Added ${newItems.length} ingredients to shopping list!`);
              }, 300);
            } catch (error) {
              console.error('Error adding to shopping list:', error);
              warning('Failed to add some items to shopping list');
            }
          }}
        />
        )}
        {currentTab === 'pantry' && (
          <div style={{ 
            background: cardBg, 
            padding: isMobile ? '1rem' : '2rem', 
            borderRadius: '16px' 
          }}>
              <div style={{ 
              display: 'flex', 
              flexDirection: isMobile ? 'column' : 'row',
              justifyContent: 'space-between', 
              marginBottom: isMobile ? '1rem' : '2rem', 
              gap: '1rem'
            }}>
              <h2 style={{ 
                margin: 0,
                fontSize: isMobile ? '1.5rem' : '2rem'
              }}>📦 My Pantry</h2>
              <div style={{ 
                display: 'flex', 
                gap: '0.75rem', 
                flexWrap: 'wrap',
                justifyContent: isMobile ? 'stretch' : 'flex-start'
              }}>
                  <button 
                    onClick={() => {
                      setCameraSource('pantry');
                      setShowImageUpload(true);
                    }}
                    style={{
                      padding: isMobile ? '0.75rem' : '0.75rem 1.5rem',
                      background: '#8b5cf6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      flex: isMobile ? '1' : 'initial',
                      fontSize: isMobile ? '0.875rem' : '1rem'
                    }}
                  >
                    📷 {isMobile ? 'Scan' : 'Scan Items'}
                  </button>

                  {getExpiringItems().length > 0 && (
                    <button 
                      onClick={() => {
                        setItemsToDonate(getExpiringItems().map(i => i.id));
                        setShowDonationModal(true);
                      }}
                      style={{
                        padding: isMobile ? '0.75rem' : '0.75rem 1.5rem',
                        background: 'linear-gradient(45deg, #f59e0b, #d97706)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        flex: isMobile ? '1' : 'initial',
                        fontSize: isMobile ? '0.875rem' : '1rem'
                      }}
                    >
                      🎁 {isMobile ? `Donate (${getExpiringItems().length})` : `Donate Expiring (${getExpiringItems().length})`}
                    </button>
                  )}
                  <button 
                    onClick={() => setShowAddPantry(!showAddPantry)} 
                    style={{
                      padding: isMobile ? '0.75rem' : '0.75rem 1.5rem',
                      background: '#10b981', 
                      color: 'white',
                      border: 'none', 
                      borderRadius: '12px', 
                      cursor: 'pointer', 
                      fontWeight: '600',
                      flex: isMobile ? '1' : 'initial',
                      fontSize: isMobile ? '0.875rem' : '1rem'
                    }}
                  >
                    {showAddPantry ? '✕ Cancel' : (isMobile ? '+ Add' : '+ Add Item')}
                  </button>
              </div>
            </div>
            {/* Edit Pantry Item Modal */}
            {showEditPantry && editingPantryItem && (
              <div 
                className="modal-backdrop"
                onClick={() => {
                  setShowEditPantry(false);
                  setEditingPantryItem(null);
                  setNewPantryItem({ name: '', quantity: 1, unit: 'pc', category: 'other', expiryDate: '' });
                }}
                style={{
                  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                  background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', zIndex: 2000
                }}
              >
                <div 
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    background: cardBg,
                    borderRadius: isMobile ? '16px' : '20px',
                    padding: isMobile ? '1.25rem' : '2rem',
                    maxWidth: isMobile ? '95vw' : '500px',
                    width: isMobile ? '95vw' : '90%',
                    animation: 'scaleIn 0.3s ease-out',
                    position: 'relative'
                  }}
                >
                  <button 
                    onClick={() => {
                      setShowEditPantry(false);
                      setEditingPantryItem(null);
                      setNewPantryItem({ name: '', quantity: 1, unit: 'pc', category: 'other', expiryDate: '' });
                    }}
                    style={{
                      position: 'absolute',
                      top: '1rem',
                      right: '1rem',
                      background: '#f3f4f6',
                      border: 'none',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      cursor: 'pointer',
                      fontSize: '1.5rem'
                    }}
                  >
                    ×
                  </button>

                  <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.75rem', fontWeight: '700' }}>
                    ✏️ Edit Pantry Item
                  </h3>

                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {/* Item Name */}
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                        Item Name
                      </label>
                      <input 
                        type="text" 
                        placeholder="e.g., Rice, Chicken, Tomatoes" 
                        value={newPantryItem.name}
                        onChange={(e) => setNewPantryItem({...newPantryItem, name: e.target.value})}
                        style={{ 
                          width: '100%',
                          padding: '0.75rem', 
                          border: '2px solid #e5e7eb', 
                          borderRadius: '8px',
                          fontSize: '1rem',
                          boxSizing: 'border-box'
                        }} 
                      />
                    </div>

                    {/* Quantity and Unit */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                          Quantity
                        </label>
                        <input 
                          type="number" 
                          min="1" 
                          value={newPantryItem.quantity}
                          onChange={(e) => setNewPantryItem({...newPantryItem, quantity: Math.max(1, parseInt(e.target.value) || 1)})}
                          style={{ 
                            width: '100%',
                            padding: '0.75rem', 
                            border: '2px solid #e5e7eb', 
                            borderRadius: '8px',
                            fontSize: '1rem',
                            boxSizing: 'border-box'
                          }} 
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                          Unit
                        </label>
                        <select 
                          value={newPantryItem.unit} 
                          onChange={(e) => setNewPantryItem({...newPantryItem, unit: e.target.value})}
                          style={{ 
                            width: '100%',
                            padding: '0.75rem', 
                            border: '2px solid #e5e7eb', 
                            borderRadius: '8px',
                            fontSize: '1rem',
                            cursor: 'pointer',
                            boxSizing: 'border-box'
                          }}
                        >
                          <option value="pc">pieces</option>
                          <option value="lbs">lbs</option>
                          <option value="kg">kg</option>
                          <option value="cups">cups</option>
                          <option value="oz">oz</option>
                          <option value="g">grams</option>
                        </select>
                      </div>
                    </div>

                    {/* Category */}
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                        Category
                      </label>
                      <select 
                        value={newPantryItem.category} 
                        onChange={(e) => setNewPantryItem({...newPantryItem, category: e.target.value})}
                        style={{ 
                          width: '100%',
                          padding: '0.75rem', 
                          border: '2px solid #e5e7eb', 
                          borderRadius: '8px',
                          fontSize: '1rem',
                          cursor: 'pointer',
                          boxSizing: 'border-box'
                        }}
                      >
                        <option value="produce">🥬 Produce</option>
                        <option value="dairy">🥛 Dairy</option>
                        <option value="meat">🍖 Meat</option>
                        <option value="canned">🥫 Canned</option>
                        <option value="grains">🌾 Grains</option>
                        <option value="breakfast">🥞 Breakfast</option>
                        <option value="other">📦 Other</option>
                      </select>
                    </div>

                    {/* Expiry Date */}
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                        Expiry Date (Optional)
                      </label>
                      <input 
                        type="date" 
                        value={newPantryItem.expiryDate}
                        onChange={(e) => setNewPantryItem({...newPantryItem, expiryDate: e.target.value})}
                        style={{ 
                          width: '100%',
                          padding: '0.75rem', 
                          border: '2px solid #e5e7eb', 
                          borderRadius: '8px',
                          fontSize: '1rem',
                          boxSizing: 'border-box'
                        }} 
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                    <button
                      onClick={() => {
                        setShowEditPantry(false);
                        setEditingPantryItem(null);
                        setNewPantryItem({ name: '', quantity: 1, unit: 'pc', category: 'other', expiryDate: '' });
                      }}
                      style={{
                        flex: 1,
                        padding: '1rem',
                        background: '#f3f4f6',
                        border: '1px solid #d1d5db',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '1rem'
                      }}
                    >
                      Cancel
                    </button>

                    <button
                      onClick={handleSaveEditPantryItem}
                      style={{
                        flex: 1,
                        padding: '1rem',
                        background: 'linear-gradient(45deg, #10b981, #059669)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '1rem'
                      }}
                    >
                      💾 Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}
            {showAddPantry && (
              <div style={{ 
                background: '#f9fafb', 
                padding: isMobile ? '1rem' : '1.5rem', 
                borderRadius: '12px', 
                marginBottom: '2rem', 
                display: 'grid', 
                gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr 1fr', 
                gap: isMobile ? '0.75rem' : '1rem' 
              }}>
                <input 
                  type="text" 
                  placeholder="Item name" 
                  value={newPantryItem.name}
                  onChange={(e) => setNewPantryItem({...newPantryItem, name: e.target.value})}
                  style={{ 
                    padding: '0.75rem', 
                    border: '1px solid #d1d5db', 
                    borderRadius: '8px',
                    width: '100%',
                    boxSizing: 'border-box'
                  }} 
                />
                
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr', 
                  gap: isMobile ? '0.75rem' : '0',
                  gridColumn: isMobile ? '1' : 'auto'
                }}>
                  <input 
                    type="number" 
                    min="1" 
                    placeholder="Quantity"
                    value={newPantryItem.quantity}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setNewPantryItem({...newPantryItem, quantity: '' as any});
                      } else {
                        setNewPantryItem({...newPantryItem, quantity: Math.max(1, parseInt(val) || 1)});
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value === '' || parseInt(e.target.value) < 1) {
                        setNewPantryItem({...newPantryItem, quantity: 1});
                      }
                    }}
                    style={{ 
                      padding: '0.75rem', 
                      border: '1px solid #d1d5db', 
                      borderRadius: '8px',
                      width: '100%',
                      boxSizing: 'border-box'
                    }} 
                  />
                  
                  <select 
                    value={newPantryItem.unit} 
                    onChange={(e) => setNewPantryItem({...newPantryItem, unit: e.target.value})}
                    style={{ 
                      padding: '0.75rem', 
                      border: '1px solid #d1d5db', 
                      borderRadius: '8px',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="pc">pieces</option>
                    <option value="kg">kg</option>
                    <option value="lbs">lbs</option>
                    <option value="cups">cups</option>
                  </select>
                </div>
                
                <input 
                  type="date" 
                  value={newPantryItem.expiryDate}
                  onChange={(e) => setNewPantryItem({...newPantryItem, expiryDate: e.target.value})}
                  style={{ 
                    gridColumn: '1 / -1', 
                    padding: '0.75rem', 
                    border: '1px solid #d1d5db', 
                    borderRadius: '8px',
                    width: '100%',
                    boxSizing: 'border-box'
                  }} 
                />
                
                <button 
                  onClick={async () => {
                    if (!newPantryItem.name.trim()) return;
                    const quantity = typeof newPantryItem.quantity === 'number' ? newPantryItem.quantity : 1;
                    
                    try {
                      const savedItem = await pantryService.add({
                        name: newPantryItem.name.trim(),
                        quantity: quantity,
                        unit: newPantryItem.unit,
                        category: newPantryItem.category,
                        expiryDate: newPantryItem.expiryDate || undefined
                      });

                      setPantry(prev => [...prev, {
                        id: savedItem.id,
                        name: savedItem.name,
                        quantity: savedItem.quantity,
                        unit: savedItem.unit,
                        category: savedItem.category,
                        expiryDate: savedItem.expiry_date || undefined
                      }]);

                      setNewPantryItem({ name: '', quantity: 1, unit: 'pc', category: 'other', expiryDate: '' });
                      setShowAddPantry(false);
                      success('Item added to pantry!');
                    } catch (error) {
                      console.error('Error adding pantry item:', error);
                      warning('Failed to add item. Please try again.');
                    }
                  }}
                  style={{
                    gridColumn: '1 / -1', 
                    padding: '0.75rem', 
                    background: '#10b981', 
                    color: 'white',
                    border: 'none', 
                    borderRadius: '8px', 
                    cursor: 'pointer', 
                    fontWeight: '600'
                  }}
                >
                  Add to Pantry
                </button>
              </div>
            )}

            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {pantry.map(item => {
                const expiring = getExpiringItems().some(e => e.id === item.id);
                return (
                  <div 
                    key={item.id}
                    className="card-hover"
                    style={{
                      display: 'flex', 
                      flexDirection: isMobile ? 'column' : 'row',
                      justifyContent: 'space-between', 
                      alignItems: isMobile ? 'stretch' : 'center',
                      padding: isMobile ? '0.75rem' : '1rem',
                      background: expiring ? '#fee2e2' : '#f9fafb',
                      border: `1px solid ${expiring ? '#dc2626' : '#e5e7eb'}`,
                      borderRadius: '8px',
                      gap: isMobile ? '0.75rem' : '0'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: isMobile ? '0.5rem' : '0.75rem' 
                      }}>
                        <div style={{
                          fontSize: '2rem',
                          width: '40px',
                          height: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'white',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb'
                        }}>
                          {item.category === 'produce' ? '🥬' :
                          item.category === 'dairy' ? '🥛' :
                          item.category === 'meat' ? '🍖' :
                          item.category === 'canned' ? '🥫' :
                          item.category === 'grains' ? '🌾' :
                          item.category === 'breakfast' ? '🥞' : '📦'}
                        </div>
                        <div>
                          <span style={{ fontWeight: '600', fontSize: '1.05rem', color: '#1f2937' }}>
                            {item.name}
                          </span>
                          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                            {item.quantity} {item.unit}
                            {item.expiryDate && (
                              <span style={{ 
                                marginLeft: '0.5rem',
                                color: expiring ? '#dc2626' : '#6b7280',
                                fontWeight: expiring ? '600' : '400'
                              }}>
                                {expiring && '⚠️ '}
                                Expires: {new Date(item.expiryDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ 
                      display: 'flex', 
                      gap: '0.5rem',
                      width: isMobile ? '100%' : 'auto'
                    }}>
                      <button 
                        onClick={() => handleEditPantryItem(item)}
                        style={{
                          background: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          padding: isMobile ? '0.5rem' : '0.5rem 1rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: isMobile ? '0.75rem' : '0.875rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.25rem',
                          flex: isMobile ? '1' : 'initial'
                        }}
                      >
                        ✏️ {isMobile ? '' : 'Edit'}
                      </button>
                      <button 
                          onClick={async () => {
                            try {
                              await pantryService.delete(item.id);
                              setPantry(prev => prev.filter(i => i.id !== item.id));
                              success('Item removed');
                            } catch (error) {
                              console.error('Error deleting pantry item:', error);
                              warning('Failed to remove item');
                            }
                          }} 
                        style={{
                          background: '#fee2e2', 
                          color: '#dc2626', 
                          border: 'none',
                          padding: isMobile ? '0.5rem' : '0.5rem 1rem',
                          borderRadius: '6px', 
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: isMobile ? '0.75rem' : '0.875rem',
                          flex: isMobile ? '1' : 'initial'
                        }}
                      >
                        {isMobile ? '🗑️' : 'Remove'}
                      </button>
                    </div>
                  </div>
                );
              })}
              {pantry.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', color: mutedText }}>
                  <div style={{ fontSize: '3rem' }}>📦</div>
                  <p>Your pantry is empty. Add items to track what you have!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {currentTab === 'shopping' && (
          <div style={{ 
            background: cardBg, 
            padding: isMobile ? '1rem' : '2rem', 
            borderRadius: '16px' 
          }}>
              <div style={{ 
              display: 'flex', 
              flexDirection: isMobile ? 'column' : 'row',
              justifyContent: 'space-between', 
              alignItems: isMobile ? 'stretch' : 'center',
              marginBottom: '1.5rem', 
              gap: '1rem' 
            }}>
              <h2 style={{ 
                margin: 0,
                fontSize: isMobile ? '1.5rem' : '2rem'
              }}>
                🛒 Shopping List ({shoppingList.filter(i => !i.checked).length} items)
              </h2>
              <div style={{ 
                display: 'flex', 
                gap: '0.75rem', 
                flexWrap: 'wrap',
                justifyContent: isMobile ? 'stretch' : 'flex-start'
              }}>
                <button 
                  onClick={() => setShowAddShopping(true)}
                  style={{
                    padding: isMobile ? '0.75rem' : '0.75rem 1.5rem',
                    background: 'linear-gradient(45deg, #10b981, #059669)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    flex: isMobile ? '1' : 'initial',
                    fontSize: isMobile ? '0.875rem' : '1rem'
                  }}
                >
                  ➕ {isMobile ? 'Add' : 'Add Item'}
                </button>
                <button onClick={() => setShowExportMenu(!showExportMenu)} style={{
                  padding: isMobile ? '0.75rem' : '0.75rem 1.5rem',
                  background: '#8b5cf6', 
                  color: 'white',
                  border: 'none', 
                  borderRadius: '12px', 
                  cursor: 'pointer', 
                  fontWeight: '600',
                  flex: isMobile ? '1' : 'initial',
                  fontSize: isMobile ? '0.875rem' : '1rem'
                }}>📤 {isMobile ? 'Export' : 'Export & Share'}</button>
              </div>
            </div>

            {showExportMenu && (
              <div style={{ background: '#f0f9ff', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: '2px solid #3b82f6' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>Export Options</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                  <button onClick={exportAsText} style={{
                    padding: '0.75rem', background: 'white', border: '2px solid #e5e7eb',
                    borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem'
                  }}>
                    📄 Export as Text
                  </button>
                  <button onClick={exportAsCSV} style={{
                    padding: '0.75rem', background: 'white', border: '2px solid #e5e7eb',
                    borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem'
                  }}>
                    📊 Export as CSV
                  </button>
                  <button onClick={shareList} style={{
                    padding: '0.75rem', background: 'white', border: '2px solid #e5e7eb',
                    borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem'
                  }}>
                    📱 Share List
                  </button>
                  <button onClick={emailList} style={{
                    padding: '0.75rem', background: 'white', border: '2px solid #e5e7eb',
                    borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem'
                  }}>
                    ✉️ Email List
                  </button>
                  <button onClick={printList} style={{
                    padding: '0.75rem', background: 'white', border: '2px solid #e5e7eb',
                    borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem'
                  }}>
                    🖨️ Print List
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: '600' }}>Sort by:</span>
                <select value={sortShoppingBy} onChange={(e) => setSortShoppingBy(e.target.value as any)}
                  style={{ padding: '0.5rem', border: '2px solid #e5e7eb', borderRadius: '8px' }}>
                  <option value="category">Category</option>
                  <option value="alphabetical">Alphabetical</option>
                </select>
              </div>
              
              {shoppingList.length > 0 && (
                <div style={{ padding: '0.5rem 1rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #86efac' }}>
                  <strong style={{ color: '#166534' }}>
                    Est. Cost: ${estimateCost().toFixed(2)}
                  </strong>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {sortShoppingList().map(item => (
                <div 
                  key={item.id}
                  className="card-hover"
                  style={{
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    alignItems: isMobile ? 'stretch' : 'center',
                    gap: isMobile ? '0.75rem' : '1rem',
                    padding: isMobile ? '0.75rem' : '1rem',
                    background: item.checked ? '#f3f4f6' : '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    textDecoration: item.checked ? 'line-through' : 'none',
                    opacity: item.checked ? 0.6 : 1
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.75rem' : '1rem', flex: 1 }}>
                    <input type="checkbox" checked={item.checked}
                      onChange={async () => {
                        try {
                          await shoppingService.update(item.id, { checked: !item.checked });
                          setShoppingList(prev => prev.map(i => i.id === item.id ? {...i, checked: !i.checked} : i));
                        } catch (error) {
                          console.error('Error updating shopping item:', error);
                        }
                      }}
                      style={{ 
                        width: isMobile ? '18px' : '20px', 
                        height: isMobile ? '18px' : '20px', 
                        cursor: 'pointer',
                        flexShrink: 0
                      }} />
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontWeight: '500',
                        fontSize: isMobile ? '0.875rem' : '1rem'
                      }}>{item.name}</div>
                      <div style={{ 
                        fontSize: isMobile ? '0.75rem' : '0.875rem', 
                        color: mutedText 
                      }}>
                        {item.quantity} {item.unit} • {item.category}
                      </div>
                    </div>
                  </div>

                  <div style={{ 
                    display: 'flex', 
                    gap: '0.5rem', 
                    flexWrap: 'wrap',
                    width: isMobile ? '100%' : 'auto'
                  }}>
                    <a href={`https://www.amazon.com/s?k=${encodeURIComponent(item.name)}&i=amazonfresh`}
                      target="_blank" rel="noopener noreferrer"
                      style={{
                        flex: isMobile ? '1' : 'initial',
                        padding: isMobile ? '0.5rem' : '0.5rem 0.75rem',
                        background: '#ff9900',
                        color: 'white',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontSize: isMobile ? '0.75rem' : '0.875rem',
                        fontWeight: '600',
                        textAlign: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                      {isMobile ? '🛒' : '🛒 Amazon'}
                    </a>
                    <a href={`https://www.walmart.com/search?q=${encodeURIComponent(item.name)}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{
                        flex: isMobile ? '1' : 'initial',
                        padding: isMobile ? '0.5rem' : '0.5rem 0.75rem',
                        background: '#0071ce',
                        color: 'white',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontSize: isMobile ? '0.75rem' : '0.875rem',
                        fontWeight: '600',
                        textAlign: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                      {isMobile ? 'W' : 'Walmart'}
                    </a>
                    <button onClick={async () => {
                      try {
                        await shoppingService.delete(item.id);
                        setShoppingList(prev => prev.filter(i => i.id !== item.id));
                      } catch (error) {
                        console.error('Error deleting shopping item:', error);
                        warning('Failed to remove item');
                      }
                    }} style={{flex: isMobile ? '1' : 'initial',
                      background: '#fee2e2',
                      color: '#dc2626',
                      border: 'none',
                      padding: isMobile ? '0.5rem' : '0.5rem 1rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: isMobile ? '0.75rem' : '0.875rem'}}>
                      {isMobile ? '🗑️ Remove' : 'Remove'}
                    </button>
                  </div>
                </div>
              ))}
              {shoppingList.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', color: mutedText }}>
                  <div style={{ fontSize: '3rem' }}>🛒</div>
                  <p>Your shopping list is empty. Generate recipes to add ingredients!</p>
                </div>
              )}
            </div>

            {shoppingList.length > 0 && (
              <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #86efac' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <strong style={{ color: '#166534', fontSize: '1.1rem' }}>
                      📊 {shoppingList.filter(i => i.checked).length} of {shoppingList.length} items checked
                    </strong>
                    <div style={{ fontSize: '0.875rem', color: '#047857', marginTop: '0.25rem' }}>
                      {shoppingList.filter(i => !i.checked).length} items remaining
                    </div>
                  </div>
                  <button onClick={() => setShoppingList(prev => prev.filter(i => !i.checked))} style={{
                    padding: '0.75rem 1.5rem', background: '#ef4444', color: 'white',
                    border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600'
                  }}>🗑️ Clear Checked Items</button>
                </div>
              </div>
            )}
          </div>
        )}

        {currentTab === 'favorites' && (
          <div style={{ 
            background: cardBg, 
            padding: isMobile ? '1rem' : '2rem', 
            borderRadius: '16px' 
          }}>
            <h2 style={{ 
              margin: '0 0 2rem 0',
              fontSize: isMobile ? '1.5rem' : '2rem'
            }}>⭐ Favorite Recipes ({favorites.length})</h2>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {favorites.map(recipe => (
                <div 
                  key={recipe.id} 
                  onClick={() => { setSelectedRecipe(recipe); setShowDetailedView(true); }}
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
                      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>{recipe.name}</h3>
                      <div style={{ fontSize: '0.875rem', color: mutedText }}>
                        {recipe.prep_time && `⏱ ${recipe.prep_time}`}
                        {recipe.nutrition && ` • ${recipe.nutrition.calories} cal`}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: mutedText, marginTop: '0.5rem' }}>
                        Saved: {new Date(recipe.savedDate).toLocaleDateString()}
                      </div>
                    </div>
                    <button onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await recipesService.delete(recipe.id);
                        setFavorites(prev => prev.filter(f => f.id !== recipe.id));
                        success('Recipe removed');
                      } catch (error) {
                        console.error('Error deleting recipe:', error);
                        warning('Failed to remove recipe');
                      }
                    }} style={{
                      background: '#fee2e2', color: '#dc2626', border: 'none',
                      padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', height: 'fit-content'
                    }}>Remove</button>
                  </div>
                </div>
              ))}
              {favorites.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', color: mutedText }}>
                  <div style={{ fontSize: '3rem' }}>⭐</div>
                  <p>No favorites yet. Start saving recipes you love!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {currentTab === 'donate' && (
          <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
            {/* Impact Dashboard */}
            <div style={{ 
              background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
              padding: isMobile ? '1.5rem' : '2rem',
              borderRadius: '16px',
              marginBottom: isMobile ? '1rem' : '2rem',
              color: 'white'
            }}>
              <h2 style={{ 
                margin: '0 0 1rem 0', 
                fontSize: isMobile ? '1.5rem' : '2rem' 
              }}>❤️ Your Donation Impact</h2>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: isMobile ? '0.75rem' : '1rem' 
              }}>
                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '1.5rem', borderRadius: '12px' }}>
                  <div style={{ fontSize: '3rem', fontWeight: '700' }}>{donationImpact.totalMeals}</div>
                  <div style={{ fontSize: '1rem', opacity: 0.9 }}>Meals Donated</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '1.5rem', borderRadius: '12px' }}>
                  <div style={{ fontSize: '3rem', fontWeight: '700' }}>{donationImpact.totalDonations}</div>
                  <div style={{ fontSize: '1rem', opacity: 0.9 }}>Donations Made</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '1.5rem', borderRadius: '12px' }}>
                  <div style={{ fontSize: '3rem', fontWeight: '700' }}>{Math.round(donationImpact.totalPounds)}</div>
                  <div style={{ fontSize: '1rem', opacity: 0.9 }}>lbs Food Saved</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '1.5rem', borderRadius: '12px' }}>
                  <div style={{ fontSize: '3rem', fontWeight: '700' }}>{Math.round(donationImpact.co2Saved)}</div>
                  <div style={{ fontSize: '1rem', opacity: 0.9 }}>lbs CO₂ Prevented</div>
                </div>
              </div>
            </div>
            {donationImpact.totalMeals > 0 && (
              <button
                onClick={() => setShowShareModal(true)}
                style={{
                  marginTop: '1rem',
                  width: '100%',
                  padding: '1rem',
                  background: 'rgba(255,255,255,0.3)',
                  color: 'white',
                  border: '2px solid rgba(255,255,255,0.5)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                📱 Share Your Impact
              </button>
            )}

            {/* Expiring Items Alert */}
            {getExpiringItems().length > 0 && (
              <div style={{ 
                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                border: '2px solid #f59e0b',
                padding: '2rem',
                borderRadius: '20px',
                marginBottom: '2rem',
                boxShadow: '0 8px 24px rgba(245, 158, 11, 0.2)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Decorative background elements */}
                <div style={{
                  position: 'absolute',
                  top: '-50px',
                  right: '-50px',
                  width: '150px',
                  height: '150px',
                  background: 'rgba(251, 191, 36, 0.2)',
                  borderRadius: '50%',
                  filter: 'blur(40px)'
                }} />
                <div style={{
                  position: 'absolute',
                  bottom: '-30px',
                  left: '-30px',
                  width: '100px',
                  height: '100px',
                  background: 'rgba(245, 158, 11, 0.2)',
                  borderRadius: '50%',
                  filter: 'blur(30px)'
                }} />

                <div style={{ position: 'relative', zIndex: 1 }}>
                  {/* Header with icon */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      width: '60px',
                      height: '60px',
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '2rem',
                      boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                    }}>
                      ⚠️
                    </div>
                    <div>
                      <h3 style={{ 
                        margin: 0, 
                        color: '#92400e', 
                        fontSize: '1.75rem',
                        fontWeight: '700'
                      }}>
                        {getExpiringItems().length} {getExpiringItems().length === 1 ? 'Item' : 'Items'} Expiring Soon!
                      </h3>
                      <p style={{ 
                        margin: '0.25rem 0 0 0', 
                        color: '#b45309',
                        fontSize: '0.95rem',
                        fontWeight: '500'
                      }}>
                        Turn waste into meals for families in need
                      </p>
                    </div>
                  </div>

                  {/* Items Grid */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                    gap: '0.75rem', 
                    marginBottom: '1.5rem' 
                  }}>
                    {getExpiringItems().map(item => {
                      const daysUntil = Math.ceil(
                        (new Date(item.expiryDate!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                      );
                      
                      return (
                        <div key={item.id} style={{
                          background: 'white',
                          padding: '1rem',
                          borderRadius: '12px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                          border: '2px solid #fbbf24',
                          transition: 'all 0.2s',
                          cursor: 'default'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                        }}>
                          <div style={{
                            fontSize: '2rem',
                            marginBottom: '0.5rem',
                            textAlign: 'center'
                          }}>
                            {item.category === 'produce' ? '🥬' :
                            item.category === 'dairy' ? '🥛' :
                            item.category === 'meat' ? '🍖' :
                            item.category === 'canned' ? '🥫' :
                            item.category === 'grains' ? '🌾' : '📦'}
                          </div>
                          <div style={{
                            fontWeight: '700',
                            color: '#92400e',
                            marginBottom: '0.25rem',
                            fontSize: '0.95rem',
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {item.name}
                          </div>
                          <div style={{
                            fontSize: '0.75rem',
                            color: '#b45309',
                            fontWeight: '600',
                            textAlign: 'center'
                          }}>
                            {item.quantity} {item.unit}
                          </div>
                          <div style={{
                            marginTop: '0.5rem',
                            padding: '0.25rem 0.5rem',
                            background: daysUntil === 0 ? '#fee2e2' : daysUntil === 1 ? '#fed7aa' : '#fef3c7',
                            color: daysUntil === 0 ? '#dc2626' : daysUntil === 1 ? '#ea580c' : '#d97706',
                            borderRadius: '6px',
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            textAlign: 'center'
                          }}>
                            {daysUntil === 0 ? 'TODAY!' : 
                            daysUntil === 1 ? 'TOMORROW' : 
                            `${daysUntil} DAYS`}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Impact Preview */}
                  <div style={{
                    background: 'white',
                    padding: '1rem',
                    borderRadius: '12px',
                    marginBottom: '1.5rem',
                    border: '2px solid #fbbf24',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                  }}>
                    <div style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      padding: '0.75rem',
                      borderRadius: '12px',
                      fontSize: '2rem'
                    }}>
                      💚
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.875rem', color: '#92400e', fontWeight: '600', marginBottom: '0.25rem' }}>
                        Potential Impact
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#10b981' }}>
                        ~{getExpiringItems().reduce((total, item) => {
                          return total + calculateMeals(item.quantity, item.unit, item.name);
                        }, 0)} meals
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: '0.25rem' }}>
                        Prevention: ~{Math.round(getExpiringItems().reduce((total, item) => {
                          const pounds = item.unit === 'lbs' ? item.quantity : item.quantity * 0.5;
                          return total + (pounds * 3.8);
                        }, 0))} lbs CO₂
                      </div>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() => {
                      setItemsToDonate(getExpiringItems().map(i => i.id));
                      setShowDonationModal(true);
                    }}
                    style={{
                      width: '100%',
                      padding: '1.25rem 2rem',
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '16px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      fontSize: '1.1rem',
                      boxShadow: '0 4px 16px rgba(245, 158, 11, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.75rem',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(245, 158, 11, 0.5)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(245, 158, 11, 0.4)';
                    }}
                  >
                    <span style={{ fontSize: '1.5rem' }}>🎁</span>
                    Donate These Items to Food Banks
                    <span style={{ fontSize: '1.5rem' }}>→</span>
                  </button>

                  {/* Helper Text */}
                  <div style={{
                    marginTop: '1rem',
                    textAlign: 'center',
                    fontSize: '0.875rem',
                    color: '#b45309',
                    fontWeight: '500'
                  }}>
                    💡 Turn expiring food into community meals and help fight hunger
                  </div>
                </div>
              </div>
            )}

            {/* Food Bank Directory */}
            <div style={{ 
              background: cardBg, 
              padding: isMobile ? '1rem' : '2rem', 
              borderRadius: '16px', 
              marginBottom: isMobile ? '1rem' : '2rem' 
            }}>
              <h3 style={{ 
                margin: '0 0 1.5rem 0', 
                fontSize: isMobile ? '1.25rem' : '1.75rem' 
              }}>🏛️ Local Food Banks Near You</h3>
              <div style={{ display: 'grid', gap: '1rem' }}>
                {foodBanks.map(bank => (
                  <div
                    key={bank.id}
                    className="card-hover"
                    style={{
                      padding: isMobile ? '1rem' : '1.5rem',
                      background: '#f9fafb',
                      border: '2px solid #e5e7eb',
                      borderRadius: '12px',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      setSelectedFoodBank(bank);
                      setShowDonationModal(true);
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: isMobile ? 'column' : 'row',
                      justifyContent: 'space-between', 
                      alignItems: isMobile ? 'stretch' : 'start',
                      marginBottom: '1rem',
                      gap: isMobile ? '1rem' : '0'
                    }}>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ 
                          margin: '0 0 0.5rem 0', 
                          fontSize: isMobile ? '1.1rem' : '1.25rem', 
                          color: '#1f2937' 
                        }}>
                          {bank.name}
                        </h4>
                        <div style={{ 
                          color: '#6b7280', 
                          fontSize: isMobile ? '0.75rem' : '0.875rem' 
                        }}>
                          📍 {bank.address}, {bank.city}, {bank.state} {bank.zipCode}
                        </div>
                        <div style={{ 
                          color: '#6b7280', 
                          fontSize: isMobile ? '0.75rem' : '0.875rem', 
                          marginTop: '0.25rem' 
                        }}>
                          📞 {bank.phone}
                        </div>
                        <div style={{ 
                          color: '#6b7280', 
                          fontSize: isMobile ? '0.75rem' : '0.875rem', 
                          marginTop: '0.25rem' 
                        }}>
                          🕐 {bank.hours}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(bank.address + ', ' + bank.city + ', ' + bank.state)}`, '_blank');
                        }}
                        style={{
                          padding: isMobile ? '0.75rem' : '0.5rem 1rem',
                          background: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: isMobile ? '0.875rem' : '0.875rem',
                          width: isMobile ? '100%' : 'auto'
                        }}
                      >
                        🗺️ Directions
                      </button>
                    </div>

                    <div style={{ marginTop: '1rem' }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                        Accepted Items:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {bank.acceptedItems.map((item, idx) => (
                          <span key={idx} style={{
                            padding: '0.25rem 0.75rem',
                            background: '#dcfce7',
                            color: '#166534',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: '600'
                          }}>
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div style={{
                      marginTop: '1rem',
                      padding: '0.75rem',
                      background: '#f0fdf4',
                      borderRadius: '8px',
                      textAlign: 'center',
                      color: '#166534',
                      fontWeight: '600'
                    }}>
                      Click to record a donation
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Donation History */}
            {donationHistory.length > 0 && (
              <div style={{ background: cardBg, padding: '2rem', borderRadius: '16px' }}>
                <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.75rem' }}>📋 Donation History</h3>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {donationHistory.map(donation => (
                    <div
                      key={donation.id}
                      style={{
                        padding: '1.5rem',
                        background: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '1.1rem', color: '#1f2937' }}>
                            {donation.foodBank}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                            {new Date(donation.date).toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </div>
                        </div>
                        <div style={{
                          padding: '0.75rem 1rem',
                          background: '#dcfce7',
                          borderRadius: '12px',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#166534' }}>
                            {donation.totalMeals}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#166534' }}>meals</div>
                        </div>
                      </div>

                      <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                        Items Donated:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {donation.items.map((item, idx) => (
                          <span key={idx} style={{
                            padding: '0.5rem 0.75rem',
                            background: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            color: '#4b5563'
                          }}>
                            {item.quantity} {item.unit} {item.name} ({item.estimatedMeals} meals)
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {donationHistory.length === 0 && (
              <div style={{ 
                background: cardBg, 
                padding: '3rem', 
                borderRadius: '16px', 
                textAlign: 'center' 
              }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>❤️</div>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Start Making an Impact!</h3>
                <p style={{ color: mutedText, maxWidth: '500px', margin: '0 auto' }}>
                  Record your first donation to a local food bank and start tracking your impact.
                  Together we can fight hunger and reduce food waste!
                </p>
              </div>
            )}
          </div>
        )}
      </main>
      {showAddShopping && (
        <div 
          className="modal-backdrop"
          onClick={() => {
            setShowAddShopping(false);
            setNewShoppingItem({ name: '', quantity: 1, unit: 'pc', category: 'other' });
          }}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 2000
          }}
        >
        <div 
          onClick={(e) => e.stopPropagation()}
          style={{
            background: cardBg,
            borderRadius: isMobile ? '16px' : '20px',
            padding: isMobile ? '1rem' : '2rem',
            maxWidth: isMobile ? '95vw' : '500px',
            width: isMobile ? '95vw' : '90%',
            maxHeight: isMobile ? '85vh' : '90vh',
            overflow: 'auto',
            animation: 'scaleIn 0.3s ease-out',
            position: 'relative'
          }}
        >
            <button 
              onClick={() => {
                setShowAddShopping(false);
                setNewShoppingItem({ name: '', quantity: 1, unit: 'pc', category: 'other' });
              }}
              style={{
                position: 'absolute',
                top: isMobile ? '0.75rem' : '1rem',
                right: isMobile ? '0.75rem' : '1rem',
                background: '#f3f4f6',
                border: 'none',
                borderRadius: '50%',
                width: isMobile ? '36px' : '40px',
                height: isMobile ? '36px' : '40px',
                cursor: 'pointer',
                fontSize: isMobile ? '1.25rem' : '1.5rem'
              }}
            >
              ×
            </button>

            <h3 style={{ 
              margin: '0 0 1.5rem 0', 
              fontSize: isMobile ? '1.25rem' : '1.75rem', 
              fontWeight: '700' 
            }}>
              🛒 Add to Shopping List
            </h3>

            <div style={{ display: 'grid', gap: '1rem' }}>
              {/* Item Name */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                  Item Name
                </label>
                <input 
                  type="text" 
                  placeholder="e.g., Milk, Bread, Apples" 
                  value={newShoppingItem.name}
                  onChange={(e) => setNewShoppingItem({...newShoppingItem, name: e.target.value})}
                  onKeyPress={(e) => {
                  if (e.key === 'Enter' && newShoppingItem.name.trim()) {
                    const quantity = typeof newShoppingItem.quantity === 'number' ? newShoppingItem.quantity : 1;
                    const item: ShoppingItem = {
                      id: `${Date.now()}-${Math.random()}`,
                      name: newShoppingItem.name.trim(),
                      quantity: quantity,
                        unit: newShoppingItem.unit,
                        checked: false,
                        category: newShoppingItem.category,
                        priority: 'medium'
                      };
                      setShoppingList(prev => [...prev, item]);
                      success(`Added ${newShoppingItem.name} to shopping list!`);
                      setNewShoppingItem({ name: '', quantity: 1, unit: 'pc', category: 'other' });
                      setShowAddShopping(false);
                    }
                  }}
                  autoFocus
                  style={{ 
                    width: '100%',
                    padding: '0.75rem', 
                    border: '2px solid #e5e7eb', 
                    borderRadius: '8px',
                    fontSize: '1rem',
                    boxSizing: 'border-box'
                  }} 
                />
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  💡 Press Enter to quickly add
                </div>
              </div>

              {/* Quantity and Unit */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                    Quantity
                  </label>
                  <input 
                    type="number" 
                    min="1" 
                    value={newShoppingItem.quantity}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setNewShoppingItem({...newShoppingItem, quantity: '' as any});
                      } else {
                        setNewShoppingItem({...newShoppingItem, quantity: Math.max(1, parseInt(val) || 1)});
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value === '' || parseInt(e.target.value) < 1) {
                        setNewShoppingItem({...newShoppingItem, quantity: 1});
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '0.75rem', 
                      border: '2px solid #e5e7eb', 
                      borderRadius: '8px',
                      fontSize: '1rem',
                      boxSizing: 'border-box'
                    }} 
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                    Unit
                  </label>
                  <select 
                    value={newShoppingItem.unit} 
                    onChange={(e) => setNewShoppingItem({...newShoppingItem, unit: e.target.value})}
                    style={{ 
                      width: '100%',
                      padding: '0.75rem', 
                      border: '2px solid #e5e7eb', 
                      borderRadius: '8px',
                      fontSize: '1rem',
                      cursor: 'pointer',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="pc">pieces</option>
                    <option value="lbs">lbs</option>
                    <option value="kg">kg</option>
                    <option value="cups">cups</option>
                    <option value="oz">oz</option>
                    <option value="g">grams</option>
                    <option value="bottles">bottles</option>
                    <option value="cans">cans</option>
                    <option value="boxes">boxes</option>
                  </select>
                </div>
              </div>

              {/* Category */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                  Category
                </label>
                <select 
                  value={newShoppingItem.category} 
                  onChange={(e) => setNewShoppingItem({...newShoppingItem, category: e.target.value})}
                  style={{ 
                    width: '100%',
                    padding: '0.75rem', 
                    border: '2px solid #e5e7eb', 
                    borderRadius: '8px',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="produce">🥬 Produce</option>
                  <option value="dairy">🥛 Dairy</option>
                  <option value="meat">🍖 Meat</option>
                  <option value="frozen">🧊 Frozen</option>
                  <option value="pantry">🏺 Pantry</option>
                  <option value="beverages">🥤 Beverages</option>
                  <option value="snacks">🍿 Snacks</option>
                  <option value="bakery">🥖 Bakery</option>
                  <option value="other">📦 Other</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button
                onClick={async() => {
                  setShowAddShopping(false);
                  setNewShoppingItem({ name: '', quantity: 1, unit: 'pc', category: 'other' });
                }}
                style={{
                  flex: 1,
                  padding: '1rem',
                  background: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem'
                }}
              >
                Cancel
              </button>

              <button
                onClick={async () => {
                  if (!newShoppingItem.name.trim()) {
                    warning('Please enter an item name');
                    return;
                  }

                  const quantity = typeof newShoppingItem.quantity === 'number' ? newShoppingItem.quantity : 1;
                  try {
                    const savedItem = await shoppingService.add({
                      name: newShoppingItem.name.trim(),
                      quantity: quantity,
                      unit: newShoppingItem.unit,
                      category: newShoppingItem.category,
                      checked: false,
                      priority: 'medium'
                    });

                    setShoppingList(prev => [...prev, {
                      id: savedItem.id,
                      name: savedItem.name,
                      quantity: savedItem.quantity,
                      unit: savedItem.unit,
                      category: savedItem.category,
                      checked: savedItem.checked,
                      priority: savedItem.priority as 'high' | 'medium' | 'low'
                    }]);

                    success(`Added ${newShoppingItem.name} to shopping list!`);
                  } catch (error) {
                    console.error('Error adding shopping item:', error);
                    warning('Failed to add item');
                  }
                  setNewShoppingItem({ name: '', quantity: 1, unit: 'pc', category: 'other' });
                  setShowAddShopping(false);
                }}
                disabled={!newShoppingItem.name.trim()}
                style={{
                  flex: 1,
                  padding: '1rem',
                  background: !newShoppingItem.name.trim() 
                    ? '#9ca3af' 
                    : 'linear-gradient(45deg, #10b981, #059669)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: !newShoppingItem.name.trim() ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem'
                }}
              >
                ➕ Add to List
              </button>
            </div>

            {/* Tip */}
            <div style={{
              marginTop: '1.5rem',
              padding: '1rem',
              background: '#f0f9ff',
              borderRadius: '8px',
              border: '1px solid #bfdbfe'
            }}>
              <div style={{ fontSize: '0.875rem', color: '#1e40af' }}>
                <strong>💡 Pro Tip:</strong> You can also add items by generating recipes and clicking "Add to Shopping"!
              </div>
            </div>
          </div>
        </div>
      )}
      {showDetailedView && selectedRecipe && (
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
              {selectedRecipe.name}
            </h2>

            <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
              {selectedRecipe.difficulty && <span style={{ fontSize: '1.1rem' }}>⚡ {selectedRecipe.difficulty}</span>}
              {selectedRecipe.servings && <span style={{ fontSize: '1.1rem' }}>👥 {selectedRecipe.servings} servings</span>}
              {selectedRecipe.prep_time && <span style={{ fontSize: '1.1rem' }}>⏱️ Prep: {selectedRecipe.prep_time}</span>}
              {selectedRecipe.cook_time && <span style={{ fontSize: '1.1rem' }}>🔥 Cook: {selectedRecipe.cook_time}</span>}
            </div>

            {selectedRecipe.nutrition && (
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '600', borderBottom: '2px solid #10b981', paddingBottom: '0.5rem' }}>
                  📊 Nutrition Facts (per serving)
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                  {Object.entries(selectedRecipe.nutrition).map(([key, val]) => (
                    <div key={key} style={{ textAlign: 'center', padding: '1rem', background: '#f0fdf4', borderRadius: '12px' }}>
                      <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#10b981' }}>
                        {val}{key !== 'calories' && key !== 'sodium' ? 'g' : key === 'sodium' ? 'mg' : ''}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: mutedText, textTransform: 'capitalize' }}>{key}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '600', borderBottom: '2px solid #10b981', paddingBottom: '0.5rem' }}>
                📝 Ingredients
              </h3>
              <div style={{ 
                background: '#f0fdf4', 
                padding: '1.5rem', 
                borderRadius: '12px', 
                marginTop: '1rem',
                fontSize: '0.95rem'
              }}>
                <div style={{ 
                  background: '#dcfce7', 
                  padding: '0.75rem', 
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  border: '1px solid #86efac'
                }}>
                  <div style={{ fontSize: '0.875rem', color: '#166534', fontWeight: '600' }}>
                    💡 Tip: Click highlighted ingredients to find substitutions!
                  </div>
                </div>
                {(typeof selectedRecipe.ingredients === 'string' 
                  ? selectedRecipe.ingredients.split('\n') 
                  : selectedRecipe.ingredients
                ).map((line, idx) => {
                    // Parse ingredient from line
                  const match = line.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)\s+(.+)$/);
                  
                  if (match) {
                    const [, quantity, unit, name] = match;
                    const cleanName = name.trim().toLowerCase()
                      .replace(/\b(fresh|dried|raw|cooked|minced|chopped|diced|sliced|grated)\b/g, '')
                      .trim();
                    
                    // Check if substitutions exist for this ingredient
                    const commonIngredients = [
                      'chicken', 'beef', 'pork', 'fish', 'salmon', 'shrimp', 'turkey',
                      'milk', 'butter', 'cheese', 'cream', 'yogurt', 'egg',
                      'rice', 'pasta', 'flour', 'bread', 'noodle',
                      'sugar', 'honey', 'syrup',
                      'oil', 'olive', 'coconut', 'avocado',
                      'potato', 'tomato', 'cauliflower', 'mushroom',
                      'tofu', 'tempeh', 'seitan'
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
                            {quantity} {unit}
                          </span>
                          {' '}
                          <span style={{ color: '#166534' }}>{name}</span>
                          <span style={{ 
                            float: 'right', 
                            color: '#10b981',
                            fontSize: '0.875rem',
                            opacity: 0.8
                          }}>
                            🔄 Click to substitute
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
                            {quantity} {unit}
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
                })}
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '600', borderBottom: '2px solid #10b981', paddingBottom: '0.5rem' }}>
                👨‍🍳 Instructions
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
                        <strong>Step {idx + 1}:</strong> {step}
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
                  💚 Health Benefits
                </h3>
                <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '12px', marginTop: '1rem', color: '#166534' }}>
                  {selectedRecipe.health_benefits}
                </div>
              </div>
            )}

            {selectedRecipe.budget_tip && (
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '600', borderBottom: '2px solid #10b981', paddingBottom: '0.5rem' }}>
                  💰 Money-Saving Tip
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
              }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showImageUpload && (
        <div 
          className="modal-backdrop"
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 1000
          }}
        >
          <div style={{ 
            background: cardBg, 
            padding: isMobile ? '1rem' : '2rem', 
            borderRadius: isMobile ? '12px' : '16px', 
            maxWidth: isMobile ? '95vw' : '500px', 
            width: isMobile ? '95vw' : '90%',
            animation: 'scaleIn 0.3s ease-out'
          }}>
            <h3 style={{ 
              marginTop: 0,
              fontSize: isMobile ? '1.25rem' : '1.5rem'
            }}>
              📷 AI {cameraSource === 'pantry' ? 'Pantry' : 'Ingredient'} Scanner
            </h3>
            <p style={{ color: mutedText }}>
              {cameraSource === 'pantry' 
                ? 'Take a photo of items to add to your pantry'
                : 'Take a photo or upload an image of ingredients'
              }
            </p>
            
            {recipeLoading && (
              <div style={{ 
                textAlign: 'center', 
                padding: '2rem',
                background: '#f0f9ff',
                borderRadius: '12px',
                marginBottom: '1rem'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🤖</div>
                <div style={{ fontWeight: '600', color: '#1e40af' }}>Analyzing image with AI...</div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
                  This may take a few seconds
                </div>
              </div>
            )}

            {/* CAMERA BUTTON - Opens actual webcam */}
            <button
              onClick={handleCameraCapture}
              disabled={recipeLoading}
              style={{
                display: 'block', width: '100%', padding: '1rem', background: '#8b5cf6',
                color: 'white', borderRadius: '8px', textAlign: 'center', cursor: 'pointer',
                fontWeight: '600', marginBottom: '0.5rem', border: 'none',
                opacity: recipeLoading ? 0.5 : 1,
                pointerEvents: recipeLoading ? 'none' : 'auto'
              }}
            >
              📸 Use Camera
            </button>
                        
            {/* FILE UPLOAD BUTTON - Opens file picker */}
            <label style={{
              display: 'block', width: '100%', padding: '1rem', background: '#6366f1',
              color: 'white', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', 
              fontWeight: '600',
              opacity: recipeLoading ? 0.5 : 1,
              pointerEvents: recipeLoading ? 'none' : 'auto'
            }}>
              🖼️ Upload Image
              <input 
                type="file" 
                accept="image/*"
                onChange={handleImageUpload}
                disabled={recipeLoading}
                style={{ display: 'none' }} 
              />
            </label>
            
            <button 
              onClick={() => setShowImageUpload(false)} 
              disabled={recipeLoading}
              style={{
                width: '100%', padding: '0.75rem', background: '#f3f4f6', marginTop: '0.5rem',
                border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600',
                opacity: recipeLoading ? 0.5 : 1
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showCalorieTracker && (
        <div 
          className="modal-backdrop"
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 1000
          }}
        >
          <div style={{ 
            background: cardBg, 
            padding: '2rem', 
            borderRadius: '16px', 
            maxWidth: '400px', 
            width: '90%',
            animation: 'scaleIn 0.3s ease-out'
          }}>
            <h3>📊 Daily Calorie Tracker</h3>
            <div style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '12px', marginBottom: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: '700', color: todayCalories > dailyCalorieGoal ? '#dc2626' : '#10b981' }}>
                {todayCalories}
              </div>
              <div style={{ color: mutedText }}>/ {dailyCalorieGoal} cal goal</div>
              <div style={{ width: '100%', height: '8px', background: '#e5e7eb', borderRadius: '4px', marginTop: '1rem', overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min((todayCalories / dailyCalorieGoal) * 100, 100)}%`, height: '100%',
                  background: todayCalories > dailyCalorieGoal ? '#dc2626' : '#10b981', transition: 'width 0.5s'
                }} />
              </div>
            </div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Daily Goal</label>
            <input type="number" value={dailyCalorieGoal} onChange={(e) => setDailyCalorieGoal(Number(e.target.value))}
              style={{ width: '100%', padding: '0.75rem', border: '2px solid #e5e7eb', borderRadius: '8px', marginBottom: '1rem', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => setTodayCalories(0)} style={{
                flex: 1, padding: '0.75rem', background: '#ef4444', color: 'white',
                border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600'
              }}>Reset</button>
              <button onClick={() => setShowCalorieTracker(false)} style={{
                flex: 1, padding: '0.75rem', background: '#10b981', color: 'white',
                border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600'
              }}>Close</button>
            </div>
          </div>
        </div>
      )}
      {/* Donation Modal */}
      {showDonationModal && (
        <div 
          className="modal-backdrop"
          onClick={() => {
            setShowDonationModal(false);
            setSelectedFoodBank(null);
            setItemsToDonate([]);
          }}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 2000, padding: '2rem'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: cardBg,
              borderRadius: '20px',
              padding: '2rem',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              animation: 'scaleIn 0.3s ease-out'
            }}
          >
            <button 
              onClick={() => {
                setShowDonationModal(false);
                setSelectedFoodBank(null);
                setItemsToDonate([]);
              }}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: '#f3f4f6',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                cursor: 'pointer',
                fontSize: '1.5rem'
              }}
            >
              ×
            </button>

            <h2 style={{ marginBottom: '1rem', fontSize: '2rem', fontWeight: '700' }}>
              🎁 Record Donation
            </h2>

            {selectedFoodBank && (
              <div style={{
                background: '#f0f9ff',
                padding: '1rem',
                borderRadius: '12px',
                marginBottom: '1.5rem',
                border: '1px solid #bfdbfe'
              }}>
                <div style={{ fontWeight: '600', color: '#1e40af', marginBottom: '0.5rem' }}>
                  Donating to:
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1f2937' }}>
                  {selectedFoodBank.name}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  {selectedFoodBank.address}, {selectedFoodBank.city}
                </div>
              </div>
            )}

            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
                Select Items to Donate:
              </h3>
              
              {pantry.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '2rem',
                  background: '#f9fafb',
                  borderRadius: '12px',
                  color: '#6b7280'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📦</div>
                  <p>Your pantry is empty. Add items to donate them!</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '0.75rem', maxHeight: '300px', overflow: 'auto' }}>
                  {pantry.map(item => {
                    const isSelected = itemsToDonate.includes(item.id);
                    const isExpiring = getExpiringItems().some(e => e.id === item.id);
                    
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (isSelected) {
                            setItemsToDonate(prev => prev.filter(id => id !== item.id));
                          } else {
                            setItemsToDonate(prev => [...prev, item.id]);
                          }
                        }}
                        style={{
                          padding: '1rem',
                          background: isSelected ? '#dcfce7' : '#f9fafb',
                          border: `2px solid ${isSelected ? '#10b981' : '#e5e7eb'}`,
                          borderRadius: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            style={{
                              width: '20px',
                              height: '20px',
                              cursor: 'pointer'
                            }}
                          />
                          <div>
                            <div style={{ fontWeight: '600', color: '#1f2937' }}>
                              {item.name}
                            </div>
                            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                              {item.quantity} {item.unit}
                              {isExpiring && (
                                <span style={{ 
                                  marginLeft: '0.5rem',
                                  color: '#dc2626',
                                  fontWeight: '600'
                                }}>
                                  ⚠️ Expiring soon
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div style={{
                          padding: '0.5rem 0.75rem',
                          background: isSelected ? '#10b981' : '#e5e7eb',
                          color: isSelected ? 'white' : '#6b7280',
                          borderRadius: '8px',
                          fontSize: '0.875rem',
                          fontWeight: '600'
                        }}>
                          ~{calculateMeals(item.quantity, item.unit, item.name)} meals
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Summary */}
            {itemsToDonate.length > 0 && (
              <div style={{
                background: '#f0fdf4',
                padding: '1.5rem',
                borderRadius: '12px',
                marginBottom: '1.5rem',
                border: '2px solid #86efac'
              }}>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#166534' }}>
                  📊 Donation Impact
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: '#10b981' }}>
                      {pantry
                        .filter(item => itemsToDonate.includes(item.id))
                        .reduce((total, item) => total + calculateMeals(item.quantity, item.unit, item.name), 0)}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#166534' }}>
                      Estimated Meals
                    </div>
                  </div>
                  
                  <div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: '#10b981' }}>
                      {itemsToDonate.length}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#166534' }}>
                      Items Selected
                    </div>
                  </div>
                </div>

                <div style={{
                  marginTop: '1rem',
                  padding: '0.75rem',
                  background: 'white',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  color: '#166534'
                }}>
                  <strong>Environmental Impact:</strong> Preventing ~
                  {Math.round(pantry
                    .filter(item => itemsToDonate.includes(item.id))
                    .reduce((total, item) => {
                      const pounds = item.unit === 'lbs' ? item.quantity : item.quantity * 0.5;
                      return total + (pounds * 3.8);
                    }, 0))} lbs of CO₂ emissions
                </div>
              </div>
            )}

            {/* Food Bank Selection (if not pre-selected) */}
            {!selectedFoodBank && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>
                  Select Food Bank:
                </h4>
                <select
                  onChange={(e) => {
                    const bank = foodBanks.find(b => b.id === e.target.value);
                    if (bank) setSelectedFoodBank(bank);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">Choose a food bank...</option>
                  {foodBanks.map(bank => (
                    <option key={bank.id} value={bank.id}>
                      {bank.name} - {bank.city}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => {
                  setShowDonationModal(false);
                  setSelectedFoodBank(null);
                  setItemsToDonate([]);
                }}
                style={{
                  flex: 1,
                  padding: '1rem',
                  background: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem'
                }}
              >
                Cancel
              </button>
              
              <button 
                onClick={async () => {
                  if (!selectedFoodBank || itemsToDonate.length === 0) {
                    warning('Please select a food bank and items to donate');
                    return;
                  }
                  
                  const itemsToDonateFull = pantry.filter(item => 
                    itemsToDonate.includes(item.id)
                  );
                  
                  await handleDonation(selectedFoodBank, itemsToDonateFull);
                }}
                disabled={!selectedFoodBank || itemsToDonate.length === 0}
                style={{
                  padding: '1rem',
                  background: (!selectedFoodBank || itemsToDonate.length === 0) 
                    ? '#9ca3af' 
                    : 'linear-gradient(45deg, #ec4899, #8b5cf6)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: (!selectedFoodBank || itemsToDonate.length === 0) 
                    ? 'not-allowed' 
                    : 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem'
                }}
              >
                🎁 Record Donation
              </button>
            </div>

            {/* Tax Receipt Info */}
            <div style={{
              marginTop: '1.5rem',
              padding: '1rem',
              background: '#fef3c7',
              borderRadius: '8px',
              border: '1px solid #fbbf24'
            }}>
              <div style={{ fontSize: '0.875rem', color: '#92400e' }}>
                <strong>💡 Tax Tip:</strong> Food donations are tax-deductible! Keep records of your donations for tax purposes. Most food banks are 501(c)(3) organizations.
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Mission Statement Popup */}
      {showMissionPopup && (
        <div 
          className="modal-backdrop"
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 3000, 
            padding: isMobile ? '1rem' : '2rem'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: isMobile ? '16px' : '24px',
              padding: isMobile ? '1.5rem' : '3rem',
              maxWidth: isMobile ? '95vw' : '700px',
              width: '100%',
              maxHeight: isMobile ? '95vh' : '90vh',
              overflow: 'auto',
              animation: 'scaleIn 0.4s ease-out',
              position: 'relative'
            }}
          >
            {/* Hero Section */}
            <div style={{ textAlign: 'center', marginBottom: isMobile ? '1.5rem' : '2rem' }}>
              <div style={{ fontSize: isMobile ? '3rem' : '4rem', marginBottom: isMobile ? '0.5rem' : '1rem' }}>👨‍🍳❤️</div>
              <h1 style={{ 
                margin: '0 0 1rem 0', 
                fontSize: isMobile ? '1.75rem' : '2.5rem', 
                fontWeight: '800',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                Welcome to GroceryGenius
              </h1>
              <p style={{ 
                fontSize: isMobile ? '1rem' : '1.25rem', 
                color: '#6b7280', 
                fontWeight: '500',
                lineHeight: '1.6'
              }}>
                AI-Powered Meal Planning That Fights Hunger
              </p>
            </div>

            {/* Mission Statement */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: isMobile ? '1.25rem' : '2rem',
              borderRadius: isMobile ? '12px' : '16px',
              color: 'white',
              marginBottom: isMobile ? '1.5rem' : '2rem'
            }}>
              <h2 style={{ 
                margin: '0 0 1rem 0', 
                fontSize: isMobile ? '1.25rem' : '1.5rem' 
              }}>Our Mission</h2>
              <p style={{ 
                fontSize: isMobile ? '0.875rem' : '1.1rem', 
                lineHeight: '1.8', 
                margin: 0, 
                opacity: 0.95 
              }}>
                We're on a mission to end food waste and fight hunger. GroceryGenius helps you plan meals, 
                use what you have, and donate surplus food to those in need. Every expiring item becomes 
                an opportunity to feed families in your community.
              </p>
            </div>

            {/* Impact Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
              gap: isMobile ? '0.75rem' : '1rem',
              marginBottom: isMobile ? '1.5rem' : '2rem'
            }}>
              <div style={{ 
                textAlign: 'center', 
                padding: isMobile ? '0.75rem' : '1rem', 
                background: '#f0fdf4', 
                borderRadius: '12px' 
              }}>
                <div style={{ 
                  fontSize: isMobile ? '1.5rem' : '2rem', 
                  fontWeight: '700', 
                  color: '#10b981' 
                }}>42M</div>
                <div style={{ 
                  fontSize: isMobile ? '0.75rem' : '0.875rem', 
                  color: '#166534', 
                  fontWeight: '600' 
                }}>Americans Face Hunger</div>
              </div>
              <div style={{ 
                textAlign: 'center', 
                padding: isMobile ? '0.75rem' : '1rem', 
                background: '#fef3c7', 
                borderRadius: '12px' 
              }}>
                <div style={{ 
                  fontSize: isMobile ? '1.5rem' : '2rem', 
                  fontWeight: '700', 
                  color: '#f59e0b' 
                }}>40%</div>
                <div style={{ 
                  fontSize: isMobile ? '0.75rem' : '0.875rem', 
                  color: '#92400e', 
                  fontWeight: '600' 
                }}>Food Wasted Yearly</div>
              </div>
              <div style={{ 
                textAlign: 'center', 
                padding: isMobile ? '0.75rem' : '1rem', 
                background: '#dbeafe', 
                borderRadius: '12px' 
              }}>
                <div style={{ 
                  fontSize: isMobile ? '1.5rem' : '2rem', 
                  fontWeight: '700', 
                  color: '#3b82f6' 
                }}>8%</div>
                <div style={{ 
                  fontSize: isMobile ? '0.75rem' : '0.875rem', 
                  color: '#1e40af', 
                  fontWeight: '600' 
                }}>Global Emissions</div>
              </div>
            </div>

            {/* How to Use */}
            <div style={{ marginBottom: isMobile ? '1.5rem' : '2rem' }}>
              <h3 style={{ 
                fontSize: isMobile ? '1.25rem' : '1.5rem', 
                marginBottom: '1rem', 
                color: '#1f2937' 
              }}>
                Quick Start Guide
              </h3>
              
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'start' }}>
                  <div style={{
                    background: '#10b981',
                    color: 'white',
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    fontSize: '1.25rem',
                    flexShrink: 0
                  }}>1</div>
                  <div>
                    <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '0.25rem' }}>
                      📦 Add to Pantry
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: '1.5' }}>
                      Track what you have at home. Use the camera to scan items or add manually.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'start' }}>
                  <div style={{
                    background: '#10b981',
                    color: 'white',
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    fontSize: '1.25rem',
                    flexShrink: 0
                  }}>2</div>
                  <div>
                    <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '0.25rem' }}>
                      🍳 Generate Recipes
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: '1.5' }}>
                      AI creates personalized recipes using your ingredients. Includes nutrition info and substitutions.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'start' }}>
                  <div style={{
                    background: '#10b981',
                    color: 'white',
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    fontSize: '1.25rem',
                    flexShrink: 0
                  }}>3</div>
                  <div>
                    <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '0.25rem' }}>
                      🛒 Smart Shopping
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: '1.5' }}>
                      Auto-generate shopping lists from recipes. Compare prices and find deals.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'start' }}>
                  <div style={{
                    background: '#ec4899',
                    color: 'white',
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    fontSize: '1.25rem',
                    flexShrink: 0
                  }}>4</div>
                  <div>
                    <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '0.25rem' }}>
                      ❤️ Donate & Make Impact
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: '1.5' }}>
                      Food about to expire? Donate to local food banks and track your social impact!
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={() => {
                setShowMissionPopup(false);
                localStorage.setItem('hasSeenMission', 'true');
              }}
              style={{
                width: '100%',
                padding: isMobile ? '1rem' : '1.25rem',
                background: 'linear-gradient(45deg, #10b981, #059669)',
                color: 'white',
                border: 'none',
                borderRadius: isMobile ? '12px' : '16px',
                fontWeight: '700',
                fontSize: isMobile ? '1rem' : '1.25rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
              }}
            >
              Let's Get Started! 🚀
            </button>

            <div style={{
              textAlign: 'center',
              marginTop: '1rem',
              fontSize: '0.875rem',
              color: '#9ca3af'
            }}>
              You can always view this again from the app
            </div>
          </div>
        </div>
      )}
      {/* Demo Mode Confirmation */}
      {showDemoConfirm && (
        <div 
          className="modal-backdrop"
          onClick={() => setShowDemoConfirm(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 2500
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: cardBg,
              borderRadius: '20px',
              padding: '2rem',
              maxWidth: '500px',
              width: '90%',
              animation: 'scaleIn 0.3s ease-out'
            }}
          >
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.75rem' }}>🎬 Demo Mode</h3>
            <p style={{ color: mutedText, marginBottom: '2rem', lineHeight: '1.6' }}>
              Load demo data to showcase the app's features with impressive donation statistics. 
              Perfect for demonstrations!
            </p>

            <div style={{
              background: '#f0fdf4',
              padding: '1rem',
              borderRadius: '12px',
              marginBottom: '2rem',
              border: '1px solid #86efac'
            }}>
              <div style={{ fontSize: '0.875rem', color: '#166534', fontWeight: '600', marginBottom: '0.5rem' }}>
                Demo data includes:
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#166534', fontSize: '0.875rem' }}>
                <li>427 meals donated across 23 donations</li>
                <li>112 lbs of food saved</li>
                <li>425 lbs of CO₂ prevented</li>
                <li>Sample pantry items and donation history</li>
              </ul>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => setShowDemoConfirm(false)}
                style={{
                  flex: 1,
                  padding: '1rem',
                  background: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Cancel
              </button>
              <button
                onClick={loadDemoData}
                style={{
                  flex: 1,
                  padding: '1rem',
                  background: 'linear-gradient(45deg, #8b5cf6, #6366f1)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Load Demo Data
              </button>
            </div>

            {(pantry.length > 0 || donationHistory.length > 0) && (
              <button
                onClick={clearDemoData}
                style={{
                  width: '100%',
                  marginTop: '1rem',
                  padding: '0.75rem',
                  background: '#fee2e2',
                  color: '#dc2626',
                  border: '1px solid #dc2626',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.875rem'
                }}
              >
                Clear All Data
              </button>
            )}
          </div>
        </div>
      )}
      {/* Share Impact Modal */}
      {showShareModal && (
        <div 
          className="modal-backdrop"
          onClick={() => setShowShareModal(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 2500
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: cardBg,
              borderRadius: '20px',
              padding: '2rem',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto',
              animation: 'scaleIn 0.3s ease-out',
              position: 'relative'
            }}
          >
            <button 
              onClick={() => setShowShareModal(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: '#f3f4f6',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                cursor: 'pointer',
                fontSize: '1.5rem'
              }}
            >
              ×
            </button>

            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.75rem' }}>📱 Share Your Impact</h3>
            
            <div style={{
              background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
              padding: '2rem',
              borderRadius: '16px',
              color: 'white',
              marginBottom: '2rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                {donationImpact.totalMeals}
              </div>
              <div style={{ fontSize: '1.25rem', opacity: 0.95 }}>
                Meals Donated
              </div>
              <div style={{ 
                marginTop: '1rem', 
                fontSize: '0.9rem', 
                opacity: 0.9,
                borderTop: '1px solid rgba(255,255,255,0.3)',
                paddingTop: '1rem'
              }}>
                {Math.round(donationImpact.totalPounds)} lbs food saved • {Math.round(donationImpact.co2Saved)} lbs CO₂ prevented
              </div>
            </div>

            <p style={{ 
              color: mutedText, 
              marginBottom: '2rem', 
              lineHeight: '1.6',
              textAlign: 'center'
            }}>
              Inspire others to join the fight against hunger! Share your impact on social media.
            </p>

            {/* Preview */}
            <div style={{
              background: '#f9fafb',
              padding: '1rem',
              borderRadius: '12px',
              marginBottom: '2rem',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.5rem', fontWeight: '600' }}>
                PREVIEW:
              </div>
              <div style={{ fontSize: '0.875rem', color: '#4b5563', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                {generateShareText()}
              </div>
            </div>

            {/* Share Options */}
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <button
                onClick={() => shareImpact('twitter')}
                style={{
                  padding: '1rem',
                  background: '#1DA1F2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                🐦 Share on Twitter
              </button>

              <button
                onClick={() => shareImpact('facebook')}
                style={{
                  padding: '1rem',
                  background: '#4267B2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                👥 Share on Facebook
              </button>

              <button
                onClick={() => shareImpact('copy')}
                style={{
                  padding: '1rem',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                📋 Copy to Clipboard
              </button>
            </div>

            <div style={{
              marginTop: '1.5rem',
              padding: '1rem',
              background: '#f0f9ff',
              borderRadius: '8px',
              border: '1px solid #bfdbfe',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.875rem', color: '#1e40af' }}>
                <strong>💡 Tip:</strong> Sharing your impact encourages others to donate and helps grow the movement!
              </div>
            </div>
          </div>
        </div>
      )}
      {showSubstitution && selectedIngredient && (
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
              
              success(`Substituted ${selectedIngredient.name} with ${newName}!`);
            }
            setShowSubstitution(false);
            setSelectedIngredient(null);
          }}
          onClose={() => {
            setShowSubstitution(false);
            setSelectedIngredient(null);
          }}
        />
      )}
      <div style={{ position: 'fixed', bottom: '1rem', right: '1rem', zIndex: 10000, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default App;