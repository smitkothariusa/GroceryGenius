import { FoodBank } from '../types/donation';

// Mock food bank data for Virginia Beach area (expand as needed)
export const foodBanks: FoodBank[] = [
  {
    id: '1',
    name: 'Foodbank of Southeastern Virginia',
    address: '800 Tidewater Drive',
    city: 'Norfolk',
    state: 'VA',
    zipCode: '23504',
    phone: '(757) 787-2557',
    hours: 'Mon-Fri: 8:30 AM - 4:30 PM',
    acceptedItems: ['canned goods', 'dry goods', 'pasta', 'rice', 'cereal', 'peanut butter', 'canned proteins'],
    coordinates: { lat: 36.8508, lng: -76.2859 }
  },
  {
    id: '2',
    name: 'Virginia Beach Community Food Pantry',
    address: '249 Central Drive',
    city: 'Virginia Beach',
    state: 'VA',
    zipCode: '23454',
    phone: '(757) 425-0970',
    hours: 'Tue, Thu: 10 AM - 2 PM',
    acceptedItems: ['non-perishables', 'canned vegetables', 'canned fruit', 'pasta', 'rice', 'cereal'],
    coordinates: { lat: 36.7682, lng: -76.0526 }
  },
  {
    id: '3',
    name: 'St. Mary\'s Food Pantry',
    address: '412 City Hall Ave',
    city: 'Norfolk',
    state: 'VA',
    zipCode: '23510',
    phone: '(757) 622-5625',
    hours: 'Wed: 9 AM - 12 PM, Sat: 9 AM - 11 AM',
    acceptedItems: ['canned goods', 'boxed meals', 'pasta', 'rice', 'beans', 'shelf-stable milk'],
    coordinates: { lat: 36.8508, lng: -76.2859 }
  },
  {
    id: '4',
    name: 'Chesapeake Care Center',
    address: '1028 Greenbrier Circle',
    city: 'Chesapeake',
    state: 'VA',
    zipCode: '23320',
    phone: '(757) 547-0125',
    hours: 'Mon-Fri: 9 AM - 3 PM',
    acceptedItems: ['all non-perishables', 'baby food', 'diapers', 'personal care items'],
    coordinates: { lat: 36.7682, lng: -76.2275 }
  },
  {
    id: '5',
    name: 'Hope House Foundation',
    address: '4887 Haygood Rd',
    city: 'Virginia Beach',
    state: 'VA',
    zipCode: '23455',
    phone: '(757) 491-5800',
    hours: 'Mon-Sat: 10 AM - 6 PM',
    acceptedItems: ['canned proteins', 'pasta', 'rice', 'cooking oil', 'spices', 'hygiene products'],
    coordinates: { lat: 36.8429, lng: -76.0901 }
  }
];

// Calculate estimated meals from food items
export const calculateMeals = (quantity: number, unit: string, itemType: string): number => {
  // Rough estimates based on USDA guidelines
  const mealEstimates: Record<string, number> = {
    // Per pound/cup estimates
    'rice': 8,        // 1 lb = ~8 servings
    'pasta': 8,
    'beans': 6,
    'canned': 2,      // 1 can = ~2 servings
    'cereal': 10,
    'peanut butter': 15,
    'bread': 10,
    'meat': 4,
    'vegetables': 4,
    'fruit': 4,
    'soup': 2,
    'default': 2
  };

  const itemTypeLower = itemType.toLowerCase();
  let servingsPerUnit = mealEstimates.default;

  for (const [key, value] of Object.entries(mealEstimates)) {
    if (itemTypeLower.includes(key)) {
      servingsPerUnit = value;
      break;
    }
  }

  // Adjust for unit type
  let adjustedQuantity = quantity;
  if (unit === 'oz') adjustedQuantity = quantity / 16; // Convert oz to lbs
  if (unit === 'g') adjustedQuantity = quantity / 453.592; // Convert g to lbs

  return Math.round(adjustedQuantity * servingsPerUnit);
};