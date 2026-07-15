import { FoodBank } from './types/donation';
import { calculateMeals } from './data/foodBanks';
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
import OfflineBanner from './components/OfflineBanner';
import { useOfflineStatus } from './hooks/useOfflineStatus';
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
import { PantryProvider, usePantry, type PantryItem } from './features/pantry/PantryContext';
import { PantrySection } from './features/pantry/PantrySection';
import { ScanModal } from './features/pantry/ScanModal';
import { safeStorage } from './lib/safeStorage';


interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  checked: boolean;
  category: string;
  priority?: 'high' | 'medium' | 'low';
}

// Page size for paginated pantry/shopping reads (Supabase .range()).
// Kept generous since per-user item counts are low at current scale.
const LIST_PAGE_SIZE = 50;

const AppContent: React.FC = () => {
  const { t, i18n } = useTranslation();
  
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<'pantry' | 'recipes' | 'mealplan' | 'shopping' | 'donate' | 'favorites'>(
    () => (safeStorage.getItem('activeTab') as 'pantry' | 'recipes' | 'mealplan' | 'shopping' | 'donate' | 'favorites') || 'pantry'
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
  const {
    pantry, setPantry,
    setPantryHasMore,
    setShowAddPantry,
    setCameraSource,
    setShowImageUpload,
    getExpiringItems,
  } = usePantry();
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
  // Offline mutation queue (task 11): drains queued pantry/shopping writes
  // on reconnect, reconciles client-side temp ids to the real Supabase ids
  // once each queued 'add' syncs, and surfaces a success toast.
  const handleOfflineSynced = useCallback((count: number) => {
    success(t('offline.toasts.synced', { count }));
  }, [success, t]);
  const handleOfflineItemSynced = useCallback((entity: 'pantry' | 'shopping', tempId: string, realId: string) => {
    if (entity === 'pantry') {
      setPantry(prev => prev.map(item => (item.id === tempId ? { ...item, id: realId } : item)));
    } else {
      setShoppingList(prev => prev.map(item => (item.id === tempId ? { ...item, id: realId } : item)));
    }
  }, [setPantry, setShoppingList]);
  const { isOnline, pendingCount } = useOfflineStatus({
    onSynced: handleOfflineSynced,
    onItemSynced: handleOfflineItemSynced,
  });
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
  }, [user, setFavorites, setDonationHistory, setDonationImpact, setDietaryFilter, setPantry, setPantryHasMore]);
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
          safeStorage.removeItem('gg_recipe_mode');
          safeStorage.removeItem('hasSeenTour');
          safeStorage.removeItem('hasSeenMission');
          safeStorage.removeItem('locationPermission');
          safeStorage.removeItem('userLocation');
          setUserLocation(null);
          setLocationPermission('pending');
          setRecipeMode('loose');
        }
      });

      return () => {
        authListener?.subscription?.unsubscribe();
      };
    }, [setFavorites, setDonationHistory, setDonationImpact, setUserLocation, setLocationPermission, setRecipeMode, setPantry]);

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
  }, [user, authLoading, loadUserData, setFavorites, setDonationHistory, setPantry]);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleTabChange = (tab: typeof currentTab) => {
    safeStorage.setItem('activeTab', tab);
    setIsTabChanging(true);
    setTimeout(() => {
      setCurrentTab(tab);
      setIsTabChanging(false);
    }, 150);
  };

  const handleTourSkip = () => {
    setShowTour(false);
    safeStorage.setItem('hasSeenTour', 'true');
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
      safeStorage.setItem('hasSeenTour', 'true');
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
      <OfflineBanner isOnline={isOnline} pendingCount={pendingCount} />

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
            <PantrySection
              isMobile={isMobile}
              cardBg={cardBg}
              mutedText={mutedText}
              user={user}
              onSuccess={success}
              onWarning={warning}
            />
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

      <ErrorBoundary context="section:pantry" variant="section">
        <ScanModal
          isMobile={isMobile}
          cardBg={cardBg}
          mutedText={mutedText}
          user={user}
          onNavigateToTab={setCurrentTab}
          onSuccess={success}
          onWarning={warning}
          onError={error}
        />
      </ErrorBoundary>

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
                safeStorage.setItem('hasSeenMission', 'true');
                if (!safeStorage.getItem('hasSeenTour')) {
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
        <PantryProvider>
          <AppContent />
        </PantryProvider>
      </RecipesProvider>
    </DonationProvider>
  </FavoritesProvider>
);

export default App;