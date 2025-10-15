import React, { useState, useEffect } from 'react';

interface Substitution {
  id: string;
  ingredient_name: string;
  substitute_name: string;
  conversion_ratio: number;
  dietary_tags: string[];
  notes?: string;
}

interface IngredientSubstitutionProps {
  ingredientName: string;
  quantity: number;
  unit: string;
  onSubstitute: (newIngredient: string, newQuantity: number, newUnit: string) => void;
  onClose: () => void;
}

const IngredientSubstitution: React.FC<IngredientSubstitutionProps> = ({
  ingredientName,
  quantity,
  unit,
  onSubstitute,
  onClose
}) => {
  const [substitutions, setSubstitutions] = useState<Substitution[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDietaryFilter, setSelectedDietaryFilter] = useState<string>('all');

  // Comprehensive substitution database
  const substitutionDatabase: Record<string, Substitution[]> = {
    // PROTEINS
    'chicken': [
      { id: '1', ingredient_name: 'chicken', substitute_name: 'turkey', conversion_ratio: 1.0, dietary_tags: ['meat'], notes: 'Similar cooking time and texture' },
      { id: '2', ingredient_name: 'chicken', substitute_name: 'tofu', conversion_ratio: 1.0, dietary_tags: ['vegan', 'vegetarian'], notes: 'Press tofu first, marinate longer' },
      { id: '3', ingredient_name: 'chicken', substitute_name: 'chickpeas', conversion_ratio: 1.5, dietary_tags: ['vegan', 'vegetarian'], notes: 'Higher quantity for similar protein' },
      { id: '4', ingredient_name: 'chicken', substitute_name: 'tempeh', conversion_ratio: 0.8, dietary_tags: ['vegan', 'vegetarian'], notes: 'Denser protein, steam to reduce bitterness' },
      { id: '5', ingredient_name: 'chicken', substitute_name: 'seitan', conversion_ratio: 0.9, dietary_tags: ['vegan', 'vegetarian'], notes: 'High protein, wheat-based (not gluten-free)' }
    ],
    'beef': [
      { id: '10', ingredient_name: 'beef', substitute_name: 'ground turkey', conversion_ratio: 1.0, dietary_tags: ['meat'], notes: 'Leaner option, similar texture' },
      { id: '11', ingredient_name: 'beef', substitute_name: 'lentils', conversion_ratio: 1.2, dietary_tags: ['vegan', 'vegetarian'], notes: 'Great for tacos, chili, bolognese' },
      { id: '12', ingredient_name: 'beef', substitute_name: 'mushrooms', conversion_ratio: 1.5, dietary_tags: ['vegan', 'vegetarian'], notes: 'Meaty texture, umami flavor' },
      { id: '13', ingredient_name: 'beef', substitute_name: 'black beans', conversion_ratio: 1.3, dietary_tags: ['vegan', 'vegetarian'], notes: 'Perfect for burgers and tacos' },
      { id: '14', ingredient_name: 'beef', substitute_name: 'textured vegetable protein', conversion_ratio: 0.7, dietary_tags: ['vegan', 'vegetarian'], notes: 'Rehydrate before use, absorbs flavors well' }
    ],
    'pork': [
      { id: '20', ingredient_name: 'pork', substitute_name: 'chicken thighs', conversion_ratio: 1.0, dietary_tags: ['meat'], notes: 'Similar fat content and flavor' },
      { id: '21', ingredient_name: 'pork', substitute_name: 'jackfruit', conversion_ratio: 1.2, dietary_tags: ['vegan', 'vegetarian'], notes: 'Shreds like pulled pork' },
      { id: '22', ingredient_name: 'pork', substitute_name: 'tempeh bacon', conversion_ratio: 0.8, dietary_tags: ['vegan', 'vegetarian'], notes: 'Smoky flavor, crispy texture' }
    ],
    'fish': [
      { id: '30', ingredient_name: 'fish', substitute_name: 'tofu', conversion_ratio: 1.0, dietary_tags: ['vegan', 'vegetarian'], notes: 'Firm tofu works best, coat in nori for ocean flavor' },
      { id: '31', ingredient_name: 'fish', substitute_name: 'hearts of palm', conversion_ratio: 1.0, dietary_tags: ['vegan', 'vegetarian'], notes: 'Flaky texture similar to fish' },
      { id: '32', ingredient_name: 'fish', substitute_name: 'banana blossom', conversion_ratio: 1.1, dietary_tags: ['vegan', 'vegetarian'], notes: 'Shreds like fish, absorbs marinades well' }
    ],
    'salmon': [
      { id: '35', ingredient_name: 'salmon', substitute_name: 'trout', conversion_ratio: 1.0, dietary_tags: ['meat'], notes: 'Similar omega-3 content' },
      { id: '36', ingredient_name: 'salmon', substitute_name: 'marinated tofu', conversion_ratio: 1.0, dietary_tags: ['vegan', 'vegetarian'], notes: 'Use smoked paprika for flavor' },
      { id: '37', ingredient_name: 'salmon', substitute_name: 'carrot lox', conversion_ratio: 1.2, dietary_tags: ['vegan', 'vegetarian'], notes: 'Thinly sliced, marinated carrots' }
    ],
    'shrimp': [
      { id: '40', ingredient_name: 'shrimp', substitute_name: 'scallops', conversion_ratio: 1.0, dietary_tags: ['meat'], notes: 'Similar texture and cooking time' },
      { id: '41', ingredient_name: 'shrimp', substitute_name: 'hearts of palm', conversion_ratio: 1.1, dietary_tags: ['vegan', 'vegetarian'], notes: 'Cut into rounds, similar bite' },
      { id: '42', ingredient_name: 'shrimp', substitute_name: 'king oyster mushrooms', conversion_ratio: 1.3, dietary_tags: ['vegan', 'vegetarian'], notes: 'Score and season for shrimp-like texture' }
    ],
    
    // DAIRY
    'milk': [
      { id: '50', ingredient_name: 'milk', substitute_name: 'almond milk', conversion_ratio: 1.0, dietary_tags: ['vegan', 'vegetarian'], notes: 'Light flavor, works for most recipes' },
      { id: '51', ingredient_name: 'milk', substitute_name: 'oat milk', conversion_ratio: 1.0, dietary_tags: ['vegan', 'vegetarian'], notes: 'Creamier texture, great for coffee' },
      { id: '52', ingredient_name: 'milk', substitute_name: 'coconut milk', conversion_ratio: 1.0, dietary_tags: ['vegan', 'vegetarian', 'keto'], notes: 'Rich and creamy, adds coconut flavor' },
      { id: '53', ingredient_name: 'milk', substitute_name: 'soy milk', conversion_ratio: 1.0, dietary_tags: ['vegan', 'vegetarian'], notes: 'High protein, neutral flavor' }
    ],
    'butter': [
      { id: '60', ingredient_name: 'butter', substitute_name: 'coconut oil', conversion_ratio: 1.0, dietary_tags: ['vegan', 'vegetarian', 'keto'], notes: 'Use refined for no coconut flavor' },
      { id: '61', ingredient_name: 'butter', substitute_name: 'olive oil', conversion_ratio: 0.75, dietary_tags: ['vegan', 'vegetarian'], notes: 'Reduce quantity by 25%' },
      { id: '62', ingredient_name: 'butter', substitute_name: 'vegan butter', conversion_ratio: 1.0, dietary_tags: ['vegan', 'vegetarian'], notes: '1:1 replacement in all recipes' },
      { id: '63', ingredient_name: 'butter', substitute_name: 'applesauce', conversion_ratio: 0.5, dietary_tags: ['vegan', 'vegetarian'], notes: 'For baking only, use half the amount' }
    ],
    'cheese': [
      { id: '70', ingredient_name: 'cheese', substitute_name: 'nutritional yeast', conversion_ratio: 0.3, dietary_tags: ['vegan', 'vegetarian'], notes: 'Cheesy flavor, use much less' },
      { id: '71', ingredient_name: 'cheese', substitute_name: 'cashew cheese', conversion_ratio: 1.0, dietary_tags: ['vegan', 'vegetarian'], notes: 'Blend soaked cashews with lemon' },
      { id: '72', ingredient_name: 'cheese', substitute_name: 'vegan cheese shreds', conversion_ratio: 1.0, dietary_tags: ['vegan', 'vegetarian'], notes: 'Melts like dairy cheese' }
    ],
    'cream': [
      { id: '80', ingredient_name: 'cream', substitute_name: 'coconut cream', conversion_ratio: 1.0, dietary_tags: ['vegan', 'vegetarian', 'keto'], notes: 'Rich and thick, slight coconut flavor' },
      { id: '81', ingredient_name: 'cream', substitute_name: 'cashew cream', conversion_ratio: 1.0, dietary_tags: ['vegan', 'vegetarian'], notes: 'Blend soaked cashews with water' },
      { id: '82', ingredient_name: 'cream', substitute_name: 'oat cream', conversion_ratio: 1.0, dietary_tags: ['vegan', 'vegetarian'], notes: 'Neutral flavor, good for sauces' }
    ],
    'yogurt': [
      { id: '85', ingredient_name: 'yogurt', substitute_name: 'coconut yogurt', conversion_ratio: 1.0, dietary_tags: ['vegan', 'vegetarian'], notes: 'Creamy with slight coconut taste' },
      { id: '86', ingredient_name: 'yogurt', substitute_name: 'cashew yogurt', conversion_ratio: 1.0, dietary_tags: ['vegan', 'vegetarian'], notes: 'Tangy, probiotic-rich' },
      { id: '87', ingredient_name: 'yogurt', substitute_name: 'soy yogurt', conversion_ratio: 1.0, dietary_tags: ['vegan', 'vegetarian'], notes: 'High protein, neutral flavor' }
    ],
    'egg': [
      { id: '90', ingredient_name: 'egg', substitute_name: 'flax egg', conversion_ratio: 1.0, dietary_tags: ['vegan', 'vegetarian'], notes: '1 tbsp flax + 3 tbsp water per egg' },
      { id: '91', ingredient_name: 'egg', substitute_name: 'chia egg', conversion_ratio: 1.0, dietary_tags: ['vegan', 'vegetarian'], notes: '1 tbsp chia + 3 tbsp water per egg' },
      { id: '92', ingredient_name: 'egg', substitute_name: 'applesauce', conversion_ratio: 0.25, dietary_tags: ['vegan', 'vegetarian'], notes: '1/4 cup per egg, for baking' },
      { id: '93', ingredient_name: 'egg', substitute_name: 'aquafaba', conversion_ratio: 3.0, dietary_tags: ['vegan', 'vegetarian'], notes: '3 tbsp chickpea water per egg' }
    ],
    
    // GRAINS
    'rice': [
      { id: '100', ingredient_name: 'rice', substitute_name: 'cauliflower rice', conversion_ratio: 1.0, dietary_tags: ['vegan', 'vegetarian', 'keto', 'gluten-free'], notes: 'Low carb, quick cooking' },
      { id: '101', ingredient_name: 'rice', substitute_name: 'quinoa', conversion_ratio: 1.0, dietary_tags: ['vegan', 'vegetarian', 'gluten-free'], notes: 'Higher protein, complete amino acids' },
      { id: '102', ingredient_name: 'rice', substitute_name: 'bulgur', conversion_ratio: 1.0, dietary_tags: ['vegan', 'vegetarian'], notes: 'Nutty flavor, faster cooking' }
    ],
    'pasta': [
      { id: '110', ingredient_name: 'pasta', substitute_name: 'zucchini noodles', conversion_ratio: 1.0, dietary_tags: ['vegan', 'vegetarian', 'keto', 'gluten-free'], notes: 'Low carb, spiralize zucchini' },
      { id: '111', ingredient_name: 'pasta', substitute_name: 'chickpea pasta', conversion_ratio: 1.0, dietary_tags: ['vegan', 'vegetarian', 'gluten-free'], notes: 'High protein, gluten-free' },
      { id: '112', ingredient_name: 'pasta', substitute_name: 'shirataki noodles', conversion_ratio: 1.0, dietary_tags: ['vegan', 'vegetarian', 'keto'], notes: 'Zero calorie, rinse well' }
    ],
    'flour': [
      { id: '120', ingredient_name: 'flour', substitute_name: 'almond flour', conversion_ratio: 1.0, dietary_tags: ['keto', 'gluten-free'], notes: 'Low carb, add xanthan gum' },
      { id: '121', ingredient_name: 'flour', substitute_name: 'coconut flour', conversion_ratio: 0.25, dietary_tags: ['keto', 'gluten-free'], notes: 'Very absorbent, use 1/4 amount' },
      { id: '122', ingredient_name: 'flour', substitute_name: 'oat flour', conversion_ratio: 1.0, dietary_tags: ['vegetarian'], notes: 'Mild flavor, slightly denser' }
    ],
    'bread': [
      { id: '125', ingredient_name: 'bread', substitute_name: 'lettuce wraps', conversion_ratio: 1.0, dietary_tags: ['vegan', 'vegetarian', 'keto', 'gluten-free'], notes: 'Low carb, crunchy' },
      { id: '126', ingredient_name: 'bread', substitute_name: 'cloud bread', conversion_ratio: 1.0, dietary_tags: ['keto', 'gluten-free'], notes: 'Made with eggs and cream cheese' },
      { id: '127', ingredient_name: 'bread', substitute_name: 'portobello caps', conversion_ratio: 1.0, dietary_tags: ['vegan', 'vegetarian', 'keto', 'gluten-free'], notes: 'Great for burger buns' }
    ],
    
    // SWEETENERS
    'sugar': [
      { id: '130', ingredient_name: 'sugar', substitute_name: 'stevia', conversion_ratio: 0.1, dietary_tags: ['keto'], notes: 'Much sweeter, use 1/10 amount' },
      { id: '131', ingredient_name: 'sugar', substitute_name: 'monk fruit sweetener', conversion_ratio: 0.5, dietary_tags: ['keto'], notes: 'Zero calorie, use half amount' },
      { id: '132', ingredient_name: 'sugar', substitute_name: 'honey', conversion_ratio: 0.75, dietary_tags: ['vegetarian'], notes: 'Use 3/4 amount, adds moisture' },
      { id: '133', ingredient_name: 'sugar', substitute_name: 'maple syrup', conversion_ratio: 0.75, dietary_tags: ['vegan', 'vegetarian'], notes: 'Use 3/4 amount, adds flavor' }
    ],
    
    // OILS
    'oil': [
      { id: '140', ingredient_name: 'oil', substitute_name: 'coconut oil', conversion_ratio: 1.0, dietary_tags: ['vegan', 'vegetarian', 'keto'], notes: 'High smoke point' },
      { id: '141', ingredient_name: 'oil', substitute_name: 'avocado oil', conversion_ratio: 1.0, dietary_tags: ['vegan', 'vegetarian', 'keto'], notes: 'Highest smoke point, neutral flavor' },
      { id: '142', ingredient_name: 'oil', substitute_name: 'applesauce', conversion_ratio: 0.5, dietary_tags: ['vegan', 'vegetarian'], notes: 'For baking, use half amount' }
    ],
    
    // VEGETABLES
    'potato': [
      { id: '150', ingredient_name: 'potato', substitute_name: 'cauliflower', conversion_ratio: 1.0, dietary_tags: ['vegan', 'vegetarian', 'keto', 'gluten-free'], notes: 'Low carb, similar texture when mashed' },
      { id: '151', ingredient_name: 'potato', substitute_name: 'turnips', conversion_ratio: 1.0, dietary_tags: ['vegan', 'vegetarian', 'keto', 'gluten-free'], notes: 'Lower carb, slightly bitter' },
      { id: '152', ingredient_name: 'potato', substitute_name: 'celery root', conversion_ratio: 1.0, dietary_tags: ['vegan', 'vegetarian', 'keto', 'gluten-free'], notes: 'Earthy flavor, creamy when mashed' }
    ],
    'tomato': [
      { id: '160', ingredient_name: 'tomato', substitute_name: 'red bell pepper', conversion_ratio: 1.0, dietary_tags: ['vegan', 'vegetarian', 'keto', 'gluten-free'], notes: 'Sweeter, similar color' },
      { id: '161', ingredient_name: 'tomato', substitute_name: 'sun-dried tomatoes', conversion_ratio: 0.5, dietary_tags: ['vegan', 'vegetarian', 'keto', 'gluten-free'], notes: 'More intense flavor, use less' }
    ]
  };

  useEffect(() => {
    setLoading(true);
    
    // Clean and normalize ingredient name
    const cleanName = ingredientName
      .toLowerCase()
      .replace(/\b(fresh|dried|raw|cooked|minced|chopped|diced|sliced|grated)\b/g, '')
      .trim();

    // Find matching substitutions
    let found: Substitution[] = [];
    
    // Try exact match first
    for (const [key, subs] of Object.entries(substitutionDatabase)) {
      if (cleanName.includes(key) || key.includes(cleanName)) {
        found = [...found, ...subs];
      }
    }

    // Remove duplicates
    const uniqueSubs = Array.from(new Map(found.map(item => [item.substitute_name, item])).values());

    setSubstitutions(uniqueSubs);
    setLoading(false);
  }, [ingredientName]);

  const filteredSubstitutions = selectedDietaryFilter === 'all'
    ? substitutions
    : substitutions.filter(sub => sub.dietary_tags.includes(selectedDietaryFilter));

  const calculateNewQuantity = (ratio: number): number => {
    return Math.round(quantity * ratio * 10) / 10;
  };

  const handleSelect = (sub: Substitution) => {
    const newQuantity = calculateNewQuantity(sub.conversion_ratio);
    onSubstitute(sub.substitute_name, newQuantity, unit);
    onClose();
  };

  const dietaryFilters = [
    { value: 'all', label: 'All Options', icon: '🍽️' },
    { value: 'vegan', label: 'Vegan', icon: '🌱' },
    { value: 'vegetarian', label: 'Vegetarian', icon: '🥗' },
    { value: 'meat', label: 'Meat-based', icon: '🍖' },
    { value: 'gluten-free', label: 'Gluten-Free', icon: '🌾' },
    { value: 'keto', label: 'Keto', icon: '🥑' }
  ];

  return (
    <div onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 2000, padding: '2rem'
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: 'white', borderRadius: '20px', padding: '2rem',
        maxWidth: '700px', width: '100%', maxHeight: '90vh', overflow: 'auto',
        position: 'relative'
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: '1rem', right: '1rem',
          background: '#f3f4f6', border: 'none', borderRadius: '50%',
          width: '40px', height: '40px', cursor: 'pointer', fontSize: '1.5rem'
        }}>×</button>

        <h2 style={{ marginBottom: '0.5rem', fontSize: '1.75rem', fontWeight: '700' }}>
          🔄 Smart Substitution
        </h2>
        <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
          Find alternatives for <strong>{quantity} {unit} {ingredientName}</strong>
        </p>

        {/* Dietary Filters */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '600' }}>
            Filter by dietary preference:
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {dietaryFilters.map(filter => (
              <button
                key={filter.value}
                onClick={() => setSelectedDietaryFilter(filter.value)}
                style={{
                  padding: '0.5rem 1rem',
                  background: selectedDietaryFilter === filter.value ? '#10b981' : '#f3f4f6',
                  color: selectedDietaryFilter === filter.value ? 'white' : '#1f2937',
                  border: 'none',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  transition: 'all 0.2s'
                }}
              >
                <span>{filter.icon}</span>
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔍</div>
            Finding substitutions...
          </div>
        )}

        {/* No Results */}
        {!loading && filteredSubstitutions.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>😕</div>
            <p style={{ color: '#6b7280', fontSize: '1.1rem' }}>
              No substitutions found for this ingredient with the selected filters.
            </p>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginTop: '0.5rem' }}>
              Try adjusting your dietary filters or searching for a different ingredient.
            </p>
          </div>
        )}

        {/* Substitution Options */}
        {!loading && filteredSubstitutions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredSubstitutions.map(sub => {
              const newQuantity = calculateNewQuantity(sub.conversion_ratio);
              const quantityChanged = Math.abs(newQuantity - quantity) > 0.1;

              return (
                <div
                  key={sub.id}
                  onClick={() => handleSelect(sub)}
                  style={{
                    padding: '1.5rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: 'white'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#10b981';
                    e.currentTarget.style.background = '#f0fdf4';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                    <div>
                      <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem', fontWeight: '600', color: '#1f2937' }}>
                        {sub.substitute_name}
                      </h3>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        Use {newQuantity} {unit}
                        {quantityChanged && (
                          <span style={{ 
                            marginLeft: '0.5rem',
                            color: newQuantity > quantity ? '#dc2626' : '#10b981',
                            fontWeight: '600'
                          }}>
                            ({newQuantity > quantity ? '+' : ''}{Math.round((newQuantity - quantity) * 10) / 10} {unit})
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                      {sub.dietary_tags.map(tag => (
                        <span key={tag} style={{
                          padding: '0.25rem 0.5rem',
                          background: '#e0e7ff',
                          color: '#3730a3',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          textTransform: 'capitalize'
                        }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {sub.notes && (
                    <div style={{
                      background: '#fef3c7',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      color: '#92400e',
                      lineHeight: '1.5'
                    }}>
                      <strong>💡 Tip:</strong> {sub.notes}
                    </div>
                  )}

                  <div style={{
                    marginTop: '0.75rem',
                    padding: '0.5rem',
                    background: '#f0fdf4',
                    borderRadius: '8px',
                    textAlign: 'center',
                    color: '#166534',
                    fontWeight: '600',
                    fontSize: '0.875rem'
                  }}>
                    Click to use this substitution
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default IngredientSubstitution;