# Onboarding Tour Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 20-step interactive spotlight-based onboarding tour that auto-navigates new users through every major feature of GroceryGenius immediately after the mission popup closes.

**Architecture:** A new self-contained `TourOverlay.tsx` component renders a full-screen dark overlay with a spotlight cutout (via `box-shadow`) over a live DOM element identified by `data-tour` attributes. App.tsx gains `showTour`/`tourStep` state and passes callbacks. Tour fires once per user, persisted via `localStorage.hasSeenTour`.

**Tech Stack:** React 18, TypeScript, react-i18next, inline styles (matching existing app pattern), no new dependencies.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `frontend/src/components/TourOverlay.tsx` | **Create** | Spotlight overlay, tooltip, progress dots, Next/Skip buttons |
| `frontend/src/tourSteps.ts` | **Create** | Array of `TourStep` objects — all 20 steps with i18n keys and selectors |
| `frontend/src/App.tsx` | **Modify** | Add `showTour`/`tourStep` state; trigger after mission popup; add `data-tour` attrs to ~20 elements; open Settings/CalorieTracker at right steps |
| `frontend/src/locales/en/translation.json` | **Modify** | Add `tour.*` namespace |
| `frontend/src/locales/de/translation.json` | **Modify** | Add `tour.*` namespace |
| `frontend/src/locales/es/translation.json` | **Modify** | Add `tour.*` namespace |
| `frontend/src/locales/fr/translation.json` | **Modify** | Add `tour.*` namespace |
| `frontend/src/locales/ja/translation.json` | **Modify** | Add `tour.*` namespace |
| `frontend/src/locales/zh/translation.json` | **Modify** | Add `tour.*` namespace |

---

## Task 1: Create `tourSteps.ts` — step definitions

**Files:**
- Create: `frontend/src/tourSteps.ts`

- [ ] **Step 1.1: Create the file**

```ts
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
    selector: '[data-tour="recipes-use-pantry-btn"]',
    titleKey: 'tour.recipes.pantry.title',
    descKey: 'tour.recipes.pantry.desc',
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
    selector: '[data-tour="shopping-item-checkbox"]',
    titleKey: 'tour.shopping.check.title',
    descKey: 'tour.shopping.check.desc',
  },
  {
    tab: null,
    selector: '[data-tour="shopping-add-input"]',
    titleKey: 'tour.shopping.add.title',
    descKey: 'tour.shopping.add.desc',
  },
  // --- Donate ---
  {
    tab: 'donate',
    selector: '[data-tour="donate-expiring-list"]',
    titleKey: 'tour.donate.expiring.title',
    descKey: 'tour.donate.expiring.desc',
  },
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
  {
    tab: null,
    selector: '[data-tour="favorites-heart-btn"]',
    titleKey: 'tour.favorites.heart.title',
    descKey: 'tour.favorites.heart.desc',
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
```

- [ ] **Step 1.2: Commit**

```bash
cd frontend
git add src/tourSteps.ts
git commit -m "feat: add tour step definitions"
```

---

## Task 2: Add English i18n strings

**Files:**
- Modify: `frontend/src/locales/en/translation.json`

- [ ] **Step 2.1: Add `tour` namespace to English translations**

Open `frontend/src/locales/en/translation.json`. Find the final closing `}` of the JSON object and insert the `tour` key before it. The file currently ends with:

```json
    "failedToDelete": "Failed to delete account. Please try again."
  }
}
```

Replace that ending with:

```json
    "failedToDelete": "Failed to delete account. Please try again."
  },
  "tour": {
    "pantry": {
      "add": { "title": "Add pantry items", "desc": "Type any ingredient name and tap Add to stock your pantry." },
      "scan": { "title": "Scan a barcode", "desc": "Use your camera to scan a product barcode and we'll add it to your pantry automatically." },
      "expiry": { "title": "Track expiry dates", "desc": "Add an expiry date when saving an item — we'll flag it automatically as it gets close." }
    },
    "recipes": {
      "input": { "title": "Find recipes by ingredient", "desc": "Enter what you have and our AI will find recipes that use them." },
      "pantry": { "title": "Use your pantry", "desc": "Tap this to load your entire pantry as recipe ingredients in one go." },
      "dietary": { "title": "Dietary filters", "desc": "Filter recipes by your dietary preferences — synced automatically from your settings." }
    },
    "mealplan": {
      "calendar": { "title": "Plan your week", "desc": "Browse recipes and add them to days on your calendar to plan ahead." },
      "shopping": { "title": "Auto-build your shopping list", "desc": "Missing ingredients from your meal plan are sent straight to your Shopping list." }
    },
    "shopping": {
      "list": { "title": "Your shopping list", "desc": "Items are auto-generated from your meal plan and pantry gaps." },
      "check": { "title": "Check off as you shop", "desc": "Tap any item to mark it as bought." },
      "add": { "title": "Add items manually", "desc": "You can always add one-off items to your list here." }
    },
    "donate": {
      "expiring": { "title": "Donate expiring food", "desc": "Food near its expiry date appears here so you can donate it before it goes to waste." },
      "map": { "title": "Find a food bank", "desc": "Discover nearby food banks and drop-off points based on your location." }
    },
    "favorites": {
      "grid": { "title": "Your saved recipes", "desc": "Recipes you've hearted live here for quick access any time." },
      "heart": { "title": "Save a recipe", "desc": "Tap the heart on any recipe card to add it to your favorites." }
    },
    "settings": {
      "open": { "title": "Personalise your settings", "desc": "Open settings to tailor GroceryGenius to your needs." },
      "dietary": { "title": "Dietary preferences", "desc": "Set your dietary needs here — recipes and filters update automatically everywhere." },
      "calorie": { "title": "Daily calorie goal", "desc": "Set your daily calorie target and we'll track your progress throughout the day." }
    },
    "calorie": {
      "btn": { "title": "Calorie tracker", "desc": "Tap this button any time to open your daily calorie tracker." },
      "panel": { "title": "Track your nutrition", "desc": "Log meals here and watch your calorie and nutrition progress in real time." }
    },
    "next": "Next",
    "skip": "Skip tour",
    "finish": "Finish",
    "stepOf": "{{current}} / {{total}}",
    "allSet": "You're all set! 🎉"
  }
}
```

- [ ] **Step 2.2: Verify JSON is valid**

```bash
cd frontend
node -e "JSON.parse(require('fs').readFileSync('src/locales/en/translation.json','utf8')); console.log('valid')"
```

Expected output: `valid`

- [ ] **Step 2.3: Commit**

```bash
git add src/locales/en/translation.json
git commit -m "feat: add tour i18n keys (English)"
```

---

## Task 3: Add i18n strings to all other 5 languages

**Files:**
- Modify: `frontend/src/locales/de/translation.json`
- Modify: `frontend/src/locales/es/translation.json`
- Modify: `frontend/src/locales/fr/translation.json`
- Modify: `frontend/src/locales/ja/translation.json`
- Modify: `frontend/src/locales/zh/translation.json`

Apply the same JSON insertion pattern as Task 2 to each file. Find each file's closing `}` and insert the `tour` key before it.

- [ ] **Step 3.1: Add German translations (`de`)**

```json
  "tour": {
    "pantry": {
      "add": { "title": "Vorräte hinzufügen", "desc": "Gib einen Zutaten-Namen ein und tippe auf Hinzufügen, um deinen Vorrat aufzufüllen." },
      "scan": { "title": "Barcode scannen", "desc": "Nutze deine Kamera, um einen Barcode zu scannen – wir fügen das Produkt automatisch hinzu." },
      "expiry": { "title": "Haltbarkeit verfolgen", "desc": "Füge ein Ablaufdatum hinzu – wir warnen dich automatisch, wenn es sich nähert." }
    },
    "recipes": {
      "input": { "title": "Rezepte nach Zutaten finden", "desc": "Gib ein, was du hast, und unsere KI findet passende Rezepte." },
      "pantry": { "title": "Vorrat verwenden", "desc": "Tippe hier, um deinen gesamten Vorrat als Rezeptzutaten zu laden." },
      "dietary": { "title": "Ernährungsfilter", "desc": "Filtere Rezepte nach deinen Ernährungspräferenzen – automatisch aus den Einstellungen synchronisiert." }
    },
    "mealplan": {
      "calendar": { "title": "Deine Woche planen", "desc": "Füge Rezepte zu Tagen in deinem Kalender hinzu und plane im Voraus." },
      "shopping": { "title": "Einkaufsliste automatisch erstellen", "desc": "Fehlende Zutaten aus deinem Essensplan werden direkt auf deine Einkaufsliste gesetzt." }
    },
    "shopping": {
      "list": { "title": "Deine Einkaufsliste", "desc": "Artikel werden automatisch aus deinem Essensplan und Vorratsengpässen generiert." },
      "check": { "title": "Beim Einkaufen abhaken", "desc": "Tippe auf einen Artikel, um ihn als gekauft zu markieren." },
      "add": { "title": "Artikel manuell hinzufügen", "desc": "Du kannst jederzeit einzelne Artikel zur Liste hinzufügen." }
    },
    "donate": {
      "expiring": { "title": "Ablaufende Lebensmittel spenden", "desc": "Lebensmittel kurz vor dem Ablaufdatum erscheinen hier, damit du sie rechtzeitig spenden kannst." },
      "map": { "title": "Lebensmittelbank finden", "desc": "Finde nahegelegene Lebensmittelbanken und Abgabestellen in deiner Umgebung." }
    },
    "favorites": {
      "grid": { "title": "Deine gespeicherten Rezepte", "desc": "Rezepte, die du mit einem Herz markiert hast, findest du hier jederzeit wieder." },
      "heart": { "title": "Rezept speichern", "desc": "Tippe auf das Herz einer Rezeptkarte, um sie zu deinen Favoriten hinzuzufügen." }
    },
    "settings": {
      "open": { "title": "Einstellungen personalisieren", "desc": "Öffne die Einstellungen, um GroceryGenius nach deinen Bedürfnissen anzupassen." },
      "dietary": { "title": "Ernährungspräferenzen", "desc": "Lege deine Ernährungsbedürfnisse fest – Rezepte und Filter werden überall automatisch aktualisiert." },
      "calorie": { "title": "Tägliches Kalorienziel", "desc": "Setze dein tägliches Kalorienziel und wir verfolgen deinen Fortschritt über den Tag." }
    },
    "calorie": {
      "btn": { "title": "Kalorien-Tracker", "desc": "Tippe jederzeit auf diese Schaltfläche, um deinen Kalorien-Tracker zu öffnen." },
      "panel": { "title": "Ernährung verfolgen", "desc": "Erfasse hier Mahlzeiten und verfolge deinen Kalorien- und Nährwertfortschritt in Echtzeit." }
    },
    "next": "Weiter",
    "skip": "Tour überspringen",
    "finish": "Fertig",
    "stepOf": "{{current}} / {{total}}",
    "allSet": "Alles bereit! 🎉"
  }
```

- [ ] **Step 3.2: Add Spanish translations (`es`)**

```json
  "tour": {
    "pantry": {
      "add": { "title": "Añadir artículos a la despensa", "desc": "Escribe el nombre de cualquier ingrediente y pulsa Añadir para llenar tu despensa." },
      "scan": { "title": "Escanear un código de barras", "desc": "Usa tu cámara para escanear el código de barras de un producto y lo añadiremos automáticamente." },
      "expiry": { "title": "Seguir fechas de caducidad", "desc": "Añade una fecha de caducidad al guardar un artículo y te avisaremos cuando se acerque." }
    },
    "recipes": {
      "input": { "title": "Buscar recetas por ingrediente", "desc": "Escribe lo que tienes y nuestra IA encontrará recetas que los usen." },
      "pantry": { "title": "Usar tu despensa", "desc": "Pulsa aquí para cargar toda tu despensa como ingredientes de receta de una vez." },
      "dietary": { "title": "Filtros dietéticos", "desc": "Filtra recetas por tus preferencias dietéticas, sincronizadas automáticamente desde tu configuración." }
    },
    "mealplan": {
      "calendar": { "title": "Planifica tu semana", "desc": "Añade recetas a los días de tu calendario para planificar con antelación." },
      "shopping": { "title": "Generar lista de la compra", "desc": "Los ingredientes que te faltan del plan de comidas se envían directamente a tu lista de la compra." }
    },
    "shopping": {
      "list": { "title": "Tu lista de la compra", "desc": "Los artículos se generan automáticamente a partir de tu plan de comidas y los huecos de la despensa." },
      "check": { "title": "Marca lo que compras", "desc": "Pulsa un artículo para marcarlo como comprado." },
      "add": { "title": "Añadir artículos manualmente", "desc": "Siempre puedes añadir artículos sueltos a tu lista aquí." }
    },
    "donate": {
      "expiring": { "title": "Dona alimentos que caducan", "desc": "Los alimentos próximos a caducar aparecen aquí para que puedas donarlos antes de que se desperdicien." },
      "map": { "title": "Encontrar un banco de alimentos", "desc": "Descubre bancos de alimentos y puntos de entrega cercanos según tu ubicación." }
    },
    "favorites": {
      "grid": { "title": "Tus recetas guardadas", "desc": "Las recetas que has marcado con un corazón están aquí para acceder rápidamente en cualquier momento." },
      "heart": { "title": "Guardar una receta", "desc": "Pulsa el corazón de cualquier tarjeta de receta para añadirla a tus favoritos." }
    },
    "settings": {
      "open": { "title": "Personaliza tu experiencia", "desc": "Abre la configuración para adaptar GroceryGenius a tus necesidades." },
      "dietary": { "title": "Preferencias dietéticas", "desc": "Establece tus necesidades dietéticas aquí — las recetas y filtros se actualizan automáticamente en todas partes." },
      "calorie": { "title": "Objetivo calórico diario", "desc": "Establece tu objetivo diario de calorías y haremos un seguimiento de tu progreso durante el día." }
    },
    "calorie": {
      "btn": { "title": "Contador de calorías", "desc": "Pulsa este botón en cualquier momento para abrir tu contador de calorías diario." },
      "panel": { "title": "Controla tu nutrición", "desc": "Registra tus comidas aquí y sigue tu progreso calórico y nutricional en tiempo real." }
    },
    "next": "Siguiente",
    "skip": "Omitir tour",
    "finish": "Terminar",
    "stepOf": "{{current}} / {{total}}",
    "allSet": "¡Todo listo! 🎉"
  }
```

- [ ] **Step 3.3: Add French translations (`fr`)**

```json
  "tour": {
    "pantry": {
      "add": { "title": "Ajouter des articles au garde-manger", "desc": "Saisissez le nom d'un ingrédient et appuyez sur Ajouter pour remplir votre garde-manger." },
      "scan": { "title": "Scanner un code-barres", "desc": "Utilisez votre caméra pour scanner le code-barres d'un produit et nous l'ajouterons automatiquement." },
      "expiry": { "title": "Suivre les dates de péremption", "desc": "Ajoutez une date de péremption lors de l'enregistrement d'un article — nous vous alerterons automatiquement." }
    },
    "recipes": {
      "input": { "title": "Trouver des recettes par ingrédient", "desc": "Saisissez ce que vous avez et notre IA trouvera des recettes qui les utilisent." },
      "pantry": { "title": "Utiliser votre garde-manger", "desc": "Appuyez ici pour charger tout votre garde-manger comme ingrédients de recette en une seule fois." },
      "dietary": { "title": "Filtres alimentaires", "desc": "Filtrez les recettes selon vos préférences alimentaires, synchronisées automatiquement depuis vos paramètres." }
    },
    "mealplan": {
      "calendar": { "title": "Planifiez votre semaine", "desc": "Ajoutez des recettes aux jours de votre calendrier pour planifier à l'avance." },
      "shopping": { "title": "Générer la liste de courses", "desc": "Les ingrédients manquants de votre plan de repas sont envoyés directement à votre liste de courses." }
    },
    "shopping": {
      "list": { "title": "Votre liste de courses", "desc": "Les articles sont générés automatiquement à partir de votre plan de repas et des manques dans votre garde-manger." },
      "check": { "title": "Cochez au fur et à mesure", "desc": "Appuyez sur un article pour le marquer comme acheté." },
      "add": { "title": "Ajouter des articles manuellement", "desc": "Vous pouvez toujours ajouter des articles ponctuels à votre liste ici." }
    },
    "donate": {
      "expiring": { "title": "Donner les aliments qui périment", "desc": "Les aliments proches de leur date de péremption apparaissent ici pour que vous puissiez les donner avant qu'ils ne soient gaspillés." },
      "map": { "title": "Trouver une banque alimentaire", "desc": "Découvrez les banques alimentaires et points de dépôt à proximité selon votre localisation." }
    },
    "favorites": {
      "grid": { "title": "Vos recettes enregistrées", "desc": "Les recettes que vous avez aimées se trouvent ici pour un accès rapide à tout moment." },
      "heart": { "title": "Enregistrer une recette", "desc": "Appuyez sur le cœur d'une carte de recette pour l'ajouter à vos favoris." }
    },
    "settings": {
      "open": { "title": "Personnalisez vos paramètres", "desc": "Ouvrez les paramètres pour adapter GroceryGenius à vos besoins." },
      "dietary": { "title": "Préférences alimentaires", "desc": "Définissez vos besoins alimentaires ici — les recettes et filtres se mettent à jour automatiquement partout." },
      "calorie": { "title": "Objectif calorique quotidien", "desc": "Définissez votre objectif calorique quotidien et nous suivrons votre progression tout au long de la journée." }
    },
    "calorie": {
      "btn": { "title": "Suivi des calories", "desc": "Appuyez sur ce bouton à tout moment pour ouvrir votre suivi calorique quotidien." },
      "panel": { "title": "Suivez votre nutrition", "desc": "Enregistrez vos repas ici et suivez votre progression calorique et nutritionnelle en temps réel." }
    },
    "next": "Suivant",
    "skip": "Passer la visite",
    "finish": "Terminer",
    "stepOf": "{{current}} / {{total}}",
    "allSet": "Vous êtes prêt ! 🎉"
  }
```

- [ ] **Step 3.4: Add Japanese translations (`ja`)**

```json
  "tour": {
    "pantry": {
      "add": { "title": "食材を追加する", "desc": "食材名を入力して「追加」をタップすると、パントリーに保存されます。" },
      "scan": { "title": "バーコードをスキャン", "desc": "カメラで商品のバーコードをスキャンすると、自動的に追加されます。" },
      "expiry": { "title": "賞味期限を管理", "desc": "食材を保存するときに賞味期限を入力すると、期限が近づいたら自動的に通知します。" }
    },
    "recipes": {
      "input": { "title": "食材からレシピを検索", "desc": "持っている食材を入力すると、AIがそれを使ったレシピを見つけます。" },
      "pantry": { "title": "パントリーを使用", "desc": "タップするだけで、パントリー全体をレシピの食材として読み込めます。" },
      "dietary": { "title": "食事フィルター", "desc": "設定から自動同期された食事の好みでレシピをフィルタリングします。" }
    },
    "mealplan": {
      "calendar": { "title": "週間プランを立てる", "desc": "レシピをカレンダーの日付に追加して、食事を計画しましょう。" },
      "shopping": { "title": "買い物リストを自動作成", "desc": "食事プランに必要な食材が足りない場合、自動的に買い物リストに追加されます。" }
    },
    "shopping": {
      "list": { "title": "買い物リスト", "desc": "食事プランとパントリーの不足分から自動生成されます。" },
      "check": { "title": "購入済みにチェック", "desc": "アイテムをタップして購入済みとしてマークします。" },
      "add": { "title": "手動で追加", "desc": "ここからいつでも単品アイテムをリストに追加できます。" }
    },
    "donate": {
      "expiring": { "title": "期限切れ食品を寄付", "desc": "賞味期限が近い食品がここに表示されます。廃棄前に寄付しましょう。" },
      "map": { "title": "フードバンクを探す", "desc": "現在地から近くのフードバンクや寄付場所を見つけましょう。" }
    },
    "favorites": {
      "grid": { "title": "保存したレシピ", "desc": "ハートを付けたレシピはいつでもここから素早くアクセスできます。" },
      "heart": { "title": "レシピを保存", "desc": "レシピカードのハートをタップしてお気に入りに追加します。" }
    },
    "settings": {
      "open": { "title": "設定をカスタマイズ", "desc": "設定を開いてGroceryGeniusをあなたのニーズに合わせましょう。" },
      "dietary": { "title": "食事の好み", "desc": "食事制限を設定すると、レシピとフィルターがどこでも自動的に更新されます。" },
      "calorie": { "title": "1日のカロリー目標", "desc": "毎日のカロリー目標を設定すると、1日を通じて進捗を追跡します。" }
    },
    "calorie": {
      "btn": { "title": "カロリートラッカー", "desc": "このボタンをいつでもタップして、1日のカロリートラッカーを開けます。" },
      "panel": { "title": "栄養を管理", "desc": "食事を記録して、カロリーと栄養の進捗をリアルタイムで確認しましょう。" }
    },
    "next": "次へ",
    "skip": "ツアーをスキップ",
    "finish": "完了",
    "stepOf": "{{current}} / {{total}}",
    "allSet": "準備完了！🎉"
  }
```

- [ ] **Step 3.5: Add Chinese translations (`zh`)**

```json
  "tour": {
    "pantry": {
      "add": { "title": "添加食材", "desc": "输入任意食材名称，点击"添加"即可充实您的食品储藏室。" },
      "scan": { "title": "扫描条形码", "desc": "使用摄像头扫描商品条形码，我们将自动将其添加到您的储藏室。" },
      "expiry": { "title": "追踪保质期", "desc": "保存食材时添加保质期，我们将在临近时自动提醒您。" }
    },
    "recipes": {
      "input": { "title": "按食材搜索食谱", "desc": "输入您拥有的食材，我们的AI将为您推荐合适的食谱。" },
      "pantry": { "title": "使用储藏室食材", "desc": "点击此处，一键将整个储藏室的食材加载为食谱配料。" },
      "dietary": { "title": "饮食偏好筛选", "desc": "根据您的饮食偏好过滤食谱，自动从设置中同步。" }
    },
    "mealplan": {
      "calendar": { "title": "规划您的一周", "desc": "将食谱添加到日历上的不同日期，提前规划饮食。" },
      "shopping": { "title": "自动生成购物清单", "desc": "膳食计划中缺少的食材将直接发送到您的购物清单。" }
    },
    "shopping": {
      "list": { "title": "您的购物清单", "desc": "根据您的膳食计划和储藏室缺口自动生成。" },
      "check": { "title": "购物时勾选", "desc": "点击任意商品将其标记为已购买。" },
      "add": { "title": "手动添加商品", "desc": "您随时可以在此手动添加单个商品到清单。" }
    },
    "donate": {
      "expiring": { "title": "捐赠即将过期食品", "desc": "即将过期的食品会显示在这里，让您在浪费前及时捐赠。" },
      "map": { "title": "寻找食物银行", "desc": "根据您的位置，发现附近的食物银行和捐赠点。" }
    },
    "favorites": {
      "grid": { "title": "您收藏的食谱", "desc": "您收藏的食谱都在这里，随时快速访问。" },
      "heart": { "title": "收藏食谱", "desc": "点击任意食谱卡片上的爱心，将其添加到收藏夹。" }
    },
    "settings": {
      "open": { "title": "个性化设置", "desc": "打开设置，根据您的需求定制GroceryGenius。" },
      "dietary": { "title": "饮食偏好", "desc": "在此设置您的饮食需求——食谱和筛选器将在所有页面自动更新。" },
      "calorie": { "title": "每日卡路里目标", "desc": "设置您的每日卡路里目标，我们将全天追踪您的进度。" }
    },
    "calorie": {
      "btn": { "title": "卡路里追踪器", "desc": "随时点击此按钮打开您的每日卡路里追踪器。" },
      "panel": { "title": "追踪您的营养", "desc": "在此记录餐食，实时查看卡路里和营养进度。" }
    },
    "next": "下一步",
    "skip": "跳过导览",
    "finish": "完成",
    "stepOf": "{{current}} / {{total}}",
    "allSet": "一切就绪！🎉"
  }
```

- [ ] **Step 3.6: Validate all locale files**

```bash
cd frontend
for lang in de es fr ja zh; do
  node -e "JSON.parse(require('fs').readFileSync('src/locales/$lang/translation.json','utf8')); console.log('$lang: valid')"
done
```

Expected output:
```
de: valid
es: valid
fr: valid
ja: valid
zh: valid
```

- [ ] **Step 3.7: Commit**

```bash
git add src/locales/de/translation.json src/locales/es/translation.json src/locales/fr/translation.json src/locales/ja/translation.json src/locales/zh/translation.json
git commit -m "feat: add tour i18n keys (de, es, fr, ja, zh)"
```

---

## Task 4: Build `TourOverlay.tsx`

**Files:**
- Create: `frontend/src/components/TourOverlay.tsx`

- [ ] **Step 4.1: Create the component**

```tsx
// frontend/src/components/TourOverlay.tsx
import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { TourStep } from '../tourSteps';

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TourOverlayProps {
  steps: TourStep[];
  currentStep: number;
  isMobile: boolean;
  onNext: () => void;
  onSkip: () => void;
}

const PADDING = 6; // px extra padding around spotlight

export default function TourOverlay({ steps, currentStep, isMobile, onNext, onSkip }: TourOverlayProps) {
  const { t } = useTranslation();
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const [tooltipAbove, setTooltipAbove] = useState(false);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const step = steps[currentStep];
  const total = steps.length;

  // Measure the target element position
  useEffect(() => {
    function measure() {
      const el = document.querySelector(step.selector) as HTMLElement | null;
      if (!el) {
        // Element not yet rendered — retry once after a short delay
        retryRef.current = setTimeout(measure, 150);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({
        top: r.top - PADDING,
        left: r.left - PADDING,
        width: r.width + PADDING * 2,
        height: r.height + PADDING * 2,
      });
      // Decide whether tooltip goes above or below
      setTooltipAbove(r.top > window.innerHeight / 2);
    }

    setRect(null);
    measure();

    return () => {
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, [step.selector, currentStep]);

  if (!rect) return null;

  const isLast = currentStep === total - 1;

  // Tooltip box style
  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    left: isMobile ? '12px' : Math.max(8, rect.left),
    right: isMobile ? '12px' : undefined,
    width: isMobile ? undefined : Math.min(320, window.innerWidth - 24),
    background: 'white',
    borderRadius: isMobile ? '16px 16px 0 0' : '12px',
    padding: '16px',
    boxShadow: '0 6px 32px rgba(0,0,0,0.45)',
    zIndex: 10001,
    ...(isMobile
      ? { bottom: 0, left: 0, right: 0, borderRadius: '16px 16px 0 0' }
      : tooltipAbove
      ? { bottom: window.innerHeight - rect.top + 10 }
      : { top: rect.top + rect.height + 10 }),
  };

  return (
    <>
      {/* Full-screen overlay with spotlight hole via box-shadow */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10000,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            position: 'fixed',
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            borderRadius: '8px',
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.72), 0 0 0 3px #10b981, 0 0 0 6px rgba(16,185,129,0.2)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Tooltip */}
      <div style={tooltipStyle}>
        {isMobile && (
          <div style={{ width: 36, height: 4, background: '#d1d5db', borderRadius: 2, margin: '0 auto 12px' }} />
        )}

        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827', marginBottom: 6 }}>
          {t(step.titleKey)}
        </div>
        <div style={{ fontSize: '0.85rem', color: '#6b7280', lineHeight: 1.55, marginBottom: 14 }}>
          {t(step.descKey)}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Progress dots + step count */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {Array.from({ length: Math.min(total, 10) }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: i <= Math.floor(currentStep * 10 / total) ? '#10b981' : '#d1d5db',
                  transition: 'background 0.2s',
                }}
              />
            ))}
            <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginLeft: 4 }}>
              {t('tour.stepOf', { current: currentStep + 1, total })}
            </span>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onSkip}
              style={{
                padding: '6px 12px',
                background: '#f3f4f6',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#6b7280',
              }}
            >
              {t('tour.skip')}
            </button>
            <button
              onClick={onNext}
              style={{
                padding: '6px 14px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: 'white',
              }}
            >
              {isLast ? t('tour.finish') : t('tour.next')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 4.2: Commit**

```bash
cd frontend
git add src/components/TourOverlay.tsx
git commit -m "feat: add TourOverlay component"
```

---

## Task 5: Wire tour state into App.tsx

**Files:**
- Modify: `frontend/src/App.tsx`

This task has several sub-steps. Complete them in order.

### 5a — Import and state

- [ ] **Step 5a.1: Add imports at the top of App.tsx**

Find the existing imports block (around line 45 where other components are imported). Add:

```tsx
import TourOverlay from './components/TourOverlay';
import { TOUR_STEPS } from './tourSteps';
```

- [ ] **Step 5a.2: Add tour state next to the other boolean state variables (around line 167)**

Find:
```tsx
const [showMissionPopup, setShowMissionPopup] = useState(false);
```

Add immediately after:
```tsx
const [showTour, setShowTour] = useState(false);
const [tourStep, setTourStep] = useState(0);
```

### 5b — Tour trigger

- [ ] **Step 5b.1: Trigger tour after mission popup closes (line ~6560)**

Find the mission popup CTA button handler:
```tsx
onClick={() => {
  setShowMissionPopup(false);
  localStorage.setItem('hasSeenMission', 'true');
}}
```

Replace with:
```tsx
onClick={() => {
  setShowMissionPopup(false);
  localStorage.setItem('hasSeenMission', 'true');
  if (!localStorage.getItem('hasSeenTour')) {
    setTourStep(0);
    setShowTour(true);
  }
}}
```

### 5c — Tour navigation logic

- [ ] **Step 5c.1: Add `handleTourNext` and `handleTourSkip` functions**

Find the `handleTabChange` function (around line 669). Add these two functions directly before it:

```tsx
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
    // Show completion toast (reuse existing toast system)
    setToastMessage(t('tour.allSet'));
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
    return;
  }

  const nextStep = TOUR_STEPS[nextIndex];

  // Navigate to the correct tab if needed
  if (nextStep.tab && nextStep.tab !== currentTab) {
    handleTabChange(nextStep.tab);
  }

  // Run beforeShow side effects for next step
  if (nextStep.beforeShow === 'openSettings') setShowSettings(true);
  if (nextStep.beforeShow === 'openCalorieTracker') setShowCalorieTracker(true);

  setTourStep(nextIndex);
};
```

> **Note:** Check what the existing toast state variables are named in App.tsx before implementing. Search for `setShowToast` or `setToastMessage` — if they differ, use the actual names. If there is no toast system, replace the toast lines with a simple `alert(t('tour.allSet'))` as a temporary fallback.

### 5d — Render TourOverlay

- [ ] **Step 5d.1: Add TourOverlay to the JSX render**

Find the closing `</div>` of the outermost return statement (near the very end of App.tsx, after all other modals). Add the TourOverlay before it:

```tsx
{showTour && (
  <TourOverlay
    steps={TOUR_STEPS}
    currentStep={tourStep}
    isMobile={isMobile}
    onNext={handleTourNext}
    onSkip={handleTourSkip}
  />
)}
```

- [ ] **Step 5e: Commit**

```bash
cd frontend
git add src/App.tsx
git commit -m "feat: wire tour state and navigation into App"
```

---

## Task 6: Add `data-tour` attributes — Pantry

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 6.1: Tag pantry add-item input**

Find (around line 3464):
```tsx
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
```

Add `data-tour="pantry-add-input"` to that input:
```tsx
data-tour="pantry-add-input"
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
```

- [ ] **Step 6.2: Tag the scan barcode button**

Find (around line 3358):
```tsx
📷 {t('pantry.scanBarcode')}
```

The `<button>` element wrapping this text — add `data-tour="pantry-scan-btn"` to it.

- [ ] **Step 6.3: Tag the expiry date input**

Find (around line 3560):
```tsx
type="date" 
value={newPantryItem.expiryDate}
onChange={(e) => setNewPantryItem({...newPantryItem, expiryDate: e.target.value})}
```

Add `data-tour="pantry-expiry-input"` to that input.

- [ ] **Step 6.4: Commit**

```bash
cd frontend
git add src/App.tsx
git commit -m "feat: add data-tour attrs to Pantry elements"
```

---

## Task 7: Add `data-tour` attributes — Recipes, Meal Plan, Shopping

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 7.1: Tag recipes ingredient input**

Search for the recipes tab ingredient input area. Find the `<input>` or `<textarea>` used to enter recipe ingredients (look for `ingredientTags` or `recipeSearchQuery` state). Add `data-tour="recipes-ingredient-input"` to it.

- [ ] **Step 7.2: Tag the "Use Pantry" button in Recipes**

Find (around line 2716 and/or 2868):
```tsx
<button onClick={addPantryToIngredients}
```
Add `data-tour="recipes-use-pantry-btn"` to the first occurrence of this button (the one inside the recipes tab content area).

- [ ] **Step 7.3: Tag the dietary filter in Recipes**

Find the dietary filter `<select>` or filter button in the recipes section. Add `data-tour="recipes-dietary-filter"` to it.

- [ ] **Step 7.4: Tag the MealPlanCalendar**

Find (around line 3264):
```tsx
<MealPlanCalendar
```
Add `data-tour="mealplan-calendar"` as a prop — but since MealPlanCalendar is a React component, wrap it in a `<div>` instead:

```tsx
<div data-tour="mealplan-calendar">
  <MealPlanCalendar
    ...existing props...
  />
</div>
```

- [ ] **Step 7.5: Tag the "add to shopping list" button in Meal Plan**

Find the button in the meal plan section that adds missing ingredients to the shopping list. Add `data-tour="mealplan-shopping-btn"` to it.

- [ ] **Step 7.6: Tag shopping list container**

Find the container `<div>` or `<ul>` that renders `shoppingList.map(...)`. Add `data-tour="shopping-list"` to it.

- [ ] **Step 7.7: Tag first shopping list item checkbox**

The first `<input type="checkbox">` or clickable item row in the shopping list — add `data-tour="shopping-item-checkbox"` to the first one only (it's inside a `.map()`, so add a conditional: `...(index === 0 ? { 'data-tour': 'shopping-item-checkbox' } : {})`).

- [ ] **Step 7.8: Tag the shopping list add-item input**

Find the text input used to manually add items to the shopping list. Add `data-tour="shopping-add-input"` to it.

- [ ] **Step 7.9: Commit**

```bash
cd frontend
git add src/App.tsx
git commit -m "feat: add data-tour attrs to Recipes, MealPlan, Shopping"
```

---

## Task 8: Add `data-tour` attributes — Donate, Favorites, Settings, Calorie Tracker

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 8.1: Tag donate expiring list**

Find the section in the Donate tab that lists expiring items. Add `data-tour="donate-expiring-list"` to its container `<div>`.

- [ ] **Step 8.2: Tag donate map / food bank list**

Find the food bank map or list container in the Donate tab. Add `data-tour="donate-map"` to its container `<div>`.

- [ ] **Step 8.3: Tag favorites grid**

Find (around line 4247):
```tsx
{favorites.map(recipe => (
```
Add `data-tour="favorites-grid"` to the container `<div>` wrapping this map.

- [ ] **Step 8.4: Tag a heart/favorite button**

Find the heart button inside the recipe card in the Favorites tab. Add `data-tour="favorites-heart-btn"` to the first one (use the same index===0 conditional pattern from Step 7.7).

- [ ] **Step 8.5: Tag settings button in header**

Find (around line 2614):
```tsx
<button onClick={() => setShowSettings(true)} style={{
```
Add `data-tour="settings-btn"` to this button.

- [ ] **Step 8.6: Tag dietary preferences section in SettingsPanel**

Open `frontend/src/components/SettingsPanel.tsx`. Find the dietary preferences section/container. Add `data-tour="settings-dietary"` to its wrapper `<div>`.

- [ ] **Step 8.7: Tag calorie goal input in SettingsPanel**

In `frontend/src/components/SettingsPanel.tsx`, find the daily calorie goal input. Add `data-tour="settings-calorie-goal"` to it.

- [ ] **Step 8.8: Tag calorie tracker header button**

Find (around line 2585):
```tsx
<button onClick={() => setShowCalorieTracker(!showCalorieTracker)}
```
Add `data-tour="calorie-tracker-btn"` to this button.

- [ ] **Step 8.9: Tag calorie tracker panel**

Find (around line 5839):
```tsx
<div className="calorie-tracker-panel"
```
Add `data-tour="calorie-tracker-panel"` to this div.

- [ ] **Step 8.10: Commit**

```bash
cd frontend
git add src/App.tsx src/components/SettingsPanel.tsx
git commit -m "feat: add data-tour attrs to Donate, Favorites, Settings, Calorie Tracker"
```

---

## Task 9: Manual smoke test

No automated test framework is set up. Do a full manual walkthrough.

- [ ] **Step 9.1: Start the dev server**

```bash
cd frontend
npm run dev
```

- [ ] **Step 9.2: Clear tour localStorage and trigger the tour**

In the browser console:
```js
localStorage.removeItem('hasSeenTour');
localStorage.removeItem('hasSeenMission');
location.reload();
```

Sign in (or use demo mode). The mission popup should appear. Click "Let's Get Started". The tour should begin on the Pantry tab.

- [ ] **Step 9.3: Walk through all 20 steps**

Verify for each step:
- Spotlight appears on the correct element
- Tooltip title and description are correct
- Tab auto-switches at the right transitions (pantry→recipes, recipes→mealplan, etc.)
- Settings panel opens for steps 17–18, closes after step 18
- Calorie tracker opens for step 20, step 19 spotlights the header button
- Progress counter increments correctly
- "Finish" appears on step 20

- [ ] **Step 9.4: Test Skip**

Restart tour (clear localStorage). Click "Skip tour" on step 3. Verify:
- Tour closes immediately
- `localStorage.hasSeenTour === 'true'`
- Refreshing and re-triggering the mission popup → "Let's Get Started" does NOT restart the tour

- [ ] **Step 9.5: Test mobile layout**

In DevTools, set viewport to 390×844 (iPhone 14). Repeat steps 9.2–9.3. Verify the tooltip docks to the bottom of the screen on every step.

- [ ] **Step 9.6: Test language switching**

Change app language to Spanish (or any non-English language). Restart the tour. Verify tooltip text is in the selected language.

- [ ] **Step 9.7: Fix any issues found, then commit**

```bash
cd frontend
git add -p
git commit -m "fix: tour smoke test fixes"
```

---

## Task 10: Push and open PR

- [ ] **Step 10.1: Push the feature branch**

```bash
git push -u origin feature/onboarding-tour
```

- [ ] **Step 10.2: Open PR targeting `dev`**

```bash
gh pr create \
  --base dev \
  --title "feat: interactive onboarding tour for new users" \
  --body "$(cat <<'EOF'
## Summary
- 20-step spotlight-based tour fires after the mission popup for first-time users
- Auto-navigates through all 6 tabs + Settings + Calorie Tracker
- Spotlight cutout via box-shadow; tooltip docks to bottom on mobile
- Skippable at any step; persisted via localStorage
- Fully translated into all 6 languages (en, de, es, fr, ja, zh)

## Test plan
- [ ] Walk through all 20 steps and verify spotlight + tooltip on each
- [ ] Verify Skip closes tour and sets localStorage flag
- [ ] Verify tour does not show again after completion or skip
- [ ] Test on mobile viewport (390px) — tooltip should dock to bottom
- [ ] Switch language and verify translated strings on all steps
- [ ] Verify Settings opens/closes at correct steps (16–18)
- [ ] Verify Calorie Tracker opens at step 20, closes after

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ Spotlight + box-shadow mechanism → Task 4
- ✅ 20 steps with correct selectors → Tasks 1, 6, 7, 8
- ✅ Auto-tab navigation → Task 5c
- ✅ Settings opens for steps 17–18 → Task 5c (`beforeShow`/`afterStep`)
- ✅ Calorie Tracker opens for step 20 → Task 5c
- ✅ Skip at any step → Task 5c + 5d
- ✅ Completion toast → Task 5c
- ✅ localStorage persistence → Tasks 5b, 5c
- ✅ Mobile bottom-docked tooltip → Task 4
- ✅ All 6 languages → Tasks 2, 3
- ✅ `data-tour` on all 20 target elements → Tasks 6, 7, 8
- ✅ Fires after mission popup → Task 5b
- ✅ Won't re-show → Task 5b guard + Task 5c skip handler

**Placeholder scan:** No TBDs or TODOs found except the intentional note in Step 5c.1 about checking toast variable names — this is a valid "verify before implementing" note, not a placeholder.

**Type consistency:** `TourStep` defined in Task 1, used in Task 4. `beforeShow`/`afterStep` string union literals used consistently across Tasks 1 and 5c.
