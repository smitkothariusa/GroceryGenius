// frontend/src/tourSteps.ts

export interface TourStep {
  /** CSS selector using data-tour attribute */
  selector: string;
  /** Which app tab to navigate to before showing this step (null = no tab change) */
  tab: 'pantry' | 'recipes' | 'mealplan' | 'shopping' | 'donate' | 'favorites' | null;
  /** i18n key for tooltip title */
  titleKey: string;
  /** i18n key for tooltip description */
  descKey: string;
  /** Side effects to run BEFORE showing this step (e.g. open a modal) */
  beforeShow?: 'openSettings' | 'openCalorieTracker';
  /** Side effects to run AFTER this step (e.g. close a modal) */
  afterStep?: 'closeSettings' | 'closeCalorieTracker';
}

export const TOUR_STEPS: TourStep[] = [
  // --- Pantry ---
  {
    tab: 'pantry',
    selector: '[data-tour="pantry-add-input"]',
    titleKey: 'tour.pantry.add.title',
    descKey: 'tour.pantry.add.desc',
  },
  {
    tab: null,
    selector: '[data-tour="pantry-scan-btn"]',
    titleKey: 'tour.pantry.scan.title',
    descKey: 'tour.pantry.scan.desc',
  },
  {
    tab: null,
    selector: '[data-tour="pantry-expiry-input"]',
    titleKey: 'tour.pantry.expiry.title',
    descKey: 'tour.pantry.expiry.desc',
  },
  // --- Recipes ---
  {
    tab: 'recipes',
    selector: '[data-tour="recipes-ingredient-input"]',
    titleKey: 'tour.recipes.input.title',
    descKey: 'tour.recipes.input.desc',
  },
  {
    tab: null,
    selector: '[data-tour="recipes-dietary-filter"]',
    titleKey: 'tour.recipes.dietary.title',
    descKey: 'tour.recipes.dietary.desc',
  },
  // --- Meal Plan ---
  {
    tab: 'mealplan',
    selector: '[data-tour="mealplan-calendar"]',
    titleKey: 'tour.mealplan.calendar.title',
    descKey: 'tour.mealplan.calendar.desc',
  },
  {
    tab: null,
    selector: '[data-tour="mealplan-shopping-btn"]',
    titleKey: 'tour.mealplan.shopping.title',
    descKey: 'tour.mealplan.shopping.desc',
  },
  // --- Shopping ---
  {
    tab: 'shopping',
    selector: '[data-tour="shopping-list"]',
    titleKey: 'tour.shopping.list.title',
    descKey: 'tour.shopping.list.desc',
  },
  {
    tab: null,
    selector: '[data-tour="shopping-add-input"]',
    titleKey: 'tour.shopping.add.title',
    descKey: 'tour.shopping.add.desc',
  },
  // --- Donate ---
  {
    tab: null,
    selector: '[data-tour="donate-map"]',
    titleKey: 'tour.donate.map.title',
    descKey: 'tour.donate.map.desc',
  },
  // --- Favorites ---
  {
    tab: 'favorites',
    selector: '[data-tour="favorites-grid"]',
    titleKey: 'tour.favorites.grid.title',
    descKey: 'tour.favorites.grid.desc',
  },
  // --- Settings ---
  {
    tab: null,
    selector: '[data-tour="settings-btn"]',
    titleKey: 'tour.settings.open.title',
    descKey: 'tour.settings.open.desc',
    afterStep: 'closeSettings',
  },
  {
    tab: null,
    selector: '[data-tour="settings-dietary"]',
    titleKey: 'tour.settings.dietary.title',
    descKey: 'tour.settings.dietary.desc',
    beforeShow: 'openSettings',
  },
  {
    tab: null,
    selector: '[data-tour="settings-calorie-goal"]',
    titleKey: 'tour.settings.calorie.title',
    descKey: 'tour.settings.calorie.desc',
    beforeShow: 'openSettings',
    afterStep: 'closeSettings',
  },
  // --- Calorie Tracker ---
  {
    tab: null,
    selector: '[data-tour="calorie-tracker-btn"]',
    titleKey: 'tour.calorie.btn.title',
    descKey: 'tour.calorie.btn.desc',
    afterStep: 'closeCalorieTracker',
  },
  {
    tab: null,
    selector: '[data-tour="calorie-tracker-panel"]',
    titleKey: 'tour.calorie.panel.title',
    descKey: 'tour.calorie.panel.desc',
    beforeShow: 'openCalorieTracker',
  },
];
