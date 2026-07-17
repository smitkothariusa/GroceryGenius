/**
 * Component-level tests for the higher-risk interactive flows that live inside
 * the App.tsx monolith: recipe generation, pantry add/delete, the shopping
 * list, the receipt scanner (camera capture), and i18n rendering across
 * languages.
 *
 * App.tsx is one ~8000-line component with no extracted sub-components, so
 * these tests render the whole App with the data/network layer mocked (the
 * same approach App.test.tsx uses, extended with the auth + service mocks the
 * authenticated screen needs) and drive the real UI. State is preloaded by
 * having the mocked services' getAll() return fixtures, since there is no way
 * to set the component's internal state directly.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import i18n from './i18n';
import './i18n';

// Actual translation files — i18n assertions compare against these rather than
// hardcoded strings, so a renamed/removed key is caught as a real regression.
import en from './locales/en/translation.json';
import es from './locales/es/translation.json';
import de from './locales/de/translation.json';

// Mutable fixtures + spies shared with the module mocks below. `vi.hoisted`
// runs before the hoisted `vi.mock` factories, so the factories can close over
// these safely.
const h = vi.hoisted(() => ({
  pantry: [] as any[],
  shopping: [] as any[],
  recipes: [] as any[],
  spies: {
    pantryAdd: vi.fn(),
    pantryDelete: vi.fn(),
    shoppingUpdate: vi.fn(),
    shoppingDelete: vi.fn(),
    authFetch: vi.fn(),
  },
}));

// Auth + direct-supabase access used by loadUserData() and a few components.
vi.mock('./lib/supabase', () => {
  const mockUser = { id: 'user-1', email: 'test@example.com' };
  const mockSession = { user: mockUser, access_token: 'test-token' };

  // Minimal chainable query builder: every builder method returns the same
  // object, and awaiting it (or calling single/maybeSingle) resolves to an
  // empty result. Enough for loadUserData's profile lookup and any incidental
  // reads.
  const makeQuery = () => {
    const result = { data: null, error: null };
    const q: any = {};
    for (const m of ['select', 'insert', 'update', 'delete', 'upsert', 'eq',
      'neq', 'in', 'is', 'not', 'gte', 'lte', 'lt', 'gt', 'ilike', 'like',
      'match', 'order', 'limit', 'range']) {
      q[m] = () => q;
    }
    q.single = () => Promise.resolve(result);
    q.maybeSingle = () => Promise.resolve(result);
    q.then = (res: any, rej: any) => Promise.resolve(result).then(res, rej);
    return q;
  };

  const supabase = {
    from: () => makeQuery(),
    auth: {
      getUser: async () => ({ data: { user: mockUser } }),
      getSession: async () => ({ data: { session: mockSession } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signOut: async () => ({ error: null }),
    },
    rpc: async () => ({ data: null, error: null }),
  };

  return {
    supabase,
    authService: {
      getSession: async () => mockSession,
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signOut: async () => ({ error: null }),
      getCurrentUser: async () => mockUser,
      signIn: async () => ({ data: {}, error: null }),
      signUp: async () => ({ data: {}, error: null }),
    },
    profileService: {
      getProfile: async () => null,
      upsertProfile: async () => ({ error: null }),
    },
    feedbackService: { submit: async () => ({ error: null }) },
  };
});

// Data layer. getAll() reflects the mutable fixtures; mutating methods are
// spies so tests can assert they fired.
vi.mock('./lib/database', () => ({
  pantryService: {
    getAll: async () => h.pantry,
    add: (...args: any[]) => h.spies.pantryAdd(...args),
    update: async () => ({}),
    delete: (...args: any[]) => h.spies.pantryDelete(...args),
  },
  shoppingService: {
    getAll: async () => h.shopping,
    add: async () => ({}),
    update: (...args: any[]) => h.spies.shoppingUpdate(...args),
    delete: (...args: any[]) => h.spies.shoppingDelete(...args),
    deleteChecked: async () => {},
    updateAll: async () => {},
  },
  recipesService: {
    getAll: async () => h.recipes,
    add: async () => ({}),
    delete: async () => {},
  },
  mealPlansService: {
    getAll: async () => [],
    add: async () => ({}),
    update: async () => ({}),
    delete: async () => {},
  },
  donationService: {
    getHistory: async () => [],
    add: async () => ({}),
    getImpact: async () => ({}),
    updateImpact: async () => ({}),
  },
  calorieService: {
    getTodayCalories: async () => ({ total: 0, logs: [] }),
    logCalories: async () => ({}),
    getWeekCalories: async () => [],
    getCalorieGoal: async () => 2000,
    updateCalorieGoal: async () => ({}),
  },
}));

// All backend/API calls go through authFetch — mock it so no real network
// happens and so recipe generation returns a deterministic payload.
vi.mock('./lib/apiClient', () => ({
  authFetch: (...args: any[]) => h.spies.authFetch(...args),
  AUTH_SESSION_LOST_EVENT: 'gg-auth-session-lost',
}));

// Imported after the mocks are registered.
import App from './App';

/** Build a Response-ish object for authFetch mocks. */
function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
    clone() { return this; },
  };
}

/** Render App and wait until the authenticated shell (not the loading splash
 *  or the Auth screen) is on screen. */
async function renderApp() {
  const utils = render(<App />);
  // Wait until the authenticated shell mounts (this control only exists once
  // auth resolves and the main tree renders). Language-independent, unlike the
  // app name which appears on both the Auth screen and here.
  await waitFor(
    () => expect(document.querySelector('[data-tour="calorie-tracker-btn"]')).toBeTruthy(),
    { timeout: 3000 }
  );
  return utils;
}

beforeEach(() => {
  h.pantry = [];
  h.shopping = [];
  h.recipes = [];
  localStorage.clear();

  h.spies.pantryAdd.mockReset();
  h.spies.pantryDelete.mockReset();
  h.spies.shoppingUpdate.mockReset();
  h.spies.shoppingDelete.mockReset();
  h.spies.authFetch.mockReset();

  // Sensible defaults; individual tests override as needed.
  h.spies.pantryAdd.mockImplementation(async (item: any) => ({
    id: `saved-${Date.now()}`,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    category: item.category,
    expiry_date: item.expiryDate ?? null,
    emoji: item.emoji ?? null,
  }));
  h.spies.pantryDelete.mockResolvedValue(undefined);
  h.spies.shoppingUpdate.mockResolvedValue({});
  h.spies.shoppingDelete.mockResolvedValue(undefined);
  h.spies.authFetch.mockResolvedValue(jsonResponse([]));
});

afterEach(async () => {
  // The receipt scanner appends a modal directly to <body> (outside React).
  // RTL's cleanup only unmounts its own container, so strip any stray
  // top-level nodes to keep tests isolated.
  document.querySelectorAll('body > div').forEach((el) => {
    if (!el.querySelector('[data-testid], header')) el.remove();
  });
  document.body.innerHTML = '';
  // Reset language so an i18n test doesn't leak into the next test.
  await i18n.changeLanguage('en');
});

describe('Recipe generation flow', () => {
  it('adds a typed ingredient as a tag and generates recipes from the API', async () => {
    localStorage.setItem('activeTab', 'recipes');

    const recipe = {
      name: 'Test Tomato Soup',
      ingredients: 'tomato\nsalt',
      instructions: 'boil',
      servings: 2,
      nutrition: { calories: 120, protein: 4, carbs: 20, fat: 2, fiber: 3, sodium: 400 },
    };
    h.spies.authFetch.mockResolvedValue(jsonResponse([recipe]));

    await renderApp();

    // Add an ingredient via the "type + Enter" chip input.
    const ingredientInput = await screen.findByPlaceholderText(en.recipes.ingredientsPlaceholder);
    fireEvent.change(ingredientInput, { target: { value: 'tomato' } });
    fireEvent.keyPress(ingredientInput, { key: 'Enter', code: 'Enter', charCode: 13 });

    // The chip should now be visible.
    expect(await screen.findByText('tomato')).toBeInTheDocument();

    // Fire generation.
    fireEvent.click(screen.getByRole('button', { name: new RegExp(en.recipes.getRecipes) }));

    // The generated recipe title renders (as "1. Test Tomato Soup").
    expect(await screen.findByText(/Test Tomato Soup/)).toBeInTheDocument();

    // And the request went to the recipes endpoint — at its canonical path,
    // WITH the trailing slash. Posting to /recipes made the backend
    // 307-redirect to /recipes/, and browsers drop the Authorization header
    // while following that redirect, so the request arrived tokenless and
    // 401'd. That was the real cause of recipe generation failing on mobile
    // while working on desktop/incognito, so the slash is asserted exactly.
    expect(h.spies.authFetch).toHaveBeenCalled();
    const calledUrls = h.spies.authFetch.mock.calls.map((c) => String(c[0]));
    expect(calledUrls.some((u) => /\/recipes\/\?/.test(u))).toBe(true);
    expect(calledUrls.some((u) => /\/recipes\?/.test(u))).toBe(false);
  });

  it('shows an error message and does not call the API when no ingredients are entered', async () => {
    localStorage.setItem('activeTab', 'recipes');
    await renderApp();

    fireEvent.click(screen.getByRole('button', { name: new RegExp(en.recipes.getRecipes) }));

    expect((await screen.findAllByText(en.recipes.emptyStatePrompt)).length).toBeGreaterThan(0);
    const calledUrls = h.spies.authFetch.mock.calls.map((c) => String(c[0]));
    expect(calledUrls.some((u) => /\/recipes\/?\?/.test(u))).toBe(false);
  });
});

describe('Pantry add / delete', () => {
  it('adds a manually-entered item to the pantry', async () => {
    await renderApp();

    // Open the add panel.
    fireEvent.click(screen.getByRole('button', { name: new RegExp(en.pantry.addItem) }));

    // Type a name into the manual-entry box.
    const manualInput = await screen.findByPlaceholderText(en.pantry.enterManually);
    fireEvent.change(manualInput, { target: { value: 'Bananas' } });

    // Submit via the manual "Add to Pantry" button.
    fireEvent.click(screen.getByRole('button', { name: en.pantry.addToPantry }));

    await waitFor(() => expect(h.spies.pantryAdd).toHaveBeenCalledTimes(1));
    expect(h.spies.pantryAdd).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Bananas', quantity: 1 })
    );

    // The saved item appears in the pantry list.
    expect(await screen.findByText('Bananas')).toBeInTheDocument();
  });

  it('deletes a pantry item via the delete button', async () => {
    h.pantry = [{
      id: 'pantry-1',
      name: 'Old Milk',
      quantity: 1,
      unit: 'liter',
      category: 'dairy',
      expiry_date: null,
      emoji: '🥛',
    }];

    await renderApp();

    expect(await screen.findByText('Old Milk')).toBeInTheDocument();

    // The pantry row's delete button carries the localized "Delete" label.
    const deleteButtons = screen.getAllByRole('button', { name: en.common.delete });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => expect(h.spies.pantryDelete).toHaveBeenCalledWith('pantry-1'));
    await waitFor(() => expect(screen.queryByText('Old Milk')).not.toBeInTheDocument());
  });
});

describe('Shopping list', () => {
  beforeEach(() => {
    localStorage.setItem('activeTab', 'shopping');
    h.shopping = [{
      id: 'shop-1',
      name: 'Eggs',
      quantity: 12,
      unit: 'pc',
      category: 'dairy',
      checked: false,
      priority: 'medium',
    }];
  });

  it('renders shopping items loaded from the service', async () => {
    await renderApp();
    expect(await screen.findByText('Eggs')).toBeInTheDocument();
  });

  it('toggling an item checkbox persists via the service', async () => {
    await renderApp();
    await screen.findByText('Eggs');

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    await waitFor(() =>
      expect(h.spies.shoppingUpdate).toHaveBeenCalledWith('shop-1', { checked: true })
    );
  });

  it('deleting a shopping item removes it and calls the service', async () => {
    await renderApp();
    await screen.findByText('Eggs');

    fireEvent.click(screen.getByRole('button', { name: en.common.delete }));

    await waitFor(() => expect(screen.queryByText('Eggs')).not.toBeInTheDocument());
    await waitFor(() => expect(h.spies.shoppingDelete).toHaveBeenCalledWith('shop-1'));
  });
});

describe('Receipt scanner (camera capture)', () => {
  let getUserMedia: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getUserMedia = vi.fn();
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    });
  });

  /** Open the pantry scan menu and click the Receipt Scanner option. */
  async function openReceiptScanner(container: HTMLElement) {
    const scanBtn = container.querySelector('[data-tour="pantry-scan-btn"]') as HTMLElement;
    expect(scanBtn).toBeTruthy();
    fireEvent.click(scanBtn);

    const receiptBtn = await screen.findByRole('button', {
      name: new RegExp(en.scan.receiptUploadTitle),
    });
    fireEvent.click(receiptBtn);
  }

  it('requests the rear camera and shows the capture UI', async () => {
    getUserMedia.mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] });

    const { container } = await renderApp();
    await openReceiptScanner(container);

    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(1));
    expect(getUserMedia).toHaveBeenCalledWith({ video: { facingMode: 'environment' } });

    // The imperatively-built capture overlay shows the "Scan Receipt" button.
    await waitFor(() =>
      expect(document.body.textContent).toContain('Scan Receipt')
    );
  });

  it('shows a camera-denied toast when permission is refused', async () => {
    getUserMedia.mockRejectedValue(new Error('NotAllowedError'));

    const { container } = await renderApp();
    await openReceiptScanner(container);

    expect(await screen.findByText(en.toasts.cameraAccessDenied)).toBeInTheDocument();
  });
});

describe('i18n string rendering across languages', () => {
  it('renders navigation and headings in Spanish', async () => {
    await i18n.changeLanguage('es');
    localStorage.setItem('activeTab', 'pantry');

    await renderApp();

    // Pantry heading uses pantry.title; the nav tab uses tabs.pantry.
    expect(await screen.findByText(new RegExp(es.pantry.title))).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: new RegExp(`${es.tabs.pantry}\\s*\\(`) })
    ).toBeInTheDocument();
    // Sanity: the English label must NOT be present, proving the switch took.
    expect(screen.queryByText(new RegExp(`^📦 ${en.pantry.title}$`))).not.toBeInTheDocument();
  });

  it('renders navigation and headings in German', async () => {
    await i18n.changeLanguage('de');
    localStorage.setItem('activeTab', 'shopping');
    h.shopping = [];

    await renderApp();

    expect(
      await screen.findByRole('button', { name: new RegExp(`${de.tabs.shopping}\\s*\\(`) })
    ).toBeInTheDocument();
    // The shopping section heading is localized too (may appear in more than
    // one place, e.g. heading + empty-state copy).
    expect(screen.getAllByText(new RegExp(de.shopping.title)).length).toBeGreaterThan(0);
  });

  it('every language exposes the keys these tests rely on', () => {
    // Guards against a locale file drifting out of sync with en for the
    // specific strings the UI tests assert on.
    const paths = [
      'app.name', 'tabs.pantry', 'tabs.shopping', 'pantry.title',
      'shopping.title', 'common.delete', 'recipes.getRecipes',
      'scan.receiptUploadTitle', 'toasts.cameraAccessDenied',
    ];
    const get = (obj: any, p: string) => p.split('.').reduce((o, k) => o?.[k], obj);
    for (const locale of [en, es, de]) {
      for (const p of paths) {
        expect(get(locale, p), `missing key: ${p}`).toBeTruthy();
      }
    }
  });
});
