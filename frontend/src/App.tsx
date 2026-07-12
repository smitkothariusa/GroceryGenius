import { FoodBank } from './types/donation';
import { calculateMeals } from './data/foodBanks';
import { searchFoods, getSmartExpiryDate, getFoodDisplayName, getSuggestedUnits, type FoodEntry } from './data/foodDatabase';
import { isExpiringSoon } from './lib/pantryExpiry';
import { useTranslation } from 'react-i18next';
import Toast from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useToast } from './hooks/useToast';
import { useState, useEffect, useRef, useCallback } from 'react';
import { authService, supabase, profileService, CustomDietaryLabel, Profile } from './lib/supabase';
import { authFetch } from './lib/apiClient';
import { onRateLimited } from './lib/rateLimitBridge';
import { escapeHtml } from './lib/escapeHtml';
import { calorieService } from './lib/database';
import { pantryService, shoppingService, recipesService, mealPlansService, donationService } from './lib/database';
import Auth from './components/Auth';
import MealPlanCalendar from './components/MealPlanCalendar';
import LanguageSwitcher from './components/LanguageSwitcher';
import OnboardingSurvey from './components/OnboardingSurvey';
import FeedbackButton from './components/FeedbackButton';
import InstallBanner from './components/InstallBanner';
import SettingsPanel from './components/SettingsPanel';
import TourOverlay from './components/TourOverlay';
import { TOUR_STEPS } from './tourSteps';
import { FavoritesProvider, useFavorites, type FavoriteRecipe } from './features/favorites/FavoritesContext';
import { FavoritesSection } from './features/favorites/FavoritesSection';
import { DonationProvider, useDonation, type DropOffSite } from './features/donation/DonationContext';
import { DonationSection } from './features/donation/DonationSection';
import { DonationModal } from './features/donation/DonationModal';
import { ShareImpactModal } from './features/donation/ShareImpactModal';
import { RecipesProvider, useRecipes, parseIngredients, COMBINED_PROFILE_KEY, type Recipe } from './features/recipes/RecipesContext';
import { RecipeSection } from './features/recipes/RecipeSection';
import { RecipeDetailModal } from './features/recipes/RecipeDetailModal';
import { RecipeSubstitutionModal } from './features/recipes/RecipeSubstitutionModal';


interface PantryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  expiryDate?: string;
  emoji?: string;  // NEW
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

interface ReceiptItem {
  id: string;
  name: string;
  quantity: number | null;
  unit: string;
  category: string;
  confidence: 'high' | 'medium' | 'low';
  rawText: string;
  selected: boolean;
  emoji?: string;
}

// Page size for paginated pantry/shopping reads (Supabase .range()).
// Kept generous since per-user item counts are low at current scale.
const LIST_PAGE_SIZE = 50;

const AppContent: React.FC = () => {
  const { t, i18n } = useTranslation();
  
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<'pantry' | 'recipes' | 'mealplan' | 'shopping' | 'donate' | 'favorites'>(
    () => (localStorage.getItem('activeTab') as 'pantry' | 'recipes' | 'mealplan' | 'shopping' | 'donate' | 'favorites') || 'pantry'
  );
  // Bumped whenever a loadUserData() call should be considered stale (a
  // newer load started, or the user signed out) so in-flight responses from
  // an older call don't clobber state set by a newer one.
  const loadUserDataRequestRef = useRef(0);
  // Guards the "save calorie goal" effect below from firing before
  // loadUserData() has fetched the real saved goal. Without this, logging in
  // sets `user`, which the save effect also depends on, and it fires
  // immediately with whatever dailyCalorieGoal still holds (the component's
  // default of 2000) — overwriting the real stored goal before the fetch
  // that would have loaded it resolves.
  const calorieGoalLoadedRef = useRef(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [pantryHasMore, setPantryHasMore] = useState(false);
  const [pantryLoadingMore, setPantryLoadingMore] = useState(false);
  const [showAddPantry, setShowAddPantry] = useState(false);
  const [newPantryItem, setNewPantryItem] = useState<{
    name: string;
    quantity: number | '';
    unit: string;
    category: string;
    expiryDate: string;
    emoji?: string;
  }>({
  name: '',
  quantity: 1,
    unit: 'pc',
    category: 'other',
    expiryDate: '',
    emoji: undefined,
  });
  const [smartSearchQuery, setSmartSearchQuery] = useState('');
  const [smartSearchResults, setSmartSearchResults] = useState<FoodEntry[]>([]);
  const [selectedFood, setSelectedFood] = useState<FoodEntry | null>(null);
  const smartSearchRef = useRef<HTMLDivElement>(null);
  const [manualQuery, setManualQuery] = useState('');
  const [customUnitValue, setCustomUnitValue] = useState('');
  const [isCustomUnit, setIsCustomUnit] = useState(false);
  const [editCustomUnit, setEditCustomUnit] = useState('');
  const [isEditCustomUnit, setIsEditCustomUnit] = useState(false);
  const [scanMode, setScanMode] = useState<'menu' | 'camera' | 'barcode' | 'expiry' | 'upload' | 'receipt'>('menu');
  const [barcodeScanning, setBarcodeScanning] = useState(false);
  const [expiryScanning, setExpiryScanning] = useState(false);
  const [receiptScanning, setReceiptScanning] = useState(false);
  const [detectedBarcode, setDetectedBarcode] = useState<string>('');
  const [detectedExpiry, setDetectedExpiry] = useState<string>('');
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([]);
  const [showReceiptReview, setShowReceiptReview] = useState(false);
  const [receiptRejectedCount, setReceiptRejectedCount] = useState(0);
  const [showMissionPopup, setShowMissionPopup] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showSurvey, setShowSurvey] = useState(false);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [customDietaryLabels, setCustomDietaryLabels] = useState<CustomDietaryLabel[]>([]);
  const [savedProfilePrefs, setSavedProfilePrefs] = useState<string[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [shoppingHasMore, setShoppingHasMore] = useState(false);
  const [shoppingLoadingMore, setShoppingLoadingMore] = useState(false);
  const { favorites, setFavorites, translatedFavoriteNames } = useFavorites();
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [sortShoppingBy, setSortShoppingBy] = useState<'category' | 'alphabetical'>('category');
  const {
    donationImpact, setDonationImpact,
    donationHistory, setDonationHistory,
    showDonationModal, setShowDonationModal,
    selectedFoodBank, setSelectedFoodBank,
    itemsToDonate, setItemsToDonate,
    selectedDropOffSite, setSelectedDropOffSite,
    showShareModal, setShowShareModal,
    userLocation, setUserLocation,
    locationPermission, setLocationPermission,
    allItemsImpact, setAllItemsImpact,
    loadingImpact, setLoadingImpact,
  } = useDonation();
  const {
    recipeLoading, setRecipeLoading,
    setRecipeMode,
    ingredientTags, setIngredientTags,
    setDietaryFilter,
    setSelectedRecipe,
    setShowDetailedView,
  } = useRecipes();
  const [cameraSource, setCameraSource] = useState<'recipes' | 'pantry'>('recipes');
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [showCalorieTracker, setShowCalorieTracker] = useState(false);
  const [dailyCalorieGoal, setDailyCalorieGoal] = useState(2000);
  const [todayCalories, setTodayCalories] = useState(0);
  const [lastResetDate, setLastResetDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [manualCalorieInput, setManualCalorieInput] = useState<string>('');
  const [priceComparison, setPriceComparison] = useState<{
    amazon: number;
    walmart: number;
    loading: boolean;
  }>({ amazon: 0, walmart: 0, loading: false });
  const { toasts, removeToast, success, error, warning, info } = useToast();
  useEffect(() => {
    return onRateLimited(() => warning(t('toasts.rateLimited')));
  }, [warning, t]);
  const [isTabChanging, setIsTabChanging] = useState(false);
  const API_BASE = import.meta.env.VITE_API_URL || '/_/backend';
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
  // Calculate AI impact for ALL pantry items when food bank is selected
// Calculate AI impact for ALL pantry items when food bank is selected
// Calculate AI impact for ALL pantry items when food bank is selected
  useEffect(() => {
    console.log('🔄 useEffect triggered - showDonationModal:', showDonationModal, 'pantry.length:', pantry.length);
    
    const calculateAllItemsImpact = async () => {
      if (!showDonationModal || pantry.length === 0) {
        console.log('⏹️ Skipping impact calculation - modal closed or empty pantry');
        setAllItemsImpact({});
        setLoadingImpact(false);
        return;
      }
      
      console.log('🚀 Starting AI impact calculation for', pantry.length, 'items');

      setLoadingImpact(true);
      setAllItemsImpact({}); // Clear old data
      
      console.log('📤 Sending items to API:', pantry.map(i => `${i.quantity} ${i.unit} ${i.name}`));

      try {
        // Calculate impact for ALL pantry items at once
        const impactResponse = await authFetch(`${import.meta.env.VITE_API_URL || '/_/backend'}/donation/calculate-impact`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: pantry.map((item, idx) => ({
              name: `${item.name} #${idx + 1}`,  // Add index to make each unique
              quantity: item.quantity,
              unit: item.unit
            }))
          })
        });

        if (impactResponse.ok) {
          const data = await impactResponse.json();
          console.log('📥 API Response:', data);
          
          // Map the results to item IDs for easy lookup
          const impactMap: { [itemId: string]: { meals: number; pounds: number; co2_lbs: number } } = {};
          
          // Check if API consolidated duplicate items
          if (data.items_breakdown.length < pantry.length) {
            console.warn(`⚠️ API returned ${data.items_breakdown.length} items but we sent ${pantry.length}. Duplicates may have been consolidated.`);
          }
          
          pantry.forEach((item, index) => {
            if (data.items_breakdown && data.items_breakdown[index]) {
              impactMap[item.id] = {
                meals: data.items_breakdown[index].meals,
                pounds: data.items_breakdown[index].pounds,
                co2_lbs: data.items_breakdown[index].pounds * 3.8
              };
              console.log(`✅ Mapped ${item.name} (ID: ${item.id}, index: ${index}):`, impactMap[item.id]);
            } else {
              // Fallback: look for matching item by name in breakdown
              const matchingBreakdown = data.items_breakdown.find(
                (bd: any) => bd.name && bd.name.toLowerCase().includes(item.name.toLowerCase())
              );
              
              if (matchingBreakdown) {
                impactMap[item.id] = {
                  meals: matchingBreakdown.meals,
                  pounds: matchingBreakdown.pounds,
                  co2_lbs: matchingBreakdown.pounds * 3.8
                };
                console.log(`✅ Mapped ${item.name} by name match (ID: ${item.id}):`, impactMap[item.id]);
              } else {
                console.error(`❌ Missing breakdown for ${item.name} at index ${index}`);
                // Use simple fallback calculation
                impactMap[item.id] = {
                  meals: calculateMeals(item.quantity, item.unit, item.name),
                  pounds: item.unit === 'lbs' ? item.quantity : item.quantity * 0.5,
                  co2_lbs: (item.unit === 'lbs' ? item.quantity : item.quantity * 0.5) * 3.8
                };
                console.log(`⚠️ Using fallback calculation for ${item.name}:`, impactMap[item.id]);
              }
            }
          });
          
          console.log('📊 Final impact map keys:', Object.keys(impactMap));
          console.log('📊 Final impact map:', impactMap);
          setAllItemsImpact(impactMap);
        } else {
          console.error('Impact calculation failed');
        }
      } catch (error) {
        console.error('Error calculating impact:', error);
      } finally {
        setLoadingImpact(false);
      }
    };

    calculateAllItemsImpact();
  }, [showDonationModal, pantry, setAllItemsImpact, setLoadingImpact]);
  const loadUserData = useCallback(async () => {
    // Tag this call with a request token. If a newer loadUserData() call
    // starts (e.g. the user re-authenticates) or the user signs out before
    // this one's awaits resolve, `isStale()` flips true and we stop setting
    // state instead of overwriting fresher/cleared state with old data.
    const requestToken = ++loadUserDataRequestRef.current;
    const isStale = () => requestToken !== loadUserDataRequestRef.current;
    try {
      console.log('📦 Loading user data from Supabase...');

      // Load each data source independently so one failure doesn't break everything

      // Load calorie data
      console.log('⏳ Starting to load calorie data...');
      try {
        // Get user profile for calorie goal
        const { data: profileData } = await supabase
          .from('profiles')
          .select('daily_calorie_goal')
          .eq('id', user.id)
          .maybeSingle();
        
        if (profileData?.daily_calorie_goal && !isStale()) {
          setDailyCalorieGoal(profileData.daily_calorie_goal);
        }

        // Get today's calorie total
        const calorieData = await calorieService.getTodayCalories();
        if (calorieData && calorieData.total !== undefined && !isStale()) {
          setTodayCalories(calorieData.total);
        }

        console.log('✅ Calorie data loaded');
      } catch (error) {
        console.error('❌ Error loading calorie data:', error);
      } finally {
        // Unblock the save effect now that we've attempted the real fetch —
        // whether it succeeded, found no stored goal, or errored. Otherwise
        // a failed fetch would permanently block the user from ever saving
        // an edited goal for the rest of the session.
        if (!isStale()) {
          calorieGoalLoadedRef.current = true;
        }
      }

      // Load full profile for settings + survey
      try {
        const profileResult = await profileService.getProfile(user.id);
        if (profileResult && !isStale()) {
          setUserProfile(profileResult);
          setCustomDietaryLabels(profileResult.custom_dietary_labels ?? []);
          const prefs0 = profileResult.dietary_preferences ?? [];
          setSavedProfilePrefs(prefs0);
          if (prefs0.length > 1) setDietaryFilter(COMBINED_PROFILE_KEY);
          else if (prefs0.length === 1) setDietaryFilter(prefs0[0]);
          if (!profileResult.onboarding_completed) {
            setShowSurvey(true);
          }
        }
      } catch (err) {
        console.error('❌ Error loading profile:', err);
      }

      // Load pantry items
      // Load pantry items
    console.log('⏳ Starting to load pantry...');
    try {
      const pantryData = await pantryService.getAll({ limit: LIST_PAGE_SIZE, offset: 0 });
      console.log('📦 Pantry data received, transforming...');
      if (!isStale()) {
        setPantry(pantryData.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          category: item.category,
          expiryDate: item.expiry_date,
          emoji: item.emoji || undefined,  // NEW
        })));
        setPantryHasMore(pantryData.length === LIST_PAGE_SIZE);
      }
      console.log('✅ Pantry loaded:', pantryData.length, 'items');
    } catch (error) {
      console.error('❌ Error loading pantry:', error);
      if (!isStale()) setPantry([]);
    }

    // Load shopping items
    console.log('⏳ Starting to load shopping items...');
    try {
      const shoppingData = await shoppingService.getAll({ limit: LIST_PAGE_SIZE, offset: 0 });
      console.log('📦 Shopping data received, transforming...');
      if (!isStale()) {
        setShoppingList(shoppingData.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          category: item.category,
          checked: item.checked,
          priority: item.priority as 'high' | 'medium' | 'low',
        })));
        setShoppingHasMore(shoppingData.length === LIST_PAGE_SIZE);
      }
      console.log('✅ Shopping list loaded:', shoppingData.length, 'items');
    } catch (error) {
      console.error('❌ Error loading shopping list:', error);
      if (!isStale()) setShoppingList([]);
    }

    // Load favorite recipes
    console.log('⏳ Starting to load favorites...');
    try {
      const recipesData = await recipesService.getAll();
      console.log('📦 Favorites data received, transforming...');
      if (!isStale()) {
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
      }
      console.log('✅ Favorites loaded:', recipesData.length, 'recipes');
    } catch (error) {
      console.error('❌ Error loading favorites:', error);
      if (!isStale()) setFavorites([]);
    }

    // Load donation history
    console.log('⏳ Starting to load donation history...');
    try {
      const historyData = await donationService.getHistory();
      console.log('📦 History data received, transforming...');
      if (!isStale()) {
        setDonationHistory(historyData.map(donation => ({
          id: donation.id,
          date: donation.date,
          foodBank: donation.food_bank,
          items: donation.items,
          totalMeals: donation.total_meals,
        })));
      }
      console.log('✅ Donation history loaded:', historyData.length, 'donations');
    } catch (error) {
      console.error('❌ Error loading donation history:', error);
      if (!isStale()) setDonationHistory([]);
    }

    // Load donation impact
    console.log('⏳ Starting to load donation impact...');
    try {
      const impactData = await donationService.getImpact();
      console.log('📦 Impact data received, transforming...');
      if (!isStale()) {
        setDonationImpact({
          totalDonations: impactData.total_donations || 0,
          totalMeals: impactData.total_meals || 0,
          totalPounds: impactData.total_pounds || 0,
          co2Saved: impactData.co2_saved || 0,
          lastDonation: impactData.last_donation,
        });
      }
      console.log('✅ Donation impact loaded');
    } catch (error) {
      console.error('❌ Error loading donation impact:', error);
      if (!isStale()) {
        setDonationImpact({
          totalDonations: 0,
          totalMeals: 0,
          totalPounds: 0,
          co2Saved: 0
        });
      }
    }

    console.log('✅ All user data loading attempts complete');
    } catch (criticalError: any) {
      console.error('🚨 CRITICAL ERROR in loadUserData:', criticalError);
      console.error('Error type:', typeof criticalError);
      console.error('Error message:', criticalError?.message);
      console.error('Error stack:', criticalError?.stack);
      // Don't throw - just log and continue so app doesn't break
    } finally {
      console.log('🏁 loadUserData execution finished');
    }
  }, [user, setFavorites, setDonationHistory, setDonationImpact, setDietaryFilter]);
  // Daily reset check - runs every minute to check if we've crossed midnight
  useEffect(() => {
    const checkDailyReset = () => {
      const today = new Date().toISOString().split('T')[0];
      if (lastResetDate !== today) {
        console.log('🔄 New day detected, resetting calories');
        setTodayCalories(0);
        setLastResetDate(today);
      }
    };
    
    // Check immediately
    checkDailyReset();
    
    // Check every minute for midnight rollover
    const interval = setInterval(checkDailyReset, 60000);
    return () => clearInterval(interval);
  }, [lastResetDate]);
  // Close smart search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (smartSearchRef.current && !smartSearchRef.current.contains(e.target as Node)) {
        setSmartSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Save calorie goal to Supabase when it changes
  useEffect(() => {
    const saveCalorieGoal = async () => {
      if (!user) return;
      
      try {
        await supabase
          .from('profiles')
          .update({ daily_calorie_goal: dailyCalorieGoal })
          .eq('id', user.id);
        console.log('✅ Calorie goal saved to Supabase:', dailyCalorieGoal);
      } catch (error) {
        console.error('❌ Error saving calorie goal:', error);
      }
    };
    
    // Only save if we have a user, a valid goal, and have already loaded the
    // real stored goal — otherwise this fires the instant `user` is set on
    // login, before the fetch below has a chance to load the actual value,
    // and clobbers it with whatever dailyCalorieGoal still holds (the 2000
    // default).
    if (user && dailyCalorieGoal > 0 && calorieGoalLoadedRef.current) {
      saveCalorieGoal();
    }
  }, [dailyCalorieGoal, user]);
  useEffect(() => {
      const initAuth = async () => {
        try {
          console.log('🔐 Initializing auth...');
          const session = await authService.getSession();
          console.log('📝 Session:', session ? 'Found' : 'None');
          setUser(session?.user || null);
        } catch (err) {
          console.error('❌ Auth error:', err);
          setUser(null);
        } finally {
          console.log('✅ Auth initialization complete');
          setAuthLoading(false);
        }
      };
      initAuth();

      const { data: authListener } = authService.onAuthStateChange(async (event, session) => {
        console.log('🔄 Auth state changed:', event);
        setUser(session?.user || null);
        setAuthLoading(false);
        
        // Note: we deliberately do NOT call loadUserData() here for
        // SIGNED_IN. setUser(session.user) above already updates the `user`
        // state, and the separate "Load user data after authentication"
        // effect below reacts to that change and calls loadUserData() with
        // a fresh, non-stale closure. (This used to also fire loadUserData()
        // from here, guarded by `!user` — but `user` inside this listener
        // is captured once at mount, when it's always null, so that guard
        // never actually filtered anything, and the stale loadUserData()
        // it invoked read `user.id` from that same stale null closure,
        // throwing and silently swallowing the profile/calorie-goal load
        // on every real sign-in. It also raced with the effect below:
        // both fired loadUserData() concurrently, and if the user signed
        // out again before the stale call's pantry/shopping/favorites
        // fetches resolved, those late responses could overwrite the
        // SIGNED_OUT reset below with the previous session's data.)

        if (event === 'SIGNED_OUT') {
          // Invalidate any loadUserData() call still in flight so its
          // late-arriving responses can't overwrite the empty state below.
          loadUserDataRequestRef.current++;
          calorieGoalLoadedRef.current = false;
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
          localStorage.removeItem('gg_recipe_mode');
          localStorage.removeItem('hasSeenTour');
          localStorage.removeItem('hasSeenMission');
          localStorage.removeItem('locationPermission');
          localStorage.removeItem('userLocation');
          setUserLocation(null);
          setLocationPermission('pending');
          setRecipeMode('loose');
        }
      });

      return () => {
        authListener?.subscription?.unsubscribe();
      };
    }, [setFavorites, setDonationHistory, setDonationImpact, setUserLocation, setLocationPermission, setRecipeMode]);

  // Load user data after authentication - SEPARATE useEffect
  useEffect(() => {
    if (user && !authLoading) {
      console.log('👤 User authenticated, loading data...');
      loadUserData().catch(error => {
        console.error('⚠️ Error loading user data:', error);
        // Set empty defaults
        setPantry([]);
        setShoppingList([]);
        setFavorites([]);
        setDonationHistory([]);
      });
    }
  }, [user, authLoading, loadUserData, setFavorites, setDonationHistory]);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleTabChange = (tab: typeof currentTab) => {
    localStorage.setItem('activeTab', tab);
    setIsTabChanging(true);
    setTimeout(() => {
      setCurrentTab(tab);
      setIsTabChanging(false);
    }, 150);
  };

  const handleTourSkip = () => {
    setShowTour(false);
    localStorage.setItem('hasSeenTour', 'true');
  };

  const handleTourNext = () => {
    const step = TOUR_STEPS[tourStep];

    // Run afterStep side effects for current step
    if (step.afterStep === 'closeSettings') setShowSettings(false);
    if (step.afterStep === 'closeCalorieTracker') setShowCalorieTracker(false);

    const nextIndex = tourStep + 1;

    if (nextIndex >= TOUR_STEPS.length) {
      // Tour complete
      setShowTour(false);
      localStorage.setItem('hasSeenTour', 'true');
      success(t('tour.allSet'));
      return;
    }

    const nextStep = TOUR_STEPS[nextIndex];

    // Navigate to the correct tab if needed; reset scroll first so the address
    // bar is fully settled before TourOverlay starts measuring.
    if (nextStep.tab && nextStep.tab !== currentTab) {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      handleTabChange(nextStep.tab);
    }

    // Run beforeShow side effects for next step
    if (nextStep.beforeShow === 'openSettings') setShowSettings(true);
    if (nextStep.beforeShow === 'openCalorieTracker') setShowCalorieTracker(true);

    setTourStep(nextIndex);
  };

  // Both the "expiring soon" list and the per-row styling delegate to the
  // shared isExpiringSoon predicate (src/lib/pantryExpiry.ts) so they always
  // agree on the day-0-inclusive boundary. See that module for history.
  const getExpiringItems = () => pantry.filter(item => isExpiringSoon(item));

  // Fetch the next page of pantry items and append (de-duping on id so a
  // boundary overlap or an optimistic insert can't produce duplicate rows).
  const loadMorePantry = async () => {
    if (pantryLoadingMore) return;
    setPantryLoadingMore(true);
    try {
      const next = await pantryService.getAll({ limit: LIST_PAGE_SIZE, offset: pantry.length });
      const mapped = next.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        expiryDate: item.expiry_date,
        emoji: item.emoji || undefined,
      }));
      setPantry(prev => {
        const seen = new Set(prev.map(i => i.id));
        return [...prev, ...mapped.filter(i => !seen.has(i.id))];
      });
      setPantryHasMore(next.length === LIST_PAGE_SIZE);
    } catch (error) {
      console.error('❌ Error loading more pantry items:', error);
    } finally {
      setPantryLoadingMore(false);
    }
  };

  // Fetch the next page of shopping items and append (de-duping on id).
  const loadMoreShopping = async () => {
    if (shoppingLoadingMore) return;
    setShoppingLoadingMore(true);
    try {
      const next = await shoppingService.getAll({ limit: LIST_PAGE_SIZE, offset: shoppingList.length });
      const mapped = next.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        checked: item.checked,
        priority: item.priority as 'high' | 'medium' | 'low',
      }));
      setShoppingList(prev => {
        const seen = new Set(prev.map(i => i.id));
        return [...prev, ...mapped.filter(i => !seen.has(i.id))];
      });
      setShoppingHasMore(next.length === LIST_PAGE_SIZE);
    } catch (error) {
      console.error('❌ Error loading more shopping items:', error);
    } finally {
      setShoppingLoadingMore(false);
    }
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
        success(t('toasts.addedIngredientsToShopping', { count: newItems.length }));
      } catch (error) {
        console.error('Error adding shopping items:', error);
        warning(t('toasts.failedAddSomeItems'));
      }
    } else {
      info(t('toasts.alreadyHaveIngredients'));
    }
  };

  // Logs a recipe's calories to today's total (cross-feature: needs setTodayCalories, owned here).
  const handleLogRecipeCalories = async (recipe: Recipe) => {
    const calories = recipe.nutrition!.calories;
    try {
      await calorieService.logCalories(calories, 'meal', recipe.name);
      setTodayCalories(prev => prev + calories);
      success(t('toasts.addedCalories', { calories, name: recipe.name }));
    } catch (err) {
      console.error('Error logging calories:', err);
      error(t('toasts.failedAddCalories'));
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
      success(t('toasts.shoppingListCopied'));
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
          <title>Shopping List - ${escapeHtml(new Date().toLocaleDateString())}</title>
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
          <p><strong>Date:</strong> ${escapeHtml(new Date().toLocaleDateString())}</p>
          <p><strong>Total:</strong> ${shoppingList.length} items (${shoppingList.filter(i => !i.checked).length} remaining)</p>
          <hr>
          ${shoppingList.map(item => `
            <div class="item ${item.checked ? 'checked' : ''}">
              ${item.checked ? '☑' : '☐'} ${escapeHtml(String(item.quantity))} ${escapeHtml(item.unit)} ${escapeHtml(item.name)}
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
    setIsEditCustomUnit(false);
    setEditCustomUnit('');
    setNewPantryItem({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      expiryDate: item.expiryDate || '',
      emoji: item.emoji,
    });
    setShowEditPantry(true);
  };

  const handleSmartSearchChange = (query: string) => {
    setSmartSearchQuery(query);
    setSelectedFood(null);
    if (query.length >= 2) {
      const lang = i18n.language || 'en';
      setSmartSearchResults(searchFoods(query, lang));
    } else {
      setSmartSearchResults([]);
    }
  };

  const handleSelectFood = (food: FoodEntry) => {
    const lang = i18n.language || 'en';
    const displayName = getFoodDisplayName(food, lang);
    setSelectedFood(food);
    setSmartSearchQuery(displayName);
    setSmartSearchResults([]);
    setNewPantryItem(prev => ({
      ...prev,
      name: displayName,
      quantity: '' as any,
      unit: food.defaultUnit,
      category: food.category,
      expiryDate: '',
      emoji: food.emoji,
    }));
  };

  const handleAcceptSmartExpiry = () => {
    if (!selectedFood) return;
    const date = getSmartExpiryDate(selectedFood);
    setNewPantryItem(prev => ({ ...prev, expiryDate: date }));
  };

  const handleResetSmartSearch = () => {
    setSmartSearchQuery('');
    setSmartSearchResults([]);
    setSelectedFood(null);
    setManualQuery('');
    setCustomUnitValue('');
    setIsCustomUnit(false);
    setNewPantryItem({ name: '', quantity: 1, unit: 'pc', category: 'other', expiryDate: '', emoji: undefined });
  };

  const handleSaveEditPantryItem = async () => {
    if (!editingPantryItem || !newPantryItem.name.trim()) return;
    const quantity = typeof newPantryItem.quantity === 'number' ? newPantryItem.quantity : 1;
    try {
      await pantryService.update(editingPantryItem.id, {
        name: newPantryItem.name.trim(),
        quantity,
        unit: newPantryItem.unit,
        category: newPantryItem.category,
        expiryDate: newPantryItem.expiryDate || undefined,
        emoji: newPantryItem.emoji,
      });
      setPantry(prev => prev.map(item =>
        item.id === editingPantryItem.id
          ? {
              ...item,
              name: newPantryItem.name.trim(),
              quantity,
              unit: newPantryItem.unit,
              category: newPantryItem.category,
              expiryDate: newPantryItem.expiryDate || undefined,
              emoji: newPantryItem.emoji,
            }
          : item
      ));
      success(t('toasts.pantryItemUpdated'));
    } catch (err) {
      console.error('Error updating pantry item:', err);
      warning(t('toasts.failedAddItem'));
    }
    setShowEditPantry(false);
    setEditingPantryItem(null);
    setNewPantryItem({ name: '', quantity: 1, unit: 'pc', category: 'other', expiryDate: '', emoji: undefined });
  };

  // Persist scanned items to the database so they survive navigation and can
  // be edited later (local-only Date.now() ids break pantryService.update).
  const addScannedItemsToPantry = async (names: string[]) => {
    try {
      const savedItems = await Promise.all(names.map(name =>
        pantryService.add({ name, quantity: 1, unit: 'pc', category: 'other' })
      ));
      setPantry(prev => [...prev, ...savedItems.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        expiryDate: item.expiry_date || undefined,
        emoji: item.emoji || undefined,
      }))]);
      success(t('toasts.addedItemsToPantry', { count: names.length }));
    } catch (err) {
      // Keep the scan results visible locally so they aren't lost outright,
      // but tell the user the save failed.
      setPantry(prev => [...prev, ...names.map(name => ({
        id: `${Date.now()}-${Math.random()}`,
        name,
        quantity: 1,
        unit: 'pc',
        category: 'other',
      }))]);
      warning(t('toasts.failedAddItem'));
    }
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
        if (document.body.contains(modal)) {
          document.body.removeChild(modal);
        }
        setShowImageUpload(false);
        setScanMode('menu');
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

              const response = await authFetch(`${API_BASE}/vision/analyze-ingredients`, {
                method: 'POST',
                body: formData
              });

              if (!response.ok) throw new Error(`API error: ${response.status}`);

              const data = await response.json();

              if (data.success && data.ingredients.length > 0) {
                if (cameraSource === 'pantry') {
                  // Add to pantry (persisted to the database)
                  await addScannedItemsToPantry(data.ingredients);

                  // Switch to pantry tab
                  setCurrentTab('pantry');
                } else {
                  // Add to recipe ingredients
                  const newIngredients = data.ingredients.filter(
                    (ing: string) => !ingredientTags.includes(ing.toLowerCase())
                  );

                  setIngredientTags(prev => [...prev, ...newIngredients]);
                  success(t('toasts.foundIngredients', { count: data.ingredients.length }));

                  // Switch to recipes tab
                  setCurrentTab('recipes');
                }

                window.scrollTo({ top: 0, behavior: 'smooth' });
              } else {
                warning(t('toasts.noItemsDetected'));
              }
            } catch (err) {
              console.error('Image analysis error:', err);
              error(t('toasts.failedAnalyzeImage'));
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
      error(t('toasts.cameraAccessDenied'));
    }
  };
  const lookupBarcodeWithImage = async (imageData: string) => {
    try {
      console.log('🔍 Looking up product using vision AI...');
      
      // Vision AI (FIRST - Most accurate with actual product image)
      try {
        console.log('👁️ Using GPT-4 Vision to identify product...');
        const visionResponse = await authFetch(`${API_BASE}/barcode/vision-lookup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ image: imageData })
        });
        
        if (visionResponse.ok) {
          const visionData = await visionResponse.json();
          console.log('Vision API response:', visionData);
          
          // List of example/placeholder products to reject
          const placeholders = [
            'coca-cola classic',
            'kraft macaroni',
            'kraft singles',
            'american cheese slices',
            'horizon organic',
            "lay's classic",
            'parle g biscuit',
            'parle-g biscuit',
            'parle g gold',
            'unknown product',
            'example product',
            'sample product'
          ];
          
          const productNameLower = (visionData.name || '').toLowerCase();
          const isPlaceholder = placeholders.some(p => productNameLower.includes(p));
          const hasValidBarcode = visionData.barcode && visionData.barcode !== 'unreadable' && visionData.barcode.length >= 8;
          
          // Check if this is a suspiciously generic response
          const isGeneric = productNameLower === 'pasta' || productNameLower === 'sauce' || 
                           productNameLower === 'cheese' || productNameLower === 'tomatoes';
          
          if (visionData.name && visionData.name.trim() && !isPlaceholder && !isGeneric && hasValidBarcode) {
            console.log('✅ Found from Vision AI:', visionData.name);
            console.log('📊 Barcode read:', visionData.barcode);
            const confidenceEmoji = visionData.confidence === 'high' ? '💯' : visionData.confidence === 'medium' ? '✅' : '⚠️';
            success(t('toasts.productIdentified', { emoji: confidenceEmoji, name: visionData.name }));
            return {
              name: visionData.name.trim(),
              category: visionData.category || 'other',
              expiryDays: null
            };
          } else if (isPlaceholder) {
            console.log('⚠️ Vision API returned placeholder/example, rejecting...');
          } else if (!hasValidBarcode) {
            console.log('⚠️ Vision API could not read barcode clearly');
          }
        }
      } catch (err) {
        console.log('❌ Vision AI failed:', err);
      }
      
      // If vision fails, return null to trigger fallback
      return null;
      
    } catch (error) {
      console.error('💥 Vision lookup error:', error);
      return null;
    }
  };

  const lookupBarcode = async (barcode: string) => {
    try {
      console.log('🔍 Looking up barcode:', barcode);
      
      // Method 1: OpenAI (FIRST - Most reliable for product identification)
      try {
        console.log('🤖 Trying OpenAI first...');
        const aiResponse = await authFetch(`${API_BASE}/barcode/ai-lookup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ barcode })
        });
        
        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          console.log('OpenAI response:', aiData);
          
          if (aiData.name && aiData.name.trim() && !aiData.name.includes('Unknown Product')) {
            console.log('✅ Found from OpenAI:', aiData.name);
            success(t('toasts.productIdentifiedAI'));
            return {
              name: aiData.name.trim(),
              category: aiData.category || 'other',
              expiryDays: null
            };
          }
        }
      } catch (err) {
        console.log('❌ OpenAI failed, trying backup APIs...', err);
      }
      
      // Method 2: OpenFoodFacts (Backup - BEST for food - FREE, no key needed, huge database)
      try {
        console.log('📡 Trying OpenFoodFacts as backup...');
        const offResponse = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
        
        if (offResponse.ok) {
          const offData = await offResponse.json();
          console.log('OpenFoodFacts response:', offData);
          
          if (offData.status === 1 && offData.product) {
            const product = offData.product;
            const productName = 
              product.product_name || 
              product.product_name_en ||
              product.generic_name || 
              (product.brands && product.product_name ? `${product.brands} ${product.product_name}` : null) ||
              product.brands ||
              null;
            
            if (productName && productName.trim()) {
              console.log('✅ Found from OpenFoodFacts:', productName);
              
              // Try to determine category from OpenFoodFacts categories
              let category = 'other';
              if (product.categories_tags) {
                const cats = product.categories_tags;
                if (cats.some((c: string) => c.includes('meat') || c.includes('poultry') || c.includes('beef') || c.includes('chicken'))) {
                  category = 'meat';
                } else if (cats.some((c: string) => c.includes('dairy') || c.includes('milk') || c.includes('cheese') || c.includes('yogurt'))) {
                  category = 'dairy';
                } else if (cats.some((c: string) => c.includes('fruit') || c.includes('vegetable') || c.includes('produce'))) {
                  category = 'produce';
                } else if (cats.some((c: string) => c.includes('cereal') || c.includes('grain') || c.includes('bread') || c.includes('pasta'))) {
                  category = 'grains';
                } else if (cats.some((c: string) => c.includes('canned') || c.includes('preserved'))) {
                  category = 'canned';
                } else if (cats.some((c: string) => c.includes('breakfast'))) {
                  category = 'breakfast';
                }
              }
              
              return {
                name: productName.trim(),
                category: category,
                expiryDays: null
              };
            }
          }
        }
      } catch (err) {
        console.log('❌ OpenFoodFacts failed:', err);
      }
      
      // Method 3: UPCitemdb (Backup - Good for general products - FREE trial - 100 per day)
      try {
        console.log('📡 Trying UPCitemdb as backup...');
        const upcResponse = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`);
        
        if (upcResponse.ok) {
          const upcData = await upcResponse.json();
          console.log('UPCitemdb response:', upcData);
          
          if (upcData.items && upcData.items.length > 0) {
            const item = upcData.items[0];
            const itemName = item.title || item.brand || null;
            
            if (itemName && itemName.trim()) {
              console.log('✅ Found from UPCitemdb:', itemName);
              
              // Map category
              let category = 'other';
              const cat = (item.category || '').toLowerCase();
              if (cat.includes('food') || cat.includes('grocery')) category = 'other';
              if (cat.includes('produce') || cat.includes('fruit') || cat.includes('vegetable')) category = 'produce';
              if (cat.includes('dairy') || cat.includes('milk') || cat.includes('cheese')) category = 'dairy';
              if (cat.includes('meat') || cat.includes('poultry')) category = 'meat';
              if (cat.includes('canned') || cat.includes('packaged')) category = 'canned';
              if (cat.includes('cereal') || cat.includes('grain') || cat.includes('bread')) category = 'grains';
              if (cat.includes('breakfast')) category = 'breakfast';
              
              return {
                name: itemName.trim(),
                category: category,
                expiryDays: null
              };
            }
          }
        }
      } catch (err) {
        console.log('❌ UPCitemdb failed:', err);
      }
      
      // Method 4: Barcode Spider (Last backup - with your API token)
      try {
        console.log('📡 Trying Barcode Spider as last backup...');
        const spiderResponse = await fetch(`https://api.barcodespider.com/v1/lookup?token=03abb14d5d130e66277e&upc=${barcode}`);
        
        if (spiderResponse.ok) {
          const spiderData = await spiderResponse.json();
          console.log('Barcode Spider response:', spiderData);
          
          if (spiderData && spiderData.item_response && spiderData.item_response.code === 200) {
            const item = spiderData.item_response.item;
            if (item && item.title && item.title.trim()) {
              console.log('✅ Found from Barcode Spider:', item.title);
              return {
                name: item.title.trim(),
                category: item.category || 'other',
                expiryDays: null
              };
            }
          }
        }
      } catch (err) {
        console.log('❌ Barcode Spider failed:', err);
      }
      
      // All APIs failed - return placeholder
      console.log('⚠️ Product not found in any database');
      warning(t('toasts.productNotFound'));
      return {
        name: `Item ${barcode.substring(barcode.length - 6)}`,
        category: 'other',
        expiryDays: null
      };
      
    } catch (error) {
      console.error('💥 Barcode lookup error:', error);
      warning(t('toasts.barcodeLookupFailed'));
      return {
        name: `Item ${barcode.substring(barcode.length - 6)}`,
        category: 'other',
        expiryDays: null
      };
    }
  };
  const handleBarcodeScanner = async () => {
    try {
      setBarcodeScanning(true);
      
      // Import Quagga dynamically
      const Quagga = await import('quagga');
      
      // Track if we've already processed a barcode
      let isProcessing = false;
      let lastScannedCode = '';
      
      // Create scanner container
      const scannerDiv = document.createElement('div');
      scannerDiv.id = 'barcode-scanner';
      scannerDiv.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.95);z-index:2000;display:flex;flex-direction:column;align-items:center;justify-content:center;';
      
      const videoContainer = document.createElement('div');
      videoContainer.style.cssText = 'width:90%;max-width:640px;height:480px;position:relative;';
      
      const instructions = document.createElement('div');
      instructions.style.cssText = 'color:white;text-align:center;margin-bottom:1rem;font-size:1.1rem;font-weight:600;';
      instructions.textContent = '📱 Position barcode in the frame';
      
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.cssText = 'margin-top:1rem;padding:0.75rem 2rem;background:#ef4444;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:1rem;position:relative;z-index:10;';
      
      // Attach cancel handler BEFORE adding to DOM
      cancelBtn.onclick = () => {
        try {
          Quagga.stop();
          Quagga.offDetected(() => {});
        } catch (e) {
          console.error('Error stopping Quagga:', e);
        }
        if (document.body.contains(scannerDiv)) {
          document.body.removeChild(scannerDiv);
        }
        setBarcodeScanning(false);
        setShowImageUpload(false);
        setScanMode('menu');
      };
      
      scannerDiv.appendChild(instructions);
      scannerDiv.appendChild(videoContainer);
      scannerDiv.appendChild(cancelBtn);
      document.body.appendChild(scannerDiv);
      
      // Initialize Quagga
      Quagga.init({
        inputStream: {
          name: 'Live',
          type: 'LiveStream',
          target: videoContainer,
          constraints: {
            facingMode: 'environment',
            width: 640,
            height: 480
          }
        },
        decoder: {
          readers: [
            'ean_reader',
            'ean_8_reader',
            'upc_reader',
            'upc_e_reader',
            'code_128_reader',
            'code_39_reader'
          ]
        },
        locate: true
      }, (err: any) => {
        if (err) {
          console.error('Quagga initialization error:', err);
          error(t('toasts.failedStartBarcode'));
          if (document.body.contains(scannerDiv)) {
            document.body.removeChild(scannerDiv);
          }
          setBarcodeScanning(false);
          setShowImageUpload(false);
          setScanMode('menu');
          return;
        }
        Quagga.start();
      });
      
      // Track consecutive high-quality scans for the same barcode
      let consecutiveScans = 0;
      let currentBestQuality = 1.0;
      
      // Handle barcode detection with validation and image capture
      Quagga.onDetected(async (result: any) => {
        const code = result.codeResult.code;
        
        // Validate barcode completeness and quality
        // Standard UPC/EAN barcodes are 8, 12, 13, or 14 digits
        const isValidLength = code.length === 8 || code.length === 12 || code.length === 13 || code.length === 14;
        const isNumeric = /^\d+$/.test(code);
        
        // Check quality of the scan (Quagga provides this)
        const quality = result.codeResult.decodedCodes
          .filter((x: any) => x.error !== undefined)
          .map((x: any) => x.error)
          .reduce((a: number, b: number) => a + b, 0) / result.codeResult.decodedCodes.length;
        
        // STRICT quality threshold - only accept very clear reads
        if (!isValidLength || !isNumeric || quality > 0.08) {
          console.log('❌ Invalid or low-quality barcode scan:', { code, isValidLength, isNumeric, quality: quality.toFixed(3) });
          // Update instructions to help user
          instructions.textContent = '📱 Hold steady - Getting clearer read...';
          instructions.style.color = '#fbbf24'; // Yellow warning
          
          // Reset consecutive scan counter
          consecutiveScans = 0;
          currentBestQuality = 1.0;
          return;
        }
        
        // Track if we're getting the same barcode repeatedly (stability check)
        if (code === lastScannedCode) {
          consecutiveScans++;
          currentBestQuality = Math.min(currentBestQuality, quality);
          
          // Update UI to show progress
          instructions.textContent = `📊 Stabilizing... (${consecutiveScans}/3 reads)`;
          instructions.style.color = '#3b82f6'; // Blue - in progress
          
          // Wait for 3 consecutive high-quality reads of the same barcode
          if (consecutiveScans < 3) {
            console.log(`📊 Consecutive scan ${consecutiveScans}/3, quality: ${quality.toFixed(3)}`);
            return;
          }
        } else {
          // Different barcode detected, reset counter
          consecutiveScans = 1;
          currentBestQuality = quality;
          lastScannedCode = code;
          instructions.textContent = '📊 Stabilizing... (1/3 reads)';
          instructions.style.color = '#3b82f6';
          return;
        }
        
        // Prevent duplicate processing
        if (isProcessing) {
          console.log('Already processing, skipping...');
          return;
        }
        
        isProcessing = true;
        console.log('✅ STABLE barcode detected:', code, 'best quality:', currentBestQuality.toFixed(3), 'consecutive reads:', consecutiveScans);
        
        // Visual feedback - successful scan
        instructions.textContent = '✅ Barcode locked! Capturing high-quality image...';
        instructions.style.color = '#10b981'; // Green success
        
        // WAIT A MOMENT for camera to stabilize, then capture
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // CAPTURE HIGH-QUALITY IMAGE
        let capturedImage: string | null = null;
        try {
          // Get the canvas that Quagga is using
          const canvas = videoContainer.querySelector('canvas');
          if (canvas) {
            // Create a higher quality version of the image
            // Use JPEG quality 0.95 for better text/number readability
            capturedImage = canvas.toDataURL('image/jpeg', 0.95);
            console.log('📸 High-quality image captured from camera');
            console.log(`📐 Image size: ${canvas.width}x${canvas.height}`);
          } else {
            console.warn('⚠️ Could not find canvas to capture image');
          }
        } catch (imgErr) {
          console.error('Failed to capture image:', imgErr);
        }
        
        // Stop scanner and cleanup
        try {
          Quagga.stop();
          Quagga.offDetected(() => {});
        } catch (e) {
          console.error('Error stopping Quagga:', e);
        }
        
        if (document.body.contains(scannerDiv)) {
          document.body.removeChild(scannerDiv);
        }
        setBarcodeScanning(false);
        
        // Show loading
        setRecipeLoading(true);
        
        // Try vision API first if we captured an image
        let productInfo = null;
        if (capturedImage) {
          productInfo = await lookupBarcodeWithImage(capturedImage);
        }
        
        // If vision failed or no image, fallback to barcode number lookup
        if (!productInfo) {
          if (capturedImage) {
            console.log('⚠️ Vision lookup failed, trying barcode number...');
          }
          productInfo = await lookupBarcode(code);
        }
        
        console.log('Product info received:', productInfo);
        
        // Calculate expiry date if we have days
        let expiryDate = '';
        if (productInfo.expiryDays) {
          const expiry = new Date();
          expiry.setDate(expiry.getDate() + productInfo.expiryDays);
          expiryDate = expiry.toISOString().split('T')[0];
        }
        
        // Add to pantry with pre-filled data
        const newItem: PantryItem = {
          id: `${Date.now()}-${Math.random()}`,
          name: productInfo.name,
          quantity: 1,
          unit: 'pc',
          category: productInfo.category as any,
          expiryDate: expiryDate || undefined
        };
        
        // Add to local state first
        setPantry(prev => [...prev, newItem]);
        
        // If user is logged in, also save to database to prevent disappearing
        if (user) {
          try {
            const dbItem = await pantryService.add({
              name: newItem.name,
              quantity: newItem.quantity,
              unit: newItem.unit,
              category: newItem.category,
              expiryDate: newItem.expiryDate
            });
            console.log('✅ Saved scanned item to database:', dbItem);
            
            // Update the item with the database ID
            setPantry(prev => prev.map(item => 
              item.id === newItem.id ? { ...item, id: dbItem.id } : item
            ));
          } catch (dbError) {
            console.error('⚠️ Failed to save to database:', dbError);
            // Item still in local state, so user can see it
          }
        }
        
        setRecipeLoading(false);
        
        // Show success message
        if (productInfo.name.includes('Scanned Item')) {
          success(t('toasts.addedWithEdit'));
        } else {
          success(t('toasts.addedToPantry', { name: productInfo.name }));
        }
        
        setShowImageUpload(false);
        setCurrentTab('pantry');
      });
      
    } catch (err) {
      console.error('Barcode scanner error:', err);
      error(t('toasts.failedInitBarcode'));
      setBarcodeScanning(false);
    }
  };
  const handleExpiryScanner = async () => {
    try {
      setExpiryScanning(true);
      
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });

      // Create video element
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;

      // Create modal
      const modal = document.createElement('div');
      modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.95);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:2000;';
      
      video.style.cssText = 'max-width:90%;max-height:60vh;border-radius:12px;';

      const instructions = document.createElement('div');
      instructions.style.cssText = 'color:white;text-align:center;margin-bottom:1rem;font-size:1.1rem;font-weight:600;';
      instructions.innerHTML = '📅 Position expiration date in frame<br/><span style="font-size:0.875rem;opacity:0.8;">Look for: EXP, Best By, Use By, etc.</span>';

      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = 'display:flex;gap:1rem;margin-top:1rem;';

      const captureBtn = document.createElement('button');
      captureBtn.textContent = '📸 Scan Date';
      captureBtn.style.cssText = 'padding:1rem 2rem;background:#10b981;color:white;border:none;border-radius:12px;font-weight:600;cursor:pointer;font-size:1rem;';

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.cssText = 'padding:1rem 2rem;background:#ef4444;color:white;border:none;border-radius:12px;font-weight:600;cursor:pointer;font-size:1rem;';

      const cleanup = () => {
        stream.getTracks().forEach(track => track.stop());
        document.body.removeChild(modal);
        setExpiryScanning(false);
        setShowImageUpload(false);
        setScanMode('menu');
      };

      captureBtn.onclick = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0);

        cleanup();
        setRecipeLoading(true);

        try {
          // Import Tesseract dynamically
          const Tesseract = (await import('tesseract.js')).default;
          
          // Perform OCR
          const { data: { text } } = await Tesseract.recognize(
            canvas.toDataURL('image/jpeg'),
            'eng',
            {
              logger: (m: any) => console.log(m)
            }
          );

          console.log('OCR Result:', text);

          // Parse expiration date from text
          const datePatterns = [
            // Standard numeric formats
            /(?:exp|expires?|expiry|best\s*by|use\s*by|bb)[:\s]*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
            /(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/,
            /(\d{4}[\/-]\d{1,2}[\/-]\d{1,2})/,
            
            // Handle "26 FEB 25" or "26 FEB. 25" format
            /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\.?\s+(\d{2,4})/i,
            
            // Handle "FEB 26 25" format
            /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\.?\s+(\d{1,2})\s+(\d{2,4})/i,
            
            // Handle "26-FEB-25" format with separators
            /(\d{1,2})[\s\-\.](jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\.?[\s\-\.](\d{2,4})/i,
            
            // Handle "26FEB25" no spaces
            /(\d{1,2})(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)(\d{2,4})/i
          ];

          // Month name to number mapping
          const monthMap: { [key: string]: number } = {
            'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
            'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
          };

          let foundDate = '';
          let parsedDate: Date | null = null;

          for (const pattern of datePatterns) {
            const match = text.match(pattern);
            if (match) {
              console.log('📅 Date pattern matched:', match[0]);
              
              // Check if it's a month-name format
              const hasMonth = match[0].match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i);
              
              if (hasMonth) {
                // Parse month-name format (26 FEB 25)
                const monthMatch = match[0].match(/(\d{1,2})\s*[\-\.]?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\.?\s*[\-\.]?(\d{2,4})/i);
                
                if (monthMatch) {
                  const day = parseInt(monthMatch[1]);
                  const month = monthMap[monthMatch[2].toLowerCase()];
                  let year = parseInt(monthMatch[3]);
                  
                  // Handle 2-digit year
                  if (year < 100) {
                    year += 2000;
                  }
                  
                  parsedDate = new Date(year, month, day);
                  console.log('✅ Parsed date with month name:', parsedDate);
                  break;
                }
              } else {
                // Standard numeric format
                foundDate = match[1];
                break;
              }
            }
          }

          // If we found a date with month name, use it
          if (parsedDate && !isNaN(parsedDate.getTime())) {
            const formattedDate = parsedDate.toISOString().split('T')[0];
            setDetectedExpiry(formattedDate);
            success(t('toasts.detectedExpiry', { date: formattedDate }));

            setNewPantryItem(prev => ({
              ...prev,
              expiryDate: formattedDate
            }));
            setShowAddPantry(true);
          } else if (foundDate) {
            // Try parsing standard numeric format
            let dateObj = new Date(foundDate);
            if (isNaN(dateObj.getTime())) {
              const parts = foundDate.split(/[\/-]/);
              if (parts.length === 3) {
                dateObj = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
              }
            }

            if (!isNaN(dateObj.getTime())) {
              const formattedDate = dateObj.toISOString().split('T')[0];
              setDetectedExpiry(formattedDate);
              success(t('toasts.detectedExpiry', { date: formattedDate }));

              setNewPantryItem(prev => ({
                ...prev,
                expiryDate: formattedDate
              }));
              setShowAddPantry(true);
            } else {
              warning(t('toasts.couldNotParseDate'));
            }
          } else {
            warning(t('toasts.noExpiryFound'));
          }

        } catch (err) {
          console.error('OCR error:', err);
          error(t('toasts.failedReadExpiry'));
        } finally {
          setRecipeLoading(false);
          setShowImageUpload(false);
        }
      };

      cancelBtn.onclick = cleanup;

      modal.appendChild(instructions);
      modal.appendChild(video);
      buttonContainer.appendChild(captureBtn);
      buttonContainer.appendChild(cancelBtn);
      modal.appendChild(buttonContainer);
      document.body.appendChild(modal);

    } catch (err) {
      console.error('Camera access error:', err);
      error(t('toasts.cameraAccessDenied'));
      setExpiryScanning(false);
    }
  };
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      error(t('toasts.pleaseUploadImage'));
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      error(t('toasts.imageTooLarge'));
      return;
    }

    setRecipeLoading(true);

    try {
      // Create FormData to send file
      const formData = new FormData();
      formData.append('file', file);

      // Send to backend
      const response = await authFetch(`${API_BASE}/vision/analyze-ingredients`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.ingredients.length > 0) {
        if (cameraSource === 'pantry') {
          // Add to pantry (persisted to the database)
          await addScannedItemsToPantry(data.ingredients);

          // Close modal and switch to pantry tab
          setShowImageUpload(false);
          setCurrentTab('pantry');
        } else {
          // Add to recipe ingredients
          const newIngredients = data.ingredients.filter(
            (ing: string) => !ingredientTags.includes(ing.toLowerCase())
          );

          setIngredientTags(prev => [...prev, ...newIngredients]);
          success(t('toasts.foundIngredients', { count: data.ingredients.length }));

          // Close modal and switch to recipes tab
          setShowImageUpload(false);
          setCurrentTab('recipes');
        }

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        warning(t('toasts.noItemsDetected'));
      }

    } catch (err) {
      console.error('Image analysis error:', err);
      error(t('toasts.failedAnalyzeImage'));
    } finally {
      setRecipeLoading(false);
      // Reset file input
      e.target.value = '';
    }
  };
  const analyzeReceiptImage = async (canvas: HTMLCanvasElement) => {
    setRecipeLoading(true);
    try {
      const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
      if (!blob) {
        throw new Error('Failed to capture image from camera');
      }

      const formData = new FormData();
      formData.append('file', blob, 'receipt.jpg');

      const response = await authFetch(`${API_BASE}/vision/analyze-receipt`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.items?.length > 0) {
        setReceiptItems(data.items.map((item: any) => {
          const matchedFood = searchFoods(item.name, i18n.language || 'en', 1)[0];
          return {
            id: `${Date.now()}-${Math.random()}`,
            name: item.name,
            quantity: item.quantity ?? null,
            unit: item.unit,
            category: item.category,
            confidence: item.confidence,
            rawText: item.raw_text || '',
            selected: item.confidence !== 'low',
            emoji: matchedFood?.emoji,
          };
        }));
        setReceiptRejectedCount(data.rejected_lines_count || 0);
        setShowReceiptReview(true);
      } else {
        warning(t('toasts.noReceiptItemsDetected'));
      }
    } catch (err) {
      console.error('Receipt analysis error:', err);
      error(t('toasts.failedAnalyzeReceipt'));
    } finally {
      setRecipeLoading(false);
      setShowImageUpload(false);
    }
  };
  const handleReceiptScanner = async () => {
    try {
      setReceiptScanning(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;

      const modal = document.createElement('div');
      modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.95);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:2000;';

      video.style.cssText = 'max-width:90%;max-height:60vh;border-radius:12px;';

      const instructions = document.createElement('div');
      instructions.style.cssText = 'color:white;text-align:center;margin-bottom:1rem;font-size:1.1rem;font-weight:600;';
      instructions.innerHTML = '🧾 Position the receipt in frame';

      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = 'display:flex;gap:1rem;margin-top:1rem;';

      const captureBtn = document.createElement('button');
      captureBtn.textContent = '📸 Scan Receipt';
      captureBtn.style.cssText = 'padding:1rem 2rem;background:#ec4899;color:white;border:none;border-radius:12px;font-weight:600;cursor:pointer;font-size:1rem;';

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.cssText = 'padding:1rem 2rem;background:#ef4444;color:white;border:none;border-radius:12px;font-weight:600;cursor:pointer;font-size:1rem;';

      const cleanup = () => {
        stream.getTracks().forEach(track => track.stop());
        document.body.removeChild(modal);
        setReceiptScanning(false);
        setShowImageUpload(false);
        setScanMode('menu');
      };

      captureBtn.onclick = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0);

        cleanup();
        await analyzeReceiptImage(canvas);
      };

      cancelBtn.onclick = cleanup;

      modal.appendChild(instructions);
      modal.appendChild(video);
      buttonContainer.appendChild(captureBtn);
      buttonContainer.appendChild(cancelBtn);
      modal.appendChild(buttonContainer);
      document.body.appendChild(modal);

    } catch (err) {
      console.error('Camera access error:', err);
      error(t('toasts.cameraAccessDenied'));
      setReceiptScanning(false);
    }
  };
  const confirmReceiptItems = async () => {
    const selected = receiptItems.filter(item => item.selected);
    if (selected.length === 0) {
      setShowReceiptReview(false);
      setReceiptItems([]);
      setScanMode('menu');
      return;
    }

    const missingQuantity = selected.filter(item => !item.quantity || item.quantity <= 0);
    if (missingQuantity.length > 0) {
      warning(t('toasts.receiptMissingQuantity', { count: missingQuantity.length }));
      return;
    }

    try {
      const savedItems = await Promise.all(selected.map(item =>
        pantryService.add({
          name: item.name,
          quantity: item.quantity as number,
          unit: item.unit,
          category: item.category,
          emoji: item.emoji,
        })
      ));
      setPantry(prev => [...prev, ...savedItems.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        expiryDate: item.expiry_date || undefined,
        emoji: item.emoji || undefined,
      }))]);
      success(t('toasts.addedItemsToPantry', { count: savedItems.length }));
      setCurrentTab('pantry');
    } catch (err) {
      console.error('Failed to save receipt items:', err);
      error(t('toasts.failedAddSomeItems'));
    } finally {
      setShowReceiptReview(false);
      setReceiptItems([]);
      setReceiptRejectedCount(0);
      setScanMode('menu');
    }
  };
  // Add a ref to track the latest API call
  const priceComparisonAbortController = useRef<AbortController | null>(null);

  const fetchPriceComparison = useCallback(async () => {
    // Cancel any in-flight request
    if (priceComparisonAbortController.current) {
      priceComparisonAbortController.current.abort();
    }

    if (shoppingList.length === 0) {
      setPriceComparison({ amazon: 0, walmart: 0, loading: false });
      return;
    }

    setPriceComparison(prev => ({ ...prev, loading: true }));
    
    // Create new abort controller for this request
    const controller = new AbortController();
    priceComparisonAbortController.current = controller;
    
    try {
      // Call backend API for AI-powered price comparison
      const response = await authFetch(`${API_BASE}/shopping/ai-price-comparison`, {
        signal: controller.signal,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: shoppingList.map(item => ({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit
          }))
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Only update if this request wasn't cancelled
        if (!controller.signal.aborted) {
          setPriceComparison({
            amazon: data.amazon_total || 0,
            walmart: data.walmart_total || 0,
            loading: false
          });
          console.log('✅ AI Price Comparison:', data);
        }
      } else {
        throw new Error('Backend API request failed');
      }
    } catch (err) {
      // Ignore abort errors (they're expected)
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('🚫 Price comparison cancelled (newer request in progress)');
        return;
      }
      
      console.error('Price comparison error:', err);
      
      // Only update on error if not aborted
      if (!controller.signal.aborted) {
        const itemCount = shoppingList.reduce((sum, item) => sum + item.quantity, 0);
        setPriceComparison({
          amazon: itemCount * 3.5,
          walmart: itemCount * 2.8,
          loading: false
        });
        info(t('toasts.estimatedPrices'));
      }
    }
  }, [shoppingList, API_BASE, t, info]);

  useEffect(() => {
    if (currentTab === 'shopping' && shoppingList.length > 0) {
      // Debounce: wait 500ms after last change before fetching prices
      const timer = setTimeout(() => {
        fetchPriceComparison();
      }, 500);

      return () => clearTimeout(timer);
    } else if (shoppingList.length === 0) {
      setPriceComparison({ amazon: 0, walmart: 0, loading: false });
    }
  }, [shoppingList.length, currentTab, fetchPriceComparison]);
  const handleDonation = async (location: FoodBank | DropOffSite | null, items: PantryItem[]) => {
      if (!location || items.length === 0) {
        warning(t('toasts.pleaseSelectDonate'));
        return;
      }

      try {
        console.log('🎁 Starting donation process...');
        console.log('📦 Items to donate:', items);
        console.log('📊 Current allItemsImpact state:', allItemsImpact);
        console.log('📊 allItemsImpact keys:', Object.keys(allItemsImpact));
        
        // Use pre-calculated impact data from allItemsImpact
        const donationItems = items.map(item => {
          console.log(`🔍 Looking up impact for ${item.name} (ID: ${item.id})`);
          const impact = allItemsImpact[item.id];
          console.log(`   Found:`, impact);
          
          if (!impact) {
            console.error('⚠️ Missing impact data for item:', item.id, item.name);
            throw new Error(`Missing impact calculation for ${item.name}. Please close and reopen the modal.`);
          }
          
          return {
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            estimatedMeals: impact.meals
          };
        });

        const totalMeals = donationItems.reduce((sum, item) => sum + item.estimatedMeals, 0);
        const totalPounds = items.reduce((sum, item) => sum + allItemsImpact[item.id].pounds, 0);
        const co2Saved = items.reduce((sum, item) => sum + allItemsImpact[item.id].co2_lbs, 0);

        console.log('💾 Saving donation to Supabase...');
        
        // SAVE TO SUPABASE
        await donationService.add({
          date: new Date().toISOString(),
          food_bank: location.name,
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

        success(t('toasts.donationRecorded', { count: totalMeals }));
        setShowDonationModal(false);
        setSelectedFoodBank(null);
        setSelectedDropOffSite(null);
        setItemsToDonate([]);
        
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
          error(t('toasts.databaseSyncError'));
        } else {
          error(t('toasts.failedRecordDonation', { message: err.message || t('common.error') }));
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
        <img src="/icons/logo-icon.svg" alt="GroceryGenius" style={{ height: '3rem' }} />
      </div>
    );
  }

  if (!user) {
    return <Auth onAuthSuccess={() => {}} />;
  }
  return (
    <div style={{ minHeight: '100vh', background: bgColor }}>
      {/* Mobile drawer backdrop */}
      <div
        className={`mobile-drawer-backdrop ${drawerOpen ? 'open' : ''}`}
        onClick={() => setDrawerOpen(false)}
      />

      {/* Mobile slide-out drawer */}
      <div className={`mobile-drawer ${drawerOpen ? 'open' : ''}`}>
        <div className="mobile-drawer-header">
          <img src="/icons/logo-icon.svg" alt="" style={{ height: '1.4rem' }} />
          <h2 className="mobile-drawer-header-title">GroceryGenius</h2>
        </div>

        <nav className="mobile-drawer-nav">
          {([
            { key: 'pantry',    icon: '📦', label: t('tabs.pantry'),    count: pantry.length },
            { key: 'recipes',   icon: '🍳', label: t('tabs.recipes'),   count: null },
            { key: 'mealplan',  icon: '📅', label: t('tabs.mealPlan'),  count: null },
            { key: 'shopping',  icon: '🛒', label: t('tabs.shopping'),  count: shoppingList.filter(i => !i.checked).length },
            { key: 'donate',    icon: '❤️', label: t('tabs.donate'),    count: getExpiringItems().length },
            { key: 'favorites', icon: '⭐', label: t('tabs.favorites'), count: favorites.length },
          ] as const).map(({ key, icon, label, count }) => (
            <button
              key={key}
              className={`mobile-drawer-tab ${currentTab === key ? 'active' : ''}`}
              onClick={() => { handleTabChange(key); setDrawerOpen(false); }}
            >
              <span>{icon}</span>
              <span>{label}</span>
              {count !== null && count > 0 && (
                <span className="mobile-drawer-tab-badge">{count}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="mobile-drawer-footer">
          <button
            className="mobile-drawer-footer-btn"
            onClick={() => { handleTabChange('pantry'); setTourStep(0); setShowTour(true); setDrawerOpen(false); }}
          >
            ❓ {t('common.help')}
          </button>
          <button
            className="mobile-drawer-footer-btn"
            onClick={() => { setShowSettings(true); setDrawerOpen(false); }}
          >
            ⚙️ {t('settings.title')}
          </button>
          <button
            className="mobile-drawer-footer-btn signout"
            onClick={async () => { await authService.signOut(); setUser(null); setDrawerOpen(false); }}
          >
            🚪 {t('header.signOut')}
          </button>
          <LanguageSwitcher compact />
        </div>
      </div>

      <header style={{
        background: cardBg,
        padding: isMobile ? '0.75rem 1rem' : '1rem',
        boxShadow: '0 2px 20px rgba(0,0,0,0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1200px', margin: '0 auto' }}>
          <div className="mobile-header-brand" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <img src="/icons/logo-icon.svg" alt="" style={{ height: isMobile ? '1.25rem' : '1.5rem' }} />
            <h1 className="mobile-page-title" style={{ margin: 0, color: '#10b981', fontSize: isMobile ? '1.25rem' : '1.8rem', fontWeight: '700' }}>
              {t('app.name')}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: isMobile ? '0.5rem' : '0.75rem', alignItems: 'center' }}>
            <button data-tour="calorie-tracker-btn" onClick={() => setShowCalorieTracker(!showCalorieTracker)} style={{
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
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button onClick={() => { handleTabChange('pantry'); setTourStep(0); setShowTour(true); }} style={{
                  padding: '0.5rem 1rem',
                  background: 'linear-gradient(45deg, #8b5cf6, #6366f1)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.875rem'
                }}>
                  ❓ {t('common.help')}
                </button>
                <LanguageSwitcher />
              </div>
            )}
            {!isMobile && (
              <button data-tour="settings-btn" onClick={() => setShowSettings(true)} style={{
                padding: '0.5rem 1rem',
                background: '#f3f4f6',
                color: '#374151',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '1rem',
              }}>
                ⚙️
              </button>
            )}
            {!isMobile && (
              <button onClick={async () => {
                await authService.signOut();
                setUser(null);
              }} style={{
                padding: '0.5rem 1rem',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '1rem'
              }}>
                {t('header.signOut')}
              </button>
            )}
            <button
              className="mobile-hamburger"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      {getExpiringItems().length > 0 && (
        <div style={{ background: '#fee2e2', borderBottom: '2px solid #dc2626', padding: '0.75rem' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', color: '#dc2626', fontWeight: '600' }}>
            ⚠️ {t('donate.itemsExpiring', { count: getExpiringItems().length })}{' '}
            <span className="expiry-banner-items">{getExpiringItems().map(i => i.name).join(', ')}</span>
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
            {tab === 'recipes' && `🍳 ${t('tabs.recipes')}`}
            {tab === 'mealplan' && (isMobile ? `📅 ${t('tabs.mealPlan')}` : `📅 ${t('tabs.mealPlan')}`)}
            {tab === 'pantry' && (isMobile ? `📦 ${pantry.length}` : `📦 ${t('tabs.pantry')} (${pantry.length})`)}
            {tab === 'shopping' && (isMobile ? `🛒 ${shoppingList.filter(i => !i.checked).length}` : `🛒 ${t('tabs.shopping')} (${shoppingList.filter(i => !i.checked).length})`)}
            {tab === 'donate' && (isMobile ? `❤️ ${getExpiringItems().length}` : `❤️ ${t('tabs.donate')} (${getExpiringItems().length})`)}
            {tab === 'favorites' && (isMobile ? `⭐ ${favorites.length}` : `⭐ ${t('tabs.favorites')} (${favorites.length})`)}
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
          <ErrorBoundary context="section:recipes" variant="section">
            <RecipeSection
              isMobile={isMobile}
              cardBg={cardBg}
              mutedText={mutedText}
              pantry={pantry}
              savedProfilePrefs={savedProfilePrefs}
              customDietaryLabels={customDietaryLabels}
              onAddMissingToShopping={addMissingToShopping}
              onLogCalories={handleLogRecipeCalories}
              onScanIngredients={() => { setCameraSource('recipes'); setShowImageUpload(true); }}
              onSuccess={success}
              onWarning={warning}
              onInfo={info}
              onError={error}
            />
          </ErrorBoundary>
        )}
        {currentTab === 'mealplan' && (
          <ErrorBoundary context="section:mealplan" variant="section">
        <div>
        <MealPlanCalendar
          savedRecipes={favorites}
          translatedNames={translatedFavoriteNames}
          pantry={pantry}
          onPantryUpdate={(updatedPantry) => setPantry(updatedPantry)}
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
                success(t('toasts.addedIngredientsToShopping', { count: newItems.length }));
              }, 300);
            } catch (error) {
              console.error('Error adding to shopping list:', error);
              warning(t('toasts.failedAddSomeItems'));
            }
          }}
        />
        </div>
          </ErrorBoundary>
        )}
        {currentTab === 'pantry' && (
          <ErrorBoundary context="section:pantry" variant="section">
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
              }}>📦 {t('pantry.title')}</h2>
              <div style={{ 
                display: 'flex', 
                gap: '0.75rem', 
                flexWrap: 'wrap',
                justifyContent: isMobile ? 'stretch' : 'flex-start'
              }}>
                  <button 
                    onClick={() => {
                      setCameraSource('pantry');
                      setScanMode('menu'); // Reset to menu
                      setShowImageUpload(true);
                    }}
                    data-tour="pantry-scan-btn"
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
                    📷 {t('pantry.scanBarcode')}
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
                      🎁 {isMobile ? `${t('tabs.donate')} (${getExpiringItems().length})` : `${t('tabs.donate')} (${getExpiringItems().length})`}
                    </button>
                  )}
                  <button
                    data-tour="pantry-add-input"
                    className="desktop-add-btn"
                    onClick={() => {
                      if (showAddPantry) handleResetSmartSearch();
                      setShowAddPantry(!showAddPantry);
                    }}
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
                    {showAddPantry ? `✕ ${t('common.cancel')}` : `+ ${t('pantry.addItem')}`}
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
                  className="modal-content"
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
                    ✏️ {t('pantry.editItem')}
                  </h3>

                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {/* Item Name */}
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                        {t('pantry.itemName')}
                      </label>
                      <input
                        type="text"
                        placeholder={t('pantry.itemPlaceholder')}
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
                          {t('pantry.quantity')}
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={newPantryItem.quantity === '' ? '' : newPantryItem.quantity}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewPantryItem(prev => ({ ...prev, quantity: val === '' ? '' as any : parseInt(val) || '' as any }));
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
                          {t('pantry.unit')}
                        </label>
                        {/* Smart items: suggested unit dropdown with Other option */}
                        {editingPantryItem.emoji ? (
                          isEditCustomUnit ? (
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <input
                                type="text"
                                placeholder={t('pantry.customUnit')}
                                value={editCustomUnit}
                                autoFocus
                                onChange={(e) => {
                                  setEditCustomUnit(e.target.value);
                                  setNewPantryItem(prev => ({ ...prev, unit: e.target.value }));
                                }}
                                style={{
                                  flex: 1, padding: '0.75rem', border: '2px solid #8b5cf6',
                                  borderRadius: '8px', fontSize: '1rem', boxSizing: 'border-box',
                                }}
                              />
                              <button
                                onClick={() => { setIsEditCustomUnit(false); setEditCustomUnit(''); setNewPantryItem(prev => ({ ...prev, unit: editingPantryItem.unit })); }}
                                style={{ background: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer', padding: '0 0.75rem', fontSize: '1rem', color: '#6b7280' }}
                              >↩</button>
                            </div>
                          ) : (
                            <select
                              value={newPantryItem.unit}
                              onChange={(e) => {
                                if (e.target.value === '__other__') {
                                  setIsEditCustomUnit(true);
                                  setNewPantryItem(prev => ({ ...prev, unit: '' }));
                                } else {
                                  setNewPantryItem(prev => ({ ...prev, unit: e.target.value }));
                                }
                              }}
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
                              {getSuggestedUnits(newPantryItem.unit).map(u => (
                                <option key={u} value={u}>{t(`pantry.units.${u}`, { defaultValue: u })}</option>
                              ))}
                              {/* Also include current unit if not in suggestions */}
                              {!getSuggestedUnits(newPantryItem.unit).includes(newPantryItem.unit) && newPantryItem.unit && (
                                <option value={newPantryItem.unit}>{t(`pantry.units.${newPantryItem.unit}`, { defaultValue: newPantryItem.unit })}</option>
                              )}
                              <option value="__other__">{t('pantry.otherUnit')}</option>
                            </select>
                          )
                        ) : (
                          /* Manual items: standard unit select */
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
                            <option value="pc">{t('pantry.units.pieces')}</option>
                            <option value="lbs">{t('pantry.units.lbs')}</option>
                            <option value="kg">{t('pantry.units.kg')}</option>
                            <option value="cups">{t('pantry.units.cups')}</option>
                            <option value="oz">{t('pantry.units.oz')}</option>
                            <option value="g">{t('pantry.units.grams')}</option>
                            <option value="ml">{t('pantry.units.ml') || 'ml'}</option>
                            <option value="liter">{t('pantry.units.liter') || 'L'}</option>
                            <option value="bunch">{t('pantry.units.bunch') || 'bunch'}</option>
                            <option value="bag">{t('pantry.units.bag') || 'bag'}</option>
                            <option value="cans">{t('pantry.units.cans') || 'cans'}</option>
                            <option value="bottle">{t('pantry.units.bottle') || 'bottle'}</option>
                            <option value="jar">{t('pantry.units.jar') || 'jar'}</option>
                            <option value="pack">{t('pantry.units.pack') || 'pack'}</option>
                          </select>
                        )}
                      </div>
                    </div>

                    {/* Category — only for manual items */}
                    {!editingPantryItem.emoji && (
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                          {t('pantry.category')}
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
                          <option value="produce">🥬 {t('pantry.categories.produce')}</option>
                          <option value="dairy">🥛 {t('pantry.categories.dairy')}</option>
                          <option value="meat">🍖 {t('pantry.categories.meat')}</option>
                          <option value="canned">🥫 {t('pantry.categories.canned')}</option>
                          <option value="grains">🌾 {t('pantry.categories.grains')}</option>
                          <option value="breakfast">🥞 {t('pantry.categories.breakfast')}</option>
                          <option value="other">📦 {t('pantry.categories.other')}</option>
                        </select>
                      </div>
                    )}

                    {/* Expiry Date */}
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                        {t('pantry.expiryDate')}
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
                      {t('common.cancel')}
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
                      💾 {t('pantry.saveChanges')}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {showAddPantry && (
              <div style={{ background: '#f9fafb', padding: isMobile ? '1rem' : '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>

                {/* ── Two-input row: smart search | or | manual ── */}
                {!selectedFood && (
                  <div style={{
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    alignItems: isMobile ? 'stretch' : 'center',
                    gap: isMobile ? '0.5rem' : '0.75rem',
                  }}>
                    {/* Smart search box — hidden when manual is active */}
                    <div
                      ref={smartSearchRef}
                      style={{
                        position: 'relative',
                        flex: (!isMobile && manualQuery.length > 0) ? 0 : 1,
                        display: (!isMobile && manualQuery.length > 0) ? 'none' : (isMobile && manualQuery.length > 0 ? 'none' : 'block'),
                      }}
                    >
                      <input
                        type="text"
                        placeholder={t('pantry.smartSearch')}
                        value={smartSearchQuery}
                        onChange={(e) => handleSmartSearchChange(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.75rem 2.5rem 0.75rem 0.75rem',
                          border: '2px solid #8b5cf6',
                          borderRadius: '8px',
                          fontSize: isMobile ? '0.9rem' : '1rem',
                          boxSizing: 'border-box',
                        }}
                      />
                      {smartSearchQuery.length > 0 && (
                        <button
                          onClick={handleResetSmartSearch}
                          style={{
                            position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)',
                            background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#9ca3af',
                            padding: '0.25rem', lineHeight: 1,
                          }}
                          aria-label={t('common.cancel')}
                        >×</button>
                      )}

                      {/* Dropdown */}
                      {smartSearchResults.length > 0 && (
                        <div style={{
                          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                          background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.12)', marginTop: '2px', overflow: 'hidden',
                        }}>
                          {smartSearchResults.map((food) => (
                            <button
                              key={food.id}
                              onClick={() => handleSelectFood(food)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                width: '100%', padding: '0.75rem 1rem', background: 'none',
                                border: 'none', borderBottom: '1px solid #f3f4f6', cursor: 'pointer',
                                textAlign: 'left', fontSize: '0.95rem', minHeight: '44px',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f3ff')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                            >
                              <span style={{ fontSize: '1.3rem', width: '1.5rem', textAlign: 'center' }}>{food.emoji}</span>
                              <span style={{ fontWeight: 500 }}>{getFoodDisplayName(food, i18n.language || 'en')}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* "or" separator — hidden when either side is active */}
                    {smartSearchQuery.length === 0 && manualQuery.length === 0 && (
                      <span style={{
                        color: '#9ca3af', fontWeight: 500, fontSize: '0.85rem',
                        whiteSpace: 'nowrap', flexShrink: 0,
                        textAlign: isMobile ? 'center' : 'left',
                        padding: isMobile ? '0.1rem 0' : '0',
                      }}>
                        {t('common.or')}
                      </span>
                    )}

                    {/* Manual name box — hidden when smart search is active */}
                    <div style={{
                      flex: smartSearchQuery.length > 0 ? 0 : 1,
                      display: smartSearchQuery.length > 0 ? 'none' : 'block',
                    }}>
                      <input
                        type="text"
                        placeholder={t('pantry.enterManually')}
                        value={manualQuery}
                        onChange={(e) => {
                          setManualQuery(e.target.value);
                          setNewPantryItem(prev => ({ ...prev, name: e.target.value }));
                        }}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: isMobile ? '0.9rem' : '1rem',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* ── Compact card confirm (after food selected from DB) ── */}
                {selectedFood && (
                  <div style={{
                    background: 'white', border: '1.5px solid #8b5cf6', borderRadius: '10px',
                    padding: isMobile ? '0.9rem' : '1rem', boxShadow: '0 2px 8px rgba(139,92,246,0.08)',
                    overflow: 'hidden',
                    minWidth: 0,
                  }}>
                    {/* Header with reset */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f3f4f6' }}>
                      <span style={{ fontSize: '1.5rem' }}>{selectedFood.emoji}</span>
                      <span style={{ fontWeight: 700, fontSize: '1rem' }}>{getFoodDisplayName(selectedFood, i18n.language || 'en')}</span>
                      <span style={{ marginLeft: 'auto', background: '#f5f3ff', color: '#7c3aed', borderRadius: '6px', padding: '0.15rem 0.5rem', fontSize: '0.75rem', fontWeight: 600 }}>
                        {t(`pantry.categories.${selectedFood.category}`) || selectedFood.category}
                      </span>
                      <button
                        onClick={handleResetSmartSearch}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: '#9ca3af', padding: '0.2rem', lineHeight: 1 }}
                        aria-label={t('common.cancel')}
                      >×</button>
                    </div>

                    {/* Quantity + Smart unit row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', fontWeight: 600 }}>
                          {t('pantry.quantity')}
                        </label>
                        <input
                          type="number"
                          min="0.1"
                          step="any"
                          placeholder="0"
                          autoFocus
                          value={newPantryItem.quantity === '' ? '' : newPantryItem.quantity}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewPantryItem(prev => ({ ...prev, quantity: val === '' ? '' as any : parseFloat(val) || '' as any }));
                          }}
                          style={{
                            width: '100%', padding: '0.6rem', border: '1.5px solid #e5e7eb',
                            borderRadius: '8px', fontSize: '1rem', boxSizing: 'border-box',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', fontWeight: 600 }}>
                          {t('pantry.unit')}
                        </label>
                        {isCustomUnit ? (
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <input
                              type="text"
                              placeholder={t('pantry.customUnit')}
                              value={customUnitValue}
                              autoFocus
                              onChange={(e) => {
                                setCustomUnitValue(e.target.value);
                                setNewPantryItem(prev => ({ ...prev, unit: e.target.value }));
                              }}
                              style={{
                                flex: 1, padding: '0.6rem', border: '1.5px solid #8b5cf6',
                                borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box',
                              }}
                            />
                            <button
                              onClick={() => { setIsCustomUnit(false); setCustomUnitValue(''); setNewPantryItem(prev => ({ ...prev, unit: selectedFood.defaultUnit })); }}
                              style={{ background: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer', padding: '0 0.5rem', fontSize: '0.9rem', color: '#6b7280' }}
                            >↩</button>
                          </div>
                        ) : (
                          <select
                            value={newPantryItem.unit}
                            onChange={(e) => {
                              if (e.target.value === '__other__') {
                                setIsCustomUnit(true);
                                setNewPantryItem(prev => ({ ...prev, unit: '' }));
                              } else {
                                setNewPantryItem(prev => ({ ...prev, unit: e.target.value }));
                              }
                            }}
                            style={{
                              width: '100%', padding: '0.6rem', border: '1.5px solid #e5e7eb',
                              borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box', cursor: 'pointer',
                            }}
                          >
                            {getSuggestedUnits(selectedFood.defaultUnit).map(u => (
                              <option key={u} value={u}>{t(`pantry.units.${u}`, { defaultValue: u })}</option>
                            ))}
                            <option value="__other__">{t('pantry.otherUnit')}</option>
                          </select>
                        )}
                      </div>
                    </div>

                    {/* Smart expiry chip + date picker */}
                    <div style={{ marginBottom: '0.75rem', minWidth: 0 }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.35rem', fontWeight: 600 }}>
                        {t('pantry.expiryDate')}
                      </label>
                      <button
                        type="button"
                        onClick={handleAcceptSmartExpiry}
                        style={{
                          display: 'block', width: '100%', boxSizing: 'border-box',
                          background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a',
                          borderRadius: '6px', padding: '0.5rem 0.75rem', fontSize: '0.82rem',
                          fontWeight: 600, cursor: 'pointer', marginBottom: '0.5rem',
                          textAlign: 'left', wordBreak: 'break-word',
                        }}
                      >
                        ✨ {t('pantry.smartExpiry')}: {getSmartExpiryDate(selectedFood)}
                        {' '}<span style={{ color: '#b45309' }}>({t('pantry.smartExpiryDays', { count: selectedFood.shelfLife })})</span>
                      </button>
                      <input
                        type="date"
                        value={newPantryItem.expiryDate}
                        onChange={(e) => setNewPantryItem(prev => ({ ...prev, expiryDate: e.target.value }))}
                        style={{
                          display: 'block', width: '100%', minWidth: 0, padding: '0.6rem',
                          border: '1.5px solid #e5e7eb', borderRadius: '8px',
                          fontSize: '0.95rem', boxSizing: 'border-box',
                        }}
                      />
                      <p style={{ margin: '0.3rem 0 0', fontSize: '0.72rem', color: '#9ca3af' }}>
                        {t('pantry.expiryHint')}
                      </p>
                    </div>

                    {/* Add button */}
                    <button
                      disabled={!newPantryItem.quantity || newPantryItem.quantity === ('' as any)}
                      onClick={async () => {
                        if (!newPantryItem.name.trim()) return;
                        const quantity = typeof newPantryItem.quantity === 'number' ? newPantryItem.quantity : 1;
                        try {
                          const savedItem = await pantryService.add({
                            name: newPantryItem.name.trim(),
                            quantity,
                            unit: newPantryItem.unit,
                            category: newPantryItem.category,
                            expiryDate: newPantryItem.expiryDate || undefined,
                            emoji: newPantryItem.emoji,
                          });
                          setPantry(prev => [...prev, {
                            id: savedItem.id,
                            name: savedItem.name,
                            quantity: savedItem.quantity,
                            unit: savedItem.unit,
                            category: savedItem.category,
                            expiryDate: savedItem.expiry_date || undefined,
                            emoji: savedItem.emoji || undefined,
                          }]);
                          handleResetSmartSearch();
                          setShowAddPantry(false);
                          success(t('toasts.itemAddedToPantry'));
                        } catch (error) {
                          console.error('Error adding pantry item:', error);
                          warning(t('toasts.failedAddItem'));
                        }
                      }}
                      style={{
                        width: '100%', padding: '0.75rem',
                        background: (!newPantryItem.quantity || newPantryItem.quantity === ('' as any)) ? '#e5e7eb' : 'linear-gradient(45deg,#8b5cf6,#6d28d9)',
                        color: (!newPantryItem.quantity || newPantryItem.quantity === ('' as any)) ? '#9ca3af' : 'white',
                        border: 'none', borderRadius: '8px',
                        cursor: (!newPantryItem.quantity || newPantryItem.quantity === ('' as any)) ? 'not-allowed' : 'pointer',
                        fontWeight: 700, fontSize: '1rem',
                      }}
                    >
                      {(!newPantryItem.quantity || newPantryItem.quantity === ('' as any))
                        ? t('pantry.quantityRequired')
                        : t('pantry.addToPantry')}
                    </button>
                  </div>
                )}

                {/* ── Manual form fields (when user typed in manual box) ── */}
                {!selectedFood && manualQuery.length > 0 && (
                  <div style={{ display: 'grid', gap: '0.75rem', marginTop: '0.75rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr', gap: '0.5rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', fontWeight: 600 }}>{t('pantry.quantity')}</label>
                        <input
                          type="number" min="1" placeholder="1"
                          value={newPantryItem.quantity}
                          onChange={(e) => setNewPantryItem({...newPantryItem, quantity: parseInt(e.target.value) || 1})}
                          style={{ width: '100%', padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', fontWeight: 600 }}>{t('pantry.unit')}</label>
                        <select
                          value={newPantryItem.unit}
                          onChange={(e) => setNewPantryItem({...newPantryItem, unit: e.target.value})}
                          style={{ width: '100%', padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box' }}
                        >
                          <option value="pc">{t('pantry.units.pieces')}</option>
                          <option value="kg">{t('pantry.units.kg')}</option>
                          <option value="lbs">{t('pantry.units.lbs')}</option>
                          <option value="g">{t('pantry.units.grams') || 'g'}</option>
                          <option value="oz">{t('pantry.units.oz') || 'oz'}</option>
                          <option value="cups">{t('pantry.units.cups')}</option>
                          <option value="ml">{t('pantry.units.ml') || 'ml'}</option>
                          <option value="liter">{t('pantry.units.liter') || 'L'}</option>
                          <option value="bunch">{t('pantry.units.bunch') || 'bunch'}</option>
                          <option value="bag">{t('pantry.units.bag') || 'bag'}</option>
                          <option value="box">{t('pantry.units.box') || 'box'}</option>
                          <option value="cans">{t('pantry.units.cans') || 'cans'}</option>
                          <option value="bottle">{t('pantry.units.bottle') || 'bottle'}</option>
                          <option value="jar">{t('pantry.units.jar') || 'jar'}</option>
                          <option value="pack">{t('pantry.units.pack') || 'pack'}</option>
                          <option value="loaf">{t('pantry.units.loaf') || 'loaf'}</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', fontWeight: 600 }}>{t('pantry.category')}</label>
                      <select
                        value={newPantryItem.category}
                        onChange={(e) => setNewPantryItem({...newPantryItem, category: e.target.value})}
                        style={{ width: '100%', padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box' }}
                      >
                        <option value="produce">🥬 {t('pantry.categories.produce')}</option>
                        <option value="dairy">🥛 {t('pantry.categories.dairy')}</option>
                        <option value="meat">🍖 {t('pantry.categories.meat')}</option>
                        <option value="canned">🥫 {t('pantry.categories.canned')}</option>
                        <option value="grains">🌾 {t('pantry.categories.grains')}</option>
                        <option value="breakfast">🥞 {t('pantry.categories.breakfast')}</option>
                        <option value="other">📦 {t('pantry.categories.other')}</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', fontWeight: 600 }}>{t('pantry.expiryDate')}</label>
                      <input
                        type="date"
                        value={newPantryItem.expiryDate}
                        onChange={(e) => setNewPantryItem({...newPantryItem, expiryDate: e.target.value})}
                        style={{ width: '100%', padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box' }}
                      />
                    </div>
                    <button
                      onClick={async () => {
                        if (!newPantryItem.name.trim()) return;
                        const quantity = typeof newPantryItem.quantity === 'number' ? newPantryItem.quantity : 1;
                        try {
                          const savedItem = await pantryService.add({
                            name: newPantryItem.name.trim(), quantity,
                            unit: newPantryItem.unit, category: newPantryItem.category,
                            expiryDate: newPantryItem.expiryDate || undefined,
                          });
                          setPantry(prev => [...prev, {
                            id: savedItem.id, name: savedItem.name, quantity: savedItem.quantity,
                            unit: savedItem.unit, category: savedItem.category,
                            expiryDate: savedItem.expiry_date || undefined,
                          }]);
                          handleResetSmartSearch();
                          setShowAddPantry(false);
                          success(t('toasts.itemAddedToPantry'));
                        } catch (error) {
                          console.error('Error adding pantry item:', error);
                          warning(t('toasts.failedAddItem'));
                        }
                      }}
                      style={{ padding: '0.75rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                    >
                      {t('pantry.addToPantry')}
                    </button>
                  </div>
                )}
              </div>
            )}

            <div data-tour="pantry-expiry-input" style={{ display: 'grid', gap: '0.75rem' }}>
              {pantry.map(item => {
                const expiring = getExpiringItems().some(e => e.id === item.id);
                return (
                  <div
                    key={item.id}
                    className={`card-hover pantry-item-row${isExpiringSoon(item) ? ' expiring-soon' : ''}`}
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
                    <div
                      className="item-content"
                      style={{ flex: 1 }}
                      onClick={isMobile ? () => handleEditPantryItem(item) : undefined}
                      role={isMobile ? 'button' : undefined}
                      tabIndex={isMobile ? 0 : undefined}
                      onKeyDown={isMobile ? (e) => e.key === 'Enter' && handleEditPantryItem(item) : undefined}
                    >
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
                          {item.emoji ?? (
                            item.category === 'produce' ? '🥬' :
                            item.category === 'dairy' ? '🥛' :
                            item.category === 'meat' ? '🍖' :
                            item.category === 'canned' ? '🥫' :
                            item.category === 'grains' ? '🌾' :
                            item.category === 'breakfast' ? '🥞' : '📦'
                          )}
                        </div>
                        <div>
                          <span className="item-name" style={{ fontWeight: '600', fontSize: '1.05rem', color: '#1f2937' }}>
                            {item.name}
                          </span>
                          <div className="item-meta" style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
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
                        className="item-edit-btn"
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
                        ✏️ {isMobile ? '' : t('common.edit')}
                      </button>
                      <button
                          className="item-delete-btn"
                          onClick={async () => {
                            try {
                              // Check if this is a local-only item (scanned items have timestamp-based IDs)
                              const isLocalItem = item.id.includes('-') && item.id.includes('.');

                              if (user && !isLocalItem) {
                                // Only try database delete for items that came from database
                                await pantryService.delete(item.id);
                              }

                              // Always remove from local state
                              setPantry(prev => prev.filter(i => i.id !== item.id));
                              success(t('toasts.itemRemoved'));
                            } catch (error) {
                              console.error('Error deleting pantry item:', error);
                              // Still remove from local state even if database delete fails
                              setPantry(prev => prev.filter(i => i.id !== item.id));
                              success(t('toasts.itemRemoved'));
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
                        {isMobile ? '🗑️' : t('common.delete')}
                      </button>
                    </div>
                  </div>
                );
              })}
              {pantry.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', color: mutedText }}>
                  <div style={{ fontSize: '3rem' }}>📦</div>
                  <p>{t('pantry.emptyPantry')}</p>
                </div>
              )}
              {pantryHasMore && (
                <button
                  onClick={loadMorePantry}
                  disabled={pantryLoadingMore}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: pantryLoadingMore ? 'default' : 'pointer',
                    fontWeight: '600',
                    opacity: pantryLoadingMore ? 0.7 : 1
                  }}
                >
                  {pantryLoadingMore ? t('common.loading') : t('common.loadMore')}
                </button>
              )}
            </div>
          </div>
          </ErrorBoundary>
        )}

        {currentTab === 'shopping' && (
          <ErrorBoundary context="section:shopping" variant="section">
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
                🛒 {t('shopping.title')} ({shoppingList.filter(i => !i.checked).length} items)
              </h2>
              <div style={{ 
                display: 'flex', 
                gap: '0.75rem', 
                flexWrap: 'wrap',
                justifyContent: isMobile ? 'stretch' : 'flex-start'
              }}>
                <button
                  data-tour="shopping-add-input"
                  className="desktop-add-btn"
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
                  {isMobile ? t('shopping.addItem') : t('shopping.addItem')}
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
                }}>📤 {isMobile ? t('shopping.export') : t('shopping.exportAndShare')}</button>
              </div>
            </div>

            {showExportMenu && (
              <div style={{ background: '#f0f9ff', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: '2px solid #3b82f6' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>{t('shopping.exportOptions')}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                  <button onClick={exportAsText} style={{
                    padding: '0.75rem', background: 'white', border: '2px solid #e5e7eb',
                    borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem'
                  }}>
                    📄 {t('shopping.exportText')}
                  </button>
                  <button onClick={exportAsCSV} style={{
                    padding: '0.75rem', background: 'white', border: '2px solid #e5e7eb',
                    borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem'
                  }}>
                    📊 {t('shopping.exportCSV')}
                  </button>
                  <button onClick={shareList} style={{
                    padding: '0.75rem', background: 'white', border: '2px solid #e5e7eb',
                    borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem'
                  }}>
                    📱 {t('shopping.shareList')}
                  </button>
                  <button onClick={emailList} style={{
                    padding: '0.75rem', background: 'white', border: '2px solid #e5e7eb',
                    borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem'
                  }}>
                    ✉️ {t('shopping.emailList')}
                  </button>
                  <button onClick={printList} style={{
                    padding: '0.75rem', background: 'white', border: '2px solid #e5e7eb',
                    borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem'
                  }}>
                    🖨️ {t('shopping.printList')}
                  </button>
                </div>
              </div>
            )}

            {shoppingList.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                {priceComparison.loading ? (
                  <div style={{
                    padding: '0.5rem 1rem',
                    background: '#f0fdf4',
                    borderRadius: '8px',
                    border: '1px solid #86efac',
                    fontSize: '0.875rem',
                    color: '#166534',
                    fontStyle: 'italic'
                  }}>
                    🔄 {t('shopping.fetchingPrices')}
                  </div>
                ) : (
                  <div style={{
                    background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: '1px solid #bae6fd'
                  }}>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#0369a1',
                      fontWeight: '600',
                      marginBottom: '0.5rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      💰 {t('shopping.priceComparison')}
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-around' }}>
                      <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: '#0369a1', marginBottom: '0.25rem' }}>
                          Amazon
                        </div>
                        <div style={{
                          fontSize: '1.25rem',
                          fontWeight: '700',
                          color: priceComparison.amazon <= priceComparison.walmart ? '#10b981' : textColor
                        }}>
                          ${priceComparison.amazon.toFixed(2)}
                        </div>
                        {priceComparison.amazon < priceComparison.walmart && (
                          <div style={{ fontSize: '0.7rem', color: '#10b981', marginTop: '0.25rem' }}>
                            ✓ {t('shopping.bestPrice')}
                          </div>
                        )}
                      </div>
                      <div style={{
                        width: '1px',
                        background: '#bae6fd',
                        margin: '0.5rem 0'
                      }} />
                      <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: '#0369a1', marginBottom: '0.25rem' }}>
                          Walmart
                        </div>
                        <div style={{
                          fontSize: '1.25rem',
                          fontWeight: '700',
                          color: priceComparison.walmart < priceComparison.amazon ? '#10b981' : textColor
                        }}>
                          ${priceComparison.walmart.toFixed(2)}
                        </div>
                        {priceComparison.walmart < priceComparison.amazon && (
                          <div style={{ fontSize: '0.7rem', color: '#10b981', marginTop: '0.25rem' }}>
                            ✓ {t('shopping.bestPrice')}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{
                      marginTop: '0.75rem',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid #bae6fd',
                      fontSize: '0.75rem',
                      color: '#0369a1',
                      textAlign: 'center'
                    }}>
                      💡 {t('shopping.saveByShopping', { amount: Math.abs(priceComparison.amazon - priceComparison.walmart).toFixed(2), store: priceComparison.walmart < priceComparison.amazon ? 'Walmart' : 'Amazon' })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <select value={sortShoppingBy} onChange={(e) => setSortShoppingBy(e.target.value as any)}
                style={{ padding: '0.5rem', border: '2px solid #e5e7eb', borderRadius: '8px', flexShrink: 0 }}>
                <option value="category">{t('shopping.sortCategory')}</option>
                <option value="alphabetical">{t('shopping.sortAlphabetical')}</option>
              </select>
              {shoppingList.length > 0 && (
                <button onClick={async () => {
                  const allChecked = shoppingList.every(i => i.checked);
                  await shoppingService.updateAll(!allChecked);
                  setShoppingList(prev => prev.map(i => ({ ...i, checked: !allChecked })));
                }} style={{
                  padding: '0.5rem 0.75rem', background: '#6366f1', color: 'white',
                  border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600',
                  fontSize: isMobile ? '0.75rem' : '0.875rem', flexShrink: 0
                }}>
                  {shoppingList.every(i => i.checked) ? `☑️ ${t('shopping.deselectAll')}` : t('shopping.selectAll')}
                </button>
              )}
              {shoppingList.some(i => i.checked) && (
                <button onClick={async () => {
                  await shoppingService.deleteChecked();
                  setShoppingList(prev => prev.filter(i => !i.checked));
                }} style={{
                  padding: '0.5rem 0.75rem', background: '#ef4444', color: 'white',
                  border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600',
                  fontSize: isMobile ? '0.75rem' : '0.875rem', flexShrink: 0
                }}>🗑️ {t('shopping.clearChecked')}</button>
              )}
            </div>


            <div data-tour="shopping-list" style={{ display: 'grid', gap: '0.75rem' }}>
              {sortShoppingList().map((item, index) => (
                <div
                  key={item.id}
                  className="card-hover shopping-item-row"
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
                  <div className="item-content" style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.75rem' : '1rem', flex: 1 }}>
                    <input type="checkbox" checked={item.checked}
                      {...(index === 0 ? { 'data-tour': 'shopping-item-checkbox' } : {})}
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
                      <div className="item-name" style={{
                        fontWeight: '500',
                        fontSize: isMobile ? '0.875rem' : '1rem'
                      }}>{item.name}</div>
                      <div className="item-meta" style={{
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
                    alignItems: 'center',
                    width: isMobile ? '100%' : 'auto'
                  }}>
                    <a href={`https://www.amazon.com/s?k=${encodeURIComponent(item.name)}&i=amazonfresh`}
                      target="_blank" rel="noopener noreferrer"
                      style={{
                        flexShrink: 0,
                        width: '38px',
                        height: '38px',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden'
                      }}>
                      <img src="/amazon-logo.svg" alt="Amazon" style={{ width: '38px', height: '38px', display: 'block' }} />
                    </a>
                    <a href={`https://www.walmart.com/search?q=${encodeURIComponent(item.name)}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{
                        flexShrink: 0,
                        width: '38px',
                        height: '38px',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden'
                      }}>
                      <img src="/walmart-logo.svg" alt="Walmart" style={{ width: '38px', height: '38px', display: 'block' }} />
                    </a>
                    <button className="item-delete-btn" onClick={async () => {
                      // Always remove from local state first (optimistic update)
                      setShoppingList(prev => prev.filter(i => i.id !== item.id));
                      success(t('notifications.itemRemoved'));

                      // Then try to delete from database in background
                      try {
                        await shoppingService.delete(item.id);
                      } catch (error) {
                        console.error('⚠️ Failed to delete from database (item already removed from UI):', error);
                      }
                    }} style={{
                      flex: isMobile ? '1' : 'initial',
                      height: '38px',
                      background: '#fee2e2',
                      color: '#dc2626',
                      border: 'none',
                      padding: '0 0.75rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {isMobile ? '🗑️' : t('common.delete')}
                    </button>
                  </div>
                </div>
              ))}
              {shoppingList.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', color: mutedText }}>
                  <div style={{ fontSize: '3rem' }}>🛒</div>
                  <p>{t('shopping.emptyList')}</p>
                </div>
              )}
              {shoppingHasMore && (
                <button
                  onClick={loadMoreShopping}
                  disabled={shoppingLoadingMore}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: shoppingLoadingMore ? 'default' : 'pointer',
                    fontWeight: '600',
                    opacity: shoppingLoadingMore ? 0.7 : 1
                  }}
                >
                  {shoppingLoadingMore ? t('common.loading') : t('common.loadMore')}
                </button>
              )}
            </div>
          </div>
          </ErrorBoundary>
        )}

        {currentTab === 'favorites' && (
          <ErrorBoundary context="section:favorites" variant="section">
            <FavoritesSection
              isMobile={isMobile}
              cardBg={cardBg}
              mutedText={mutedText}
              onSelectRecipe={(recipe) => { setSelectedRecipe(recipe); setShowDetailedView(true); }}
              onSuccess={success}
              onError={warning}
            />
          </ErrorBoundary>
        )}

        {currentTab === 'donate' && (
          <ErrorBoundary context="section:donation" variant="section">
            <DonationSection
              isMobile={isMobile}
              cardBg={cardBg}
              mutedText={mutedText}
              getExpiringItems={getExpiringItems}
              onSuccess={success}
              onWarning={warning}
            />
          </ErrorBoundary>
        )}
      {/* Mobile FAB — only shown on mobile via CSS */}
      {isMobile && (currentTab === 'pantry' || currentTab === 'shopping') && (
        <button
          className="mobile-fab"
          data-tour={currentTab === 'pantry' ? 'pantry-add-mobile' : 'shopping-add-mobile'}
          onClick={() => {
            if (currentTab === 'pantry') setShowAddPantry(true);
            if (currentTab === 'shopping') setShowAddShopping(true);
          }}
          aria-label="Add item"
        >
          +
        </button>
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
          className="modal-content"
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
              🛒 {t('shopping.addToShoppingList')}
            </h3>

            <div style={{ display: 'grid', gap: '1rem' }}>
              {/* Item Name */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                  {t('pantry.itemName')}
                </label>
                <input
                  type="text"
                  placeholder={t('shopping.itemPlaceholder')}
                  value={newShoppingItem.name}
                  onChange={(e) => setNewShoppingItem({...newShoppingItem, name: e.target.value})}
                  onKeyPress={async (e) => {
                  if (e.key === 'Enter' && newShoppingItem.name.trim()) {
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
                        priority: savedItem.priority as 'high' | 'medium' | 'low',
                      }]);
                      success(t('toasts.addedToShoppingList', { name: newShoppingItem.name }));
                      setNewShoppingItem({ name: '', quantity: 1, unit: 'pc', category: 'other' });
                      setShowAddShopping(false);
                    } catch (err) {
                      console.error('Error adding shopping item:', err);
                      warning(t('toasts.failedAddItem'));
                    }
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
                  💡 {t('shopping.pressEnterToAdd')}
                </div>
              </div>

              {/* Quantity and Unit */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                    {t('pantry.quantity')}
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
                    {t('pantry.unit')}
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
                    <option value="pc">{t('pantry.units.pieces')}</option>
                    <option value="lbs">{t('pantry.units.lbs')}</option>
                    <option value="kg">{t('pantry.units.kg')}</option>
                    <option value="cups">{t('pantry.units.cups')}</option>
                    <option value="oz">{t('pantry.units.oz')}</option>
                    <option value="g">{t('pantry.units.grams')}</option>
                    <option value="bottles">{t('pantry.units.bottles')}</option>
                    <option value="cans">{t('pantry.units.cans')}</option>
                    <option value="boxes">{t('pantry.units.boxes')}</option>
                  </select>
                </div>
              </div>

              {/* Category */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                  {t('pantry.category')}
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
                  <option value="produce">🥬 {t('pantry.categories.produce')}</option>
                  <option value="dairy">🥛 {t('pantry.categories.dairy')}</option>
                  <option value="meat">🍖 {t('pantry.categories.meat')}</option>
                  <option value="frozen">🧊 {t('pantry.categories.frozen')}</option>
                  <option value="pantry">🏺 {t('pantry.categories.pantryItems')}</option>
                  <option value="beverages">🥤 {t('pantry.categories.beverages')}</option>
                  <option value="snacks">🍿 {t('pantry.categories.snacks')}</option>
                  <option value="bakery">🥖 {t('pantry.categories.bakery')}</option>
                  <option value="other">📦 {t('pantry.categories.other')}</option>
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
                {t('common.cancel')}
              </button>

              <button
                onClick={async () => {
                  if (!newShoppingItem.name.trim()) {
                    warning(t('toasts.pleaseEnterItemName'));
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

                    success(t('toasts.addedToShoppingList', { name: newShoppingItem.name }));
                  } catch (error) {
                    console.error('Error adding shopping item:', error);
                    warning(t('toasts.failedAddItemSimple'));
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
                ➕ {t('shopping.addToListButton')}
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
                <strong>💡 {t('shopping.proTip')}:</strong> {t('shopping.proTipMessage')}
              </div>
            </div>
          </div>
        </div>
      )}

      <ErrorBoundary context="section:recipes" variant="section">
        <RecipeDetailModal isMobile={isMobile} cardBg={cardBg} mutedText={mutedText} />
      </ErrorBoundary>

      {showImageUpload && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: cardBg,
            padding: isMobile ? '1.5rem' : '2rem',
            borderRadius: isMobile ? '12px' : '16px',
            maxWidth: isMobile ? '95vw' : '500px',
            width: isMobile ? '95vw' : '90%',
            animation: 'scaleIn 0.3s ease-out'
          }}>
            <h3 style={{
              marginTop: 0,
              fontSize: isMobile ? '1.25rem' : '1.5rem'
            }}>
              {scanMode === 'menu' ? `📷 ${t('scan.scanItems')}` : scanMode === 'barcode' ? `📊 ${t('scan.barcodeScanner')}` : scanMode === 'expiry' ? `📅 ${t('scan.expiryDateScanner')}` : scanMode === 'receipt' ? `🧾 ${t('scan.receiptUploadTitle')}` : `📷 ${t('scan.aiScanner')}`}
            </h3>
            <p style={{ color: mutedText, fontSize: isMobile ? '0.875rem' : '1rem' }}>
              {scanMode === 'menu' && (cameraSource === 'pantry'
                ? t('scan.chooseAddPantry')
                : t('scan.chooseAddIngredients'))}
              {scanMode === 'camera' && t('scan.aiIdentify')}
              {scanMode === 'barcode' && t('scan.barcodeScannerDesc')}
              {scanMode === 'expiry' && t('scan.expiryScannerDesc')}
              {scanMode === 'upload' && t('scan.aiScannerDesc')}
              {scanMode === 'receipt' && t('scan.receiptUploadDesc')}
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
                <div style={{ fontWeight: '600', color: '#1e40af' }}>
                  {scanMode === 'barcode' ? t('scan.lookingUp') :
                  scanMode === 'expiry' ? t('scan.readingExpiry') :
                  scanMode === 'receipt' ? t('scan.readingReceipt') :
                  t('scan.analyzing')}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
                  {t('scan.mayTakeFewSecs')}
                </div>
              </div>
            )}

            {scanMode === 'menu' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* AI Camera Button */}
                <button
                  onClick={() => {
                    setScanMode('camera');
                    handleCameraCapture();
                  }}
                  disabled={recipeLoading}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '1rem',
                    background: '#8b5cf6',
                    color: 'white',
                    borderRadius: '8px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontWeight: '600',
                    border: 'none',
                    opacity: recipeLoading ? 0.5 : 1,
                    pointerEvents: recipeLoading ? 'none' : 'auto',
                    fontSize: isMobile ? '0.9rem' : '1rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>📸</span>
                    <div>
                      <div style={{ fontWeight: '700' }}>AI Camera Scanner</div>
                      <div style={{ fontSize: '0.8rem', opacity: 0.9, fontWeight: '400' }}>
                        Identify multiple items automatically
                      </div>
                    </div>
                  </div>
                </button>

                {/* Barcode Scanner Button */}
                <button
                  onClick={() => {
                    setScanMode('barcode');
                    handleBarcodeScanner();
                  }}
                  disabled={recipeLoading}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '1rem',
                    background: '#10b981',
                    color: 'white',
                    borderRadius: '8px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontWeight: '600',
                    border: 'none',
                    opacity: recipeLoading ? 0.5 : 1,
                    pointerEvents: recipeLoading ? 'none' : 'auto',
                    fontSize: isMobile ? '0.9rem' : '1rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>📊</span>
                    <div>
                      <div style={{ fontWeight: '700' }}>{t('scan.barcodeScannerTitle')}</div>
                      <div style={{ fontSize: '0.8rem', opacity: 0.9, fontWeight: '400' }}>
                        {t('scan.barcodeScannerDesc')}
                      </div>
                    </div>
                  </div>
                </button>

                {/* Expiry Date Scanner Button */}
                <button
                  onClick={() => {
                    setScanMode('expiry');
                    handleExpiryScanner();
                  }}
                  disabled={recipeLoading}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '1rem',
                    background: '#f59e0b',
                    color: 'white',
                    borderRadius: '8px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontWeight: '600',
                    border: 'none',
                    opacity: recipeLoading ? 0.5 : 1,
                    pointerEvents: recipeLoading ? 'none' : 'auto',
                    fontSize: isMobile ? '0.9rem' : '1rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>📅</span>
                    <div>
                      <div style={{ fontWeight: '700' }}>{t('scan.expiryScannerTitle')}</div>
                      <div style={{ fontSize: '0.8rem', opacity: 0.9, fontWeight: '400' }}>
                        {t('scan.expiryScannerDesc')}
                      </div>
                    </div>
                  </div>
                </button>

                {/* Upload Image Button */}
                <label style={{
                  display: 'block',
                  width: '100%',
                  padding: '1rem',
                  background: '#6366f1',
                  color: 'white',
                  borderRadius: '8px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontWeight: '600',
                  opacity: recipeLoading ? 0.5 : 1,
                  pointerEvents: recipeLoading ? 'none' : 'auto',
                  fontSize: isMobile ? '0.9rem' : '1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>🖼️</span>
                    <div>
                      <div style={{ fontWeight: '700' }}>Upload Photo</div>
                      <div style={{ fontSize: '0.8rem', opacity: 0.9, fontWeight: '400' }}>
                        Choose from gallery for AI analysis
                      </div>
                    </div>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      setScanMode('upload');
                      handleImageUpload(e);
                    }}
                    disabled={recipeLoading}
                    style={{ display: 'none' }}
                  />
                </label>

                {/* Receipt Scanner Button (pantry only — receipts always add to pantry) */}
                {cameraSource === 'pantry' && (
                  <button
                    onClick={() => {
                      setScanMode('receipt');
                      handleReceiptScanner();
                    }}
                    disabled={recipeLoading}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '1rem',
                      background: '#ec4899',
                      color: 'white',
                      borderRadius: '8px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontWeight: '600',
                      border: 'none',
                      opacity: recipeLoading ? 0.5 : 1,
                      pointerEvents: recipeLoading ? 'none' : 'auto',
                      fontSize: isMobile ? '0.9rem' : '1rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '1.5rem' }}>🧾</span>
                      <div>
                        <div style={{ fontWeight: '700' }}>{t('scan.receiptUploadTitle')}</div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.9, fontWeight: '400' }}>
                          {t('scan.receiptUploadDesc')}
                        </div>
                      </div>
                    </div>
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowImageUpload(false);
                    setScanMode('menu');
                  }}
                  disabled={recipeLoading}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#f3f4f6',
                    marginTop: '0.5rem',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    opacity: recipeLoading ? 0.5 : 1,
                    fontSize: isMobile ? '0.9rem' : '1rem'
                  }}
                >
                  {t('common.cancel')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showReceiptReview && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000, padding: isMobile ? '1rem' : 0
        }}>
          <div style={{
            background: cardBg,
            padding: isMobile ? '1.25rem' : '2rem',
            borderRadius: isMobile ? '12px' : '16px',
            maxWidth: isMobile ? '95vw' : '560px',
            width: isMobile ? '95vw' : '90%',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            animation: 'scaleIn 0.3s ease-out'
          }}>
            <h3 style={{ marginTop: 0, fontSize: isMobile ? '1.15rem' : '1.4rem' }}>
              🧾 {t('scan.receiptReviewTitle')}
            </h3>
            <p style={{ color: mutedText, fontSize: isMobile ? '0.85rem' : '0.95rem', marginTop: 0 }}>
              {t('scan.receiptReviewDesc')}
            </p>
            {receiptRejectedCount > 0 && (
              <p style={{ color: mutedText, fontSize: '0.8rem', marginTop: '-0.5rem' }}>
                {t('scan.receiptRejectedLines', { count: receiptRejectedCount })}
              </p>
            )}

            <div style={{ overflowY: 'auto', flex: 1, margin: '0.5rem 0', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {receiptItems.length === 0 && (
                <p style={{ color: mutedText, textAlign: 'center', padding: '1rem' }}>
                  {t('toasts.noReceiptItemsDetected')}
                </p>
              )}
              {receiptItems.map(item => {
                const confidenceColor = item.confidence === 'high' ? '#10b981' : item.confidence === 'medium' ? '#f59e0b' : '#ef4444';
                const categoryEmoji: Record<string, string> = {
                  produce: '🥬', dairy: '🥛', meat: '🍖', canned: '🥫', grains: '🌾',
                  breakfast: '🥞', beverages: '🥤', snacks: '🍿', frozen: '🧊',
                  bakery: '🍞', condiments: '🧂', other: '📦'
                };
                const displayEmoji = item.emoji || categoryEmoji[item.category] || '📦';
                const needsQuantity = item.selected && (item.quantity === null || item.quantity <= 0);
                return (
                  <div key={item.id} style={{
                    border: `1px solid ${item.selected ? confidenceColor : '#e5e7eb'}`,
                    borderRadius: '10px',
                    padding: '0.75rem',
                    opacity: item.selected ? 1 : 0.55,
                    background: '#fafafa'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={(e) => setReceiptItems(prev => prev.map(it =>
                          it.id === item.id ? { ...it, selected: e.target.checked } : it
                        ))}
                        style={{ marginTop: '0.6rem', width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 }}
                      />
                      <span style={{ fontSize: '1.4rem', marginTop: '0.3rem', flexShrink: 0 }}>{displayEmoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => setReceiptItems(prev => prev.map(it =>
                              it.id === item.id ? { ...it, name: e.target.value } : it
                            ))}
                            style={{
                              flex: 1, padding: '0.5rem', border: '1px solid #e5e7eb',
                              borderRadius: '6px', fontSize: '0.9rem', fontWeight: 600, minWidth: 0
                            }}
                          />
                          <span title={t(`scan.confidence${item.confidence.charAt(0).toUpperCase()}${item.confidence.slice(1)}`)} style={{
                            fontSize: '0.7rem', fontWeight: 700, color: confidenceColor,
                            border: `1px solid ${confidenceColor}`, borderRadius: '999px',
                            padding: '0.15rem 0.5rem', whiteSpace: 'nowrap', flexShrink: 0
                          }}>
                            {t(`scan.confidence${item.confidence.charAt(0).toUpperCase()}${item.confidence.slice(1)}`)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.quantity ?? ''}
                            placeholder={t('scan.qtyPlaceholder')}
                            onChange={(e) => setReceiptItems(prev => prev.map(it =>
                              it.id === item.id ? { ...it, quantity: e.target.value === '' ? null : parseFloat(e.target.value) } : it
                            ))}
                            style={{
                              width: '70px', padding: '0.4rem',
                              border: needsQuantity ? '1px solid #ef4444' : '1px solid #e5e7eb',
                              background: needsQuantity ? '#fef2f2' : 'white',
                              borderRadius: '6px', fontSize: '0.85rem'
                            }}
                          />
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) => setReceiptItems(prev => prev.map(it =>
                              it.id === item.id ? { ...it, unit: e.target.value } : it
                            ))}
                            style={{ width: '70px', padding: '0.4rem', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.85rem' }}
                          />
                          <select
                            value={item.category}
                            onChange={(e) => setReceiptItems(prev => prev.map(it =>
                              it.id === item.id ? { ...it, category: e.target.value } : it
                            ))}
                            style={{ flex: 1, padding: '0.4rem', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer', minWidth: '110px' }}
                          >
                            <option value="produce">🥬 {t('pantry.categories.produce')}</option>
                            <option value="dairy">🥛 {t('pantry.categories.dairy')}</option>
                            <option value="meat">🍖 {t('pantry.categories.meat')}</option>
                            <option value="canned">🥫 {t('pantry.categories.canned')}</option>
                            <option value="grains">🌾 {t('pantry.categories.grains')}</option>
                            <option value="breakfast">🥞 {t('pantry.categories.breakfast')}</option>
                            <option value="beverages">🥤 {t('pantry.categories.beverages')}</option>
                            <option value="snacks">🍿 {t('pantry.categories.snacks')}</option>
                            <option value="frozen">🧊 {t('pantry.categories.frozen')}</option>
                            <option value="bakery">🍞 {t('pantry.categories.bakery')}</option>
                            <option value="condiments">🧂 {t('pantry.categories.condiments')}</option>
                            <option value="other">📦 {t('pantry.categories.other')}</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                onClick={() => {
                  setShowReceiptReview(false);
                  setReceiptItems([]);
                  setReceiptRejectedCount(0);
                  setScanMode('menu');
                }}
                style={{
                  flex: 1, padding: '0.85rem', background: '#f3f4f6', border: 'none',
                  borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: isMobile ? '0.9rem' : '1rem'
                }}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={confirmReceiptItems}
                disabled={receiptItems.filter(i => i.selected).length === 0}
                style={{
                  flex: 2, padding: '0.85rem', background: '#8b5cf6', color: 'white', border: 'none',
                  borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: isMobile ? '0.9rem' : '1rem',
                  opacity: receiptItems.filter(i => i.selected).length === 0 ? 0.5 : 1
                }}
              >
                {t('scan.addSelectedItems', { count: receiptItems.filter(i => i.selected).length })}
              </button>
            </div>
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
          <div className="calorie-tracker-panel" data-tour="calorie-tracker-panel" style={{
            background: cardBg,
            padding: '2rem',
            borderRadius: '16px',
            maxWidth: '400px',
            width: '90%',
            animation: 'scaleIn 0.3s ease-out'
          }}>
            <h3>📊 {t('calorieTracker.title')}</h3>
            <div style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '12px', marginBottom: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: '700', color: todayCalories > dailyCalorieGoal ? '#dc2626' : '#10b981' }}>
                {todayCalories}
              </div>
              <div style={{ color: mutedText }}>{t('calorieTracker.calGoal', { goal: dailyCalorieGoal })}</div>
              <div style={{ width: '100%', height: '8px', background: '#e5e7eb', borderRadius: '4px', marginTop: '1rem', overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min((todayCalories / dailyCalorieGoal) * 100, 100)}%`, height: '100%',
                  background: todayCalories > dailyCalorieGoal ? '#dc2626' : '#10b981', transition: 'width 0.5s'
                }} />
              </div>
            </div>
            
            {/* Manual Calorie Entry */}
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>{t('calorieTracker.addSubtractLabel')}</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input 
                type="number" 
                value={manualCalorieInput} 
                onChange={(e) => setManualCalorieInput(e.target.value)}
                placeholder={t('calorieTracker.placeholder')}
                style={{ 
                  flex: 1, 
                  padding: '0.75rem', 
                  border: '2px solid #e5e7eb', 
                  borderRadius: '8px', 
                  boxSizing: 'border-box' 
                }} 
              />
              <button onClick={async () => {
                const amount = parseInt(manualCalorieInput);
                if (isNaN(amount) || amount === 0) {
                  warning(t('toasts.enterCalorieAmount'));
                  return;
                }

                try {
                  // Log to Supabase
                  await calorieService.logCalories(amount, 'manual', 'Manual entry');
                  
                  // Update local state
                  setTodayCalories(prev => Math.max(0, prev + amount));
                  setManualCalorieInput('');
                  
                  success(t('toasts.addedCalories', { name: 'Manual', calories: amount }));
                } catch (err) {
                  console.error('Error logging calories:', err);
                  error(t('toasts.failedAddCalories'));
                }
              }} style={{
                padding: '0.75rem 1rem',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600'
              }}>+</button>
              <button onClick={async () => {
                const amount = parseInt(manualCalorieInput);
                if (isNaN(amount) || amount === 0) {
                  warning(t('toasts.enterCalorieAmount'));
                  return;
                }

                try {
                  // Log negative to Supabase
                  await calorieService.logCalories(-Math.abs(amount), 'manual', 'Manual subtraction');

                  // Update local state
                  setTodayCalories(prev => Math.max(0, prev - Math.abs(amount)));
                  setManualCalorieInput('');

                  success(t('toasts.addedCalories', { name: 'Manual', calories: -Math.abs(amount) }));
                } catch (err) {
                  console.error('Error logging calories:', err);
                  error(t('toasts.failedAddCalories'));
                }
              }} style={{
                padding: '0.75rem 1rem', 
                background: '#f59e0b', 
                color: 'white',
                border: 'none', 
                borderRadius: '8px', 
                cursor: 'pointer', 
                fontWeight: '600'
              }}>−</button>
            </div>
            
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>{t('calorieTracker.dailyGoal')}</label>
            <input type="number" value={dailyCalorieGoal} onChange={(e) => {
                const newGoal = Number(e.target.value);
                setDailyCalorieGoal(newGoal);
                // Keep the Settings panel's copy in sync — it reads from
                // userProfile, which this control otherwise never touches.
                setUserProfile(prev => prev ? { ...prev, daily_calorie_goal: newGoal } : prev);
              }}
              style={{ width: '100%', padding: '0.75rem', border: '2px solid #e5e7eb', borderRadius: '8px', marginBottom: '1rem', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={async () => {
                const currentCals = todayCalories;
                setTodayCalories(0);
                try {
                  // Log reset as negative entry to balance the day
                  if (currentCals > 0) {
                    await calorieService.logCalories(-currentCals, 'manual', 'Daily reset');
                  }
                  success(t('calorieTracker.caloriesReset'));
                } catch (err) {
                  console.error('Error resetting calories:', err);
                  error(t('notifications.error'));
                }
              }} style={{
                flex: 1, padding: '0.75rem', background: '#ef4444', color: 'white',
                border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600'
              }}>{t('calorieTracker.reset')}</button>
              <button onClick={() => setShowCalorieTracker(false)} style={{
                flex: 1, padding: '0.75rem', background: '#10b981', color: 'white',
                border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600'
              }}>{t('common.close')}</button>
            </div>
          </div>
        </div>
      )}
      <ErrorBoundary context="section:donation" variant="section">
        <DonationModal
          cardBg={cardBg}
          pantry={pantry}
          getExpiringItems={getExpiringItems}
          onSubmit={handleDonation}
          onWarning={warning}
        />
      </ErrorBoundary>
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
            className="modal-content"
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', marginBottom: isMobile ? '0.5rem' : '1rem' }}>
                <img src="/icons/logo-icon.svg" alt="" style={{ height: isMobile ? '3rem' : '4rem' }} />
                <span style={{ fontSize: isMobile ? '3rem' : '4rem' }}>❤️</span>
              </div>
              <h1 style={{ 
                margin: '0 0 1rem 0', 
                fontSize: isMobile ? '1.75rem' : '2.5rem', 
                fontWeight: '800',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                {t('mission.welcomeTitle')}
              </h1>
              <p style={{
                fontSize: isMobile ? '1rem' : '1.25rem',
                color: '#6b7280',
                fontWeight: '500',
                lineHeight: '1.6'
              }}>
                {t('mission.subtitle')}
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
              }}>{t('mission.ourMission')}</h2>
              <p style={{
                fontSize: isMobile ? '0.875rem' : '1.1rem',
                lineHeight: '1.8',
                margin: 0,
                opacity: 0.95
              }}>
                {t('mission.missionText')}
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
                {t('mission.quickStartGuide')}
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
                      📦 {t('mission.step1Title')}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: '1.5' }}>
                      {t('mission.step1Desc')}
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
                      🍳 {t('mission.step2Title')}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: '1.5' }}>
                      {t('mission.step2Desc')}
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
                      🛒 {t('mission.step3Title')}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: '1.5' }}>
                      {t('mission.step3Desc')}
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
                      ❤️ {t('mission.step4Title')}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: '1.5' }}>
                      {t('mission.step4Desc')}
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
                if (!localStorage.getItem('hasSeenTour')) {
                  handleTabChange('pantry');
                  setTourStep(0);
                  setShowTour(true);
                }
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
              {t('mission.letsGetStarted')} 🚀
            </button>

            <div style={{
              textAlign: 'center',
              marginTop: '1rem',
              fontSize: '0.875rem',
              color: '#9ca3af'
            }}>
              {t('mission.viewAgain')}
            </div>
          </div>
        </div>
      )}
      {/* Demo Mode Confirmation */}
      <ErrorBoundary context="section:donation" variant="section">
        <ShareImpactModal
          cardBg={cardBg}
          mutedText={mutedText}
          onSuccess={success}
        />
      </ErrorBoundary>
      <ErrorBoundary context="section:recipes" variant="section">
        <RecipeSubstitutionModal onSuccess={success} />
      </ErrorBoundary>
      {showSurvey && userProfile && (
        <OnboardingSurvey
          userId={user.id}
          apiBase={API_BASE}
          onComplete={async (surveyData) => {
            const { error: saveError } = await profileService.upsertProfile(user.id, { ...surveyData, onboarding_completed: true });
            if (!saveError) {
              setUserProfile(prev => prev ? { ...prev, ...surveyData, onboarding_completed: true } : null);
              if (surveyData.daily_calorie_goal) setDailyCalorieGoal(surveyData.daily_calorie_goal);
              if (surveyData.custom_dietary_labels) setCustomDietaryLabels(surveyData.custom_dietary_labels);
              const prefs1 = surveyData.dietary_preferences ?? [];
              setSavedProfilePrefs(prefs1);
              if (prefs1.length > 1) setDietaryFilter(COMBINED_PROFILE_KEY);
              else if (prefs1.length === 1) setDietaryFilter(prefs1[0]);
              else setDietaryFilter('');
            } else {
              console.error('Survey upsert error:', JSON.stringify(saveError));
              error('Failed to save your preferences. Please update them in Settings.');
            }
            setShowSurvey(false);
            setShowMissionPopup(true);
          }}
          onSkip={async () => {
            const { error: skipError } = await profileService.upsertProfile(user.id, { onboarding_completed: true });
            if (!skipError) {
              setUserProfile(prev => prev ? { ...prev, onboarding_completed: true } : null);
            }
            setShowSurvey(false);
            setShowMissionPopup(true);
          }}
        />
      )}

      {showSettings && userProfile && (
        <SettingsPanel
          userId={user.id}
          profile={userProfile}
          apiBase={API_BASE}
          isMobile={isMobile}
          onClose={() => setShowSettings(false)}
          onSave={(updated) => {
            setUserProfile(prev => prev ? { ...prev, ...updated } : null);
            if (updated.daily_calorie_goal) setDailyCalorieGoal(updated.daily_calorie_goal);
            if (updated.custom_dietary_labels) setCustomDietaryLabels(updated.custom_dietary_labels);
            const prefs2 = updated.dietary_preferences ?? [];
            setSavedProfilePrefs(prefs2);
            if (prefs2.length > 1) setDietaryFilter(COMBINED_PROFILE_KEY);
            else if (prefs2.length === 1) setDietaryFilter(prefs2[0]);
            else setDietaryFilter('');
          }}
          onDeleteAccount={() => {
            setUser(null);
            setShowSettings(false);
          }}
          showSuccess={success}
          showError={error}
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
      {showTour && (
        <TourOverlay
          steps={TOUR_STEPS}
          currentStep={tourStep}
          isMobile={isMobile}
          onNext={handleTourNext}
          onSkip={handleTourSkip}
        />
      )}
      <FeedbackButton isMobile={isMobile} />
      <InstallBanner />
    </div>
  );
};

const App: React.FC = () => (
  <FavoritesProvider>
    <DonationProvider>
      <RecipesProvider>
        <AppContent />
      </RecipesProvider>
    </DonationProvider>
  </FavoritesProvider>
);

export default App;