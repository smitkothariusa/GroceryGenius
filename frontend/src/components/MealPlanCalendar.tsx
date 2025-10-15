import React, { useState, useEffect } from 'react';

interface Recipe {
  id: string;
  name: string;
  ingredients: string;
  instructions: string;
  prep_time?: string;
  servings?: number;
  nutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface MealPlan {
  id: string;
  date: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipe?: Recipe;
  servings: number;
  notes?: string;
  completed: boolean;
}

interface ParsedIngredient {
  name: string;
  quantity: number;
  unit: string;
}

interface MealPlanCalendarProps {
  onAddToShoppingList?: (items: ParsedIngredient[]) => void;
}

const MealPlanCalendar: React.FC<MealPlanCalendarProps> = ({ onAddToShoppingList }) => {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getWeekStart(new Date()));
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; mealType: string } | null>(null);
  const [showRecipePicker, setShowRecipePicker] = useState(false);
  const [draggedRecipe, setDraggedRecipe] = useState<Recipe | null>(null);

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];

  function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  }

  function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  // Load meal plans and recipes
  useEffect(() => {
    const savedMealPlans = localStorage.getItem('mealPlans');
    if (savedMealPlans) {
      setMealPlans(JSON.parse(savedMealPlans));
    }

    const savedFavorites = localStorage.getItem('favorites');
    if (savedFavorites) {
      const favorites = JSON.parse(savedFavorites);
      const recipes = favorites.map((fav: any) => ({
        id: fav.id,
        name: fav.name,
        ingredients: fav.ingredients,
        instructions: fav.instructions,
        prep_time: fav.prep_time,
        servings: fav.servings,
        nutrition: fav.nutrition
      }));
      setSavedRecipes(recipes);
    }
  }, [currentWeekStart]);

  // Save meal plans to localStorage
  useEffect(() => {
    localStorage.setItem('mealPlans', JSON.stringify(mealPlans));
  }, [mealPlans]);

  const getMealForSlot = (date: string, mealType: string): MealPlan | undefined => {
    return mealPlans.find(m => m.date === date && m.meal_type === mealType);
  };

  const handleDragStart = (recipe: Recipe) => {
    setDraggedRecipe(recipe);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (date: string, mealType: string) => {
    if (draggedRecipe) {
      const newMeal: MealPlan = {
        id: `${Date.now()}`,
        date,
        meal_type: mealType as any,
        recipe: draggedRecipe,
        servings: draggedRecipe.servings || 2,
        completed: false
      };
      setMealPlans([...mealPlans, newMeal]);
      setDraggedRecipe(null);
    }
  };

  const handleSlotClick = (date: string, mealType: string) => {
    const existing = getMealForSlot(date, mealType);
    if (!existing) {
      setSelectedSlot({ date, mealType });
      setShowRecipePicker(true);
    }
  };

  const handleRecipeSelect = (recipe: Recipe) => {
    if (selectedSlot) {
      const newMeal: MealPlan = {
        id: `${Date.now()}`,
        date: selectedSlot.date,
        meal_type: selectedSlot.mealType as any,
        recipe,
        servings: recipe.servings || 2,
        completed: false
      };
      setMealPlans([...mealPlans, newMeal]);
      setShowRecipePicker(false);
      setSelectedSlot(null);
    }
  };

  const handleDeleteMeal = (mealId: string) => {
    setMealPlans(mealPlans.filter(m => m.id !== mealId));
  };

  const handleToggleComplete = (mealId: string) => {
    setMealPlans(mealPlans.map(m => 
      m.id === mealId ? { ...m, completed: !m.completed } : m
    ));
  };

  const calculateWeekStats = () => {
    let totalCalories = 0;
    let totalProtein = 0;
    let mealsPlanned = 0;

    mealPlans.forEach(meal => {
      if (meal.recipe?.nutrition) {
        totalCalories += meal.recipe.nutrition.calories;
        totalProtein += meal.recipe.nutrition.protein;
        mealsPlanned++;
      }
    });

    return { totalCalories, totalProtein, mealsPlanned, avgCaloriesPerDay: Math.round(totalCalories / 7) };
  };

  const stats = calculateWeekStats();

    const generateWeekShoppingList = () => {
        console.log('🔍 Generate shopping list clicked');
        console.log('📋 Meal plans:', mealPlans);
        
        if (mealPlans.length === 0) {
            alert('📅 No meals planned this week! Add some recipes to your meal plan first.');
            return;
        }

        const ingredientMap = new Map<string, ParsedIngredient>();
        
        mealPlans.forEach(meal => {
            console.log('🍽️ Processing meal:', meal);
            if (meal.recipe) {
            const lines = meal.recipe.ingredients.split('\n');
            console.log('📝 Ingredient lines:', lines);
            
            lines.forEach(line => {
                const match = line.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)\s+(.+)$/);
                
                if (match) {
                const [, quantityStr, unit, name] = match;
                const quantity = parseFloat(quantityStr);
                const cleanName = name.trim().toLowerCase();
                
                if (ingredientMap.has(cleanName)) {
                    const existing = ingredientMap.get(cleanName)!;
                    if (existing.unit === unit.toLowerCase()) {
                    existing.quantity += quantity;
                    } else {
                    ingredientMap.set(`${cleanName} (${unit})`, {
                        name: cleanName,
                        quantity,
                        unit: unit.toLowerCase()
                    });
                    }
                } else {
                    ingredientMap.set(cleanName, {
                    name: cleanName,
                    quantity,
                    unit: unit.toLowerCase()
                    });
                }
                } else {
                const cleanLine = line.trim().toLowerCase();
                if (cleanLine && cleanLine.length > 2) {
                    ingredientMap.set(cleanLine, {
                    name: cleanLine,
                    quantity: 1,
                    unit: 'pc'
                    });
                }
                }
            });
        }
    });

  const items = Array.from(ingredientMap.values());
  console.log('🛒 Parsed items:', items);
  console.log('✅ Has callback?', !!onAddToShoppingList);

  if (ingredientMap.size === 0) {
    alert('📋 No ingredients found in your meal plans!');
    return;
  }
  
  if (onAddToShoppingList) {
    console.log('🚀 Calling callback with items:', items);
    onAddToShoppingList(items);
  } else {
    console.log('❌ No callback provided!');
    const summary = items.map(ing => `• ${ing.quantity} ${ing.unit} ${ing.name}`).join('\n');
    alert(`📋 Shopping List (${items.length} items):\n\n${summary}`);
  }
    };

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: '700' }}>📅 Weekly Meal Plan</h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))} style={{
              padding: '0.5rem 1rem', background: '#f3f4f6', border: 'none',
              borderRadius: '8px', cursor: 'pointer', fontWeight: '600'
            }}>← Previous Week</button>
            <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>
              {currentWeekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - {addDays(currentWeekStart, 6).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            <button onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))} style={{
              padding: '0.5rem 1rem', background: '#f3f4f6', border: 'none',
              borderRadius: '8px', cursor: 'pointer', fontWeight: '600'
            }}>Next Week →</button>
          </div>
        </div>

        {/* Week Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '1rem', borderRadius: '12px', color: 'white' }}>
            <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Meals Planned</div>
            <div style={{ fontSize: '2rem', fontWeight: '700' }}>{stats.mealsPlanned}/21</div>
          </div>
          <div style={{ background: '#10b981', padding: '1rem', borderRadius: '12px', color: 'white' }}>
            <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Total Calories</div>
            <div style={{ fontSize: '2rem', fontWeight: '700' }}>{stats.totalCalories.toLocaleString()}</div>
          </div>
          <div style={{ background: '#3b82f6', padding: '1rem', borderRadius: '12px', color: 'white' }}>
            <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Avg Cal/Day</div>
            <div style={{ fontSize: '2rem', fontWeight: '700' }}>{stats.avgCaloriesPerDay}</div>
          </div>
          <div style={{ background: '#f59e0b', padding: '1rem', borderRadius: '12px', color: 'white' }}>
            <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Total Protein</div>
            <div style={{ fontSize: '2rem', fontWeight: '700' }}>{stats.totalProtein}g</div>
          </div>
        </div>

        <button onClick={generateWeekShoppingList} style={{
          padding: '0.75rem 1.5rem', background: 'linear-gradient(45deg, #10b981, #059669)',
          color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer',
          fontWeight: '600', fontSize: '1rem', width: '100%'
        }}>
          🛒 Generate Shopping List for This Week
        </button>
      </div>

      <div style={{ display: 'flex', gap: '2rem' }}>
        {/* Saved Recipes Sidebar */}
        <div style={{ width: '280px', flexShrink: 0 }}>
          <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: '16px', padding: '1.5rem', position: 'sticky', top: '1rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem' }}>📚 Saved Recipes</h3>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
              Drag recipes onto the calendar
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '600px', overflowY: 'auto' }}>
              {savedRecipes.length === 0 && (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '2rem', 
                  color: '#6b7280',
                  background: '#f9fafb',
                  borderRadius: '12px',
                  border: '2px dashed #e5e7eb'
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⭐</div>
                  <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>No Saved Recipes</div>
                  <div style={{ fontSize: '0.875rem' }}>
                    Favorite recipes from the Recipes tab to add them here!
                  </div>
                </div>
              )}
              
              {savedRecipes.map(recipe => (
                <div
                  key={recipe.id}
                  draggable
                  onDragStart={() => handleDragStart(recipe)}
                  style={{
                    background: '#f9fafb',
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '2px solid #e5e7eb',
                    cursor: 'grab',
                    transition: 'all 0.2s'
                  }}
                  onMouseDown={(e) => (e.currentTarget.style.cursor = 'grabbing')}
                  onMouseUp={(e) => (e.currentTarget.style.cursor = 'grab')}
                >
                  <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{recipe.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    {recipe.prep_time} • {recipe.nutrition?.calories || 0} cal
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div style={{ flex: 1, overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `120px repeat(7, 1fr)`, gap: '1px', background: '#e5e7eb', borderRadius: '12px', overflow: 'hidden', minWidth: '900px' }}>
            {/* Header Row */}
            <div style={{ background: '#f9fafb', padding: '1rem', fontWeight: '600' }}>Meal Type</div>
            {weekDates.map((date, idx) => (
              <div key={idx} style={{ background: '#f9fafb', padding: '1rem', textAlign: 'center' }}>
                <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{daysOfWeek[date.getDay()]}</div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </div>
            ))}

            {/* Meal Rows */}
            {mealTypes.map(mealType => (
              <React.Fragment key={mealType}>
                <div style={{ background: 'white', padding: '1rem', display: 'flex', alignItems: 'center', fontWeight: '600', textTransform: 'capitalize' }}>
                  {mealType === 'breakfast' && '🳳'} {mealType === 'lunch' && '🥗'} {mealType === 'dinner' && '🽽️'} {mealType === 'snack' && '�'}
                  {' '}{mealType}
                </div>
                {weekDates.map((date) => {
                  const dateStr = formatDate(date);
                  const meal = getMealForSlot(dateStr, mealType);
                  
                  return (
                    <div
                      key={`${dateStr}-${mealType}`}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(dateStr, mealType)}
                      onClick={() => handleSlotClick(dateStr, mealType)}
                      style={{
                        background: 'white',
                        padding: '0.75rem',
                        minHeight: '120px',
                        cursor: meal ? 'default' : 'pointer',
                        transition: 'background 0.2s',
                        position: 'relative'
                      }}
                      onMouseEnter={(e) => {
                        if (!meal) e.currentTarget.style.background = '#f9fafb';
                      }}
                      onMouseLeave={(e) => {
                        if (!meal) e.currentTarget.style.background = 'white';
                      }}
                    >
                      {meal ? (
                        <div style={{
                          background: meal.completed ? '#f0fdf4' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: meal.completed ? '#166534' : 'white',
                          padding: '0.75rem',
                          borderRadius: '8px',
                          fontSize: '0.875rem',
                          textDecoration: meal.completed ? 'line-through' : 'none',
                          opacity: meal.completed ? 0.7 : 1
                        }}>
                          <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{meal.recipe?.name}</div>
                          <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                            {meal.recipe?.nutrition?.calories || 0} cal • {meal.servings} servings
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                            <button onClick={(e) => { e.stopPropagation(); handleToggleComplete(meal.id); }} style={{
                              background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '4px',
                              padding: '0.25rem 0.5rem', cursor: 'pointer', fontSize: '0.75rem', color: 'inherit'
                            }}>
                              {meal.completed ? '↩️' : '✓'}
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteMeal(meal.id); }} style={{
                              background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '4px',
                              padding: '0.25rem 0.5rem', cursor: 'pointer', fontSize: '0.75rem', color: 'inherit'
                            }}>
                              🗑️
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem', paddingTop: '2rem' }}>
                          + Add meal
                        </div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Recipe Picker Modal */}
      {showRecipePicker && (
        <div onClick={() => setShowRecipePicker(false)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: 'white', borderRadius: '16px', padding: '2rem',
            maxWidth: '600px', maxHeight: '80vh', overflow: 'auto'
          }}>
            <h3 style={{ margin: '0 0 1.5rem 0' }}>Select a Recipe</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {savedRecipes.map(recipe => (
                <div
                  key={recipe.id}
                  onClick={() => handleRecipeSelect(recipe)}
                  style={{
                    padding: '1rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#10b981';
                    e.currentTarget.style.background = '#f0fdf4';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.background = 'white';
                  }}
                >
                  <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>{recipe.name}</div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    {recipe.prep_time} • {recipe.nutrition?.calories || 0} cal • {recipe.servings} servings
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MealPlanCalendar;