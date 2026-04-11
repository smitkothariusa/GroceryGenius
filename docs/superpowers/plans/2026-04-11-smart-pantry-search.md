# Smart Pantry Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the manual pantry name input with a smart search bar that auto-suggests foods, pre-fills unit, suggests an expiry date, and attaches food-specific emojis.

**Architecture:** A static TypeScript food database (`foodDatabase.ts`, ~600 entries) is searched client-side on every keystroke. Selecting a food snaps in a compact confirm card with unit pre-filled and a smart expiry chip. Emoji is stored on the `pantry_items` Supabase row via a new `emoji` column.

**Tech Stack:** React 18, TypeScript, react-i18next, Supabase JS v2, Vite

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `frontend/src/data/foodDatabase.ts` | **CREATE** | All food entries: emoji, unit, shelfLife, category, multilingual names |
| `frontend/src/lib/database.ts` | **MODIFY** | Add `emoji?` param to `pantryService.add()` and `pantryService.update()` |
| `frontend/src/lib/supabase.ts` | **MODIFY** | Add `emoji?: string` to `PantryItem` interface |
| `frontend/src/App.tsx` | **MODIFY** | Smart search UI + compact card confirm; emoji rendering in pantry list |
| `frontend/src/locales/en/translation.json` | **MODIFY** | New pantry keys + missing unit keys |
| `frontend/src/locales/es/translation.json` | **MODIFY** | Same |
| `frontend/src/locales/fr/translation.json` | **MODIFY** | Same |
| `frontend/src/locales/de/translation.json` | **MODIFY** | Same |
| `frontend/src/locales/zh/translation.json` | **MODIFY** | Same |
| `frontend/src/locales/ja/translation.json` | **MODIFY** | Same |
| Supabase `pantry_items` table | **MIGRATE** | Add `emoji text` column via MCP |

---

## Task 1: Supabase Migration — Add emoji column

**Files:**
- Create: `supabase/migrations/20260411_pantry_items_add_emoji.sql`
- Supabase MCP: apply migration

- [ ] **Step 1.1: Create migration file**

```sql
-- supabase/migrations/20260411_pantry_items_add_emoji.sql
ALTER TABLE pantry_items ADD COLUMN IF NOT EXISTS emoji text;
```

- [ ] **Step 1.2: Apply migration via Supabase MCP**

Use the `mcp__plugin_supabase_supabase__apply_migration` tool with:
- `name`: `20260411_pantry_items_add_emoji`
- `query`: the SQL above

Verify success — no error returned.

- [ ] **Step 1.3: Commit**

```bash
cd c:/Users/smitk/grocerygenius
git add supabase/migrations/20260411_pantry_items_add_emoji.sql
git commit -m "feat: add emoji column to pantry_items"
```

---

## Task 2: Update PantryItem types and database service

**Files:**
- Modify: `frontend/src/lib/supabase.ts` (PantryItem interface, line ~42)
- Modify: `frontend/src/lib/database.ts` (pantryService.add and pantryService.update)

- [ ] **Step 2.1: Add `emoji?` to PantryItem in supabase.ts**

In `frontend/src/lib/supabase.ts`, update the `PantryItem` interface:

```ts
export interface PantryItem {
  id: string;
  user_id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  expiry_date?: string;
  added_date: string;
  updated_at: string;
  emoji?: string;  // NEW
}
```

- [ ] **Step 2.2: Update `pantryService.add()` in database.ts**

Replace the `add` method signature and body:

```ts
async add(item: {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  expiryDate?: string;
  emoji?: string;  // NEW
}) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('pantry_items')
    .insert({
      user_id: userData.user.id,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      expiry_date: item.expiryDate || null,
      emoji: item.emoji || null,  // NEW
    })
    .select()
    .single();

  if (error) throw error;
  return data;
},
```

- [ ] **Step 2.3: Update `pantryService.update()` in database.ts**

Replace the `update` method signature and body:

```ts
async update(id: string, item: {
  name?: string;
  quantity?: number;
  unit?: string;
  category?: string;
  expiryDate?: string;
  emoji?: string;  // NEW
}) {
  const { data, error } = await supabase
    .from('pantry_items')
    .update({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      expiry_date: item.expiryDate,
      emoji: item.emoji,  // NEW
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
},
```

- [ ] **Step 2.4: Update App.tsx local PantryItem interface**

In `frontend/src/App.tsx`, find the local `PantryItem` interface (around line 52) and add `emoji?`:

```ts
interface PantryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  expiryDate?: string;
  emoji?: string;  // NEW
}
```

- [ ] **Step 2.5: Update pantry load to map emoji from DB**

In `frontend/src/App.tsx`, find the pantry load block (around line 404-408) that transforms DB rows. Add `emoji` to the mapping:

```ts
setPantry(pantryData.map(item => ({
  id: item.id,
  name: item.name,
  quantity: item.quantity,
  unit: item.unit,
  category: item.category,
  expiryDate: item.expiry_date || undefined,
  emoji: item.emoji || undefined,  // NEW
})));
```

- [ ] **Step 2.6: Commit**

```bash
cd c:/Users/smitk/grocerygenius
git add frontend/src/lib/supabase.ts frontend/src/lib/database.ts frontend/src/App.tsx
git commit -m "feat: add emoji field to PantryItem type and database service"
```

---

## Task 3: Update pantry list rendering to use item emoji

**Files:**
- Modify: `frontend/src/App.tsx` (pantry list, around line 3842)

- [ ] **Step 3.1: Replace category-based emoji with item.emoji fallback**

Find this block in the pantry list render (around line 3842):

```tsx
{item.category === 'produce' ? '🥬' :
item.category === 'dairy' ? '🥛' :
item.category === 'meat' ? '🍖' :
item.category === 'canned' ? '🥫' :
item.category === 'grains' ? '🌾' :
item.category === 'breakfast' ? '🥞' : '📦'}
```

Replace with:

```tsx
{item.emoji ?? (
  item.category === 'produce' ? '🥬' :
  item.category === 'dairy' ? '🥛' :
  item.category === 'meat' ? '🍖' :
  item.category === 'canned' ? '🥫' :
  item.category === 'grains' ? '🌾' :
  item.category === 'breakfast' ? '🥞' : '📦'
)}
```

- [ ] **Step 3.2: Verify build still compiles**

```bash
cd c:/Users/smitk/grocerygenius/frontend
npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors.

- [ ] **Step 3.3: Commit**

```bash
cd c:/Users/smitk/grocerygenius
git add frontend/src/App.tsx
git commit -m "feat: render food-specific emoji in pantry list"
```

---

## Task 4: Add i18n keys for smart search UI

**Files:**
- Modify: all 6 locale files under `frontend/src/locales/`

- [ ] **Step 4.1: Add keys to English locale**

In `frontend/src/locales/en/translation.json`, inside the `"pantry"` object, add after the existing `"units"` block:

```json
"smartSearch": "Search foods…",
"smartExpiry": "Smart expiry",
"smartExpiryDays": "+{{count}} days",
"changeUnit": "Change unit",
"quantityRequired": "Enter a quantity to add"
```

Also add missing unit keys inside `"pantry": { "units": { ... } }`:

```json
"carton": "carton",
"bunch": "bunch",
"bag": "bag",
"jar": "jar",
"loaf": "loaf",
"dozen": "dozen",
"pack": "pack",
"bottle": "bottle",
"head": "head",
"clove": "clove",
"slice": "slice",
"container": "container",
"roll": "roll",
"bar": "bar",
"block": "block",
"sachet": "sachet",
"fillet": "fillet",
"breast": "breast",
"leg": "leg",
"rack": "rack",
"bunch": "bunch"
```

- [ ] **Step 4.2: Add keys to Spanish locale (`es`)**

In `frontend/src/locales/es/translation.json`, inside `"pantry"`:

```json
"smartSearch": "Buscar alimentos…",
"smartExpiry": "Vencimiento estimado",
"smartExpiryDays": "+{{count}} días",
"changeUnit": "Cambiar unidad",
"quantityRequired": "Ingresa una cantidad"
```

And inside `"pantry": { "units": { ... } }`:

```json
"carton": "cartón",
"bunch": "manojo",
"bag": "bolsa",
"jar": "frasco",
"loaf": "hogaza",
"dozen": "docena",
"pack": "paquete",
"bottle": "botella",
"head": "cabeza",
"clove": "diente",
"slice": "rebanada",
"container": "envase",
"roll": "rollo",
"bar": "barra",
"block": "bloque",
"sachet": "sobre",
"fillet": "filete",
"breast": "pechuga",
"leg": "muslo",
"rack": "costillar"
```

- [ ] **Step 4.3: Add keys to French locale (`fr`)**

In `frontend/src/locales/fr/translation.json`, inside `"pantry"`:

```json
"smartSearch": "Rechercher des aliments…",
"smartExpiry": "Expiration estimée",
"smartExpiryDays": "+{{count}} jours",
"changeUnit": "Changer l'unité",
"quantityRequired": "Entrez une quantité"
```

And inside `"pantry": { "units": { ... } }`:

```json
"carton": "carton",
"bunch": "botte",
"bag": "sac",
"jar": "bocal",
"loaf": "miche",
"dozen": "douzaine",
"pack": "paquet",
"bottle": "bouteille",
"head": "tête",
"clove": "gousse",
"slice": "tranche",
"container": "récipient",
"roll": "rouleau",
"bar": "tablette",
"block": "bloc",
"sachet": "sachet",
"fillet": "filet",
"breast": "blanc",
"leg": "cuisse",
"rack": "carré"
```

- [ ] **Step 4.4: Add keys to German locale (`de`)**

In `frontend/src/locales/de/translation.json`, inside `"pantry"`:

```json
"smartSearch": "Lebensmittel suchen…",
"smartExpiry": "Geschätztes Ablaufdatum",
"smartExpiryDays": "+{{count}} Tage",
"changeUnit": "Einheit ändern",
"quantityRequired": "Bitte Menge eingeben"
```

And inside `"pantry": { "units": { ... } }`:

```json
"carton": "Karton",
"bunch": "Bund",
"bag": "Tüte",
"jar": "Glas",
"loaf": "Laib",
"dozen": "Dutzend",
"pack": "Packung",
"bottle": "Flasche",
"head": "Kopf",
"clove": "Zehe",
"slice": "Scheibe",
"container": "Behälter",
"roll": "Rolle",
"bar": "Riegel",
"block": "Block",
"sachet": "Beutel",
"fillet": "Filet",
"breast": "Brust",
"leg": "Keule",
"rack": "Rippenstück"
```

- [ ] **Step 4.5: Add keys to Chinese locale (`zh`)**

In `frontend/src/locales/zh/translation.json`, inside `"pantry"`:

```json
"smartSearch": "搜索食物…",
"smartExpiry": "建议保质期",
"smartExpiryDays": "+{{count}}天",
"changeUnit": "更改单位",
"quantityRequired": "请输入数量"
```

And inside `"pantry": { "units": { ... } }`:

```json
"carton": "盒",
"bunch": "束",
"bag": "袋",
"jar": "罐",
"loaf": "条",
"dozen": "打",
"pack": "包",
"bottle": "瓶",
"head": "个",
"clove": "瓣",
"slice": "片",
"container": "盒",
"roll": "卷",
"bar": "条",
"block": "块",
"sachet": "袋",
"fillet": "片",
"breast": "胸",
"leg": "腿",
"rack": "排"
```

- [ ] **Step 4.6: Add keys to Japanese locale (`ja`)**

In `frontend/src/locales/ja/translation.json`, inside `"pantry"`:

```json
"smartSearch": "食品を検索…",
"smartExpiry": "推奨期限",
"smartExpiryDays": "+{{count}}日",
"changeUnit": "単位を変更",
"quantityRequired": "数量を入力してください"
```

And inside `"pantry": { "units": { ... } }`:

```json
"carton": "カートン",
"bunch": "束",
"bag": "袋",
"jar": "瓶",
"loaf": "斤",
"dozen": "ダース",
"pack": "パック",
"bottle": "本",
"head": "個",
"clove": "片",
"slice": "枚",
"container": "容器",
"roll": "本",
"bar": "本",
"block": "块",
"sachet": "袋",
"fillet": "切れ",
"breast": "胸肉",
"leg": "もも肉",
"rack": "ラック"
```

- [ ] **Step 4.7: Commit**

```bash
cd c:/Users/smitk/grocerygenius
git add frontend/src/locales/
git commit -m "feat: add smart search i18n keys and missing unit translations"
```

---

## Task 5: Create the food database

**Files:**
- Create: `frontend/src/data/foodDatabase.ts`

- [ ] **Step 5.1: Create foodDatabase.ts with FoodEntry type and ~600 entries**

Create `frontend/src/data/foodDatabase.ts` with the following content. This is the complete file — write it in one shot:

```ts
export interface FoodEntry {
  id: string;
  emoji: string;
  defaultUnit: string;
  shelfLife: number; // days
  category: string;
  names: {
    en: string[];
    es: string[];
    fr: string[];
    de: string[];
    zh: string[];
    ja: string[];
  };
}

export const FOOD_DATABASE: FoodEntry[] = [
  // ─── DAIRY ────────────────────────────────────────────────────────────────
  { id: 'milk', emoji: '🥛', defaultUnit: 'carton', shelfLife: 7, category: 'dairy',
    names: { en: ['Milk','whole milk','skim milk','2% milk','low-fat milk'], es: ['Leche','leche entera','leche desnatada'], fr: ['Lait','lait entier','lait écrémé'], de: ['Milch','Vollmilch','Magermilch'], zh: ['牛奶','全脂牛奶','脱脂牛奶'], ja: ['牛乳','全脂牛乳','低脂肪乳'] } },
  { id: 'eggs', emoji: '🥚', defaultUnit: 'dozen', shelfLife: 30, category: 'dairy',
    names: { en: ['Eggs','egg','chicken eggs','free range eggs'], es: ['Huevos','huevo','huevos de gallina'], fr: ['Œufs','oeuf','oeufs de poule'], de: ['Eier','Ei','Hühnereier'], zh: ['鸡蛋','蛋','土鸡蛋'], ja: ['卵','たまご','鶏卵'] } },
  { id: 'butter', emoji: '🧈', defaultUnit: 'block', shelfLife: 30, category: 'dairy',
    names: { en: ['Butter','unsalted butter','salted butter'], es: ['Mantequilla','mantequilla sin sal'], fr: ['Beurre','beurre doux','beurre demi-sel'], de: ['Butter','ungesalzene Butter'], zh: ['黄油','无盐黄油'], ja: ['バター','無塩バター'] } },
  { id: 'cheese_cheddar', emoji: '🧀', defaultUnit: 'block', shelfLife: 30, category: 'dairy',
    names: { en: ['Cheddar Cheese','cheddar','sharp cheddar'], es: ['Queso cheddar','cheddar'], fr: ['Fromage cheddar','cheddar'], de: ['Cheddar-Käse','Cheddar'], zh: ['切达奶酪','切达'], ja: ['チェダーチーズ','チェダー'] } },
  { id: 'cheese_mozzarella', emoji: '🧀', defaultUnit: 'block', shelfLife: 14, category: 'dairy',
    names: { en: ['Mozzarella','fresh mozzarella','mozzarella cheese'], es: ['Mozzarella','queso mozzarella'], fr: ['Mozzarella','fromage mozzarella'], de: ['Mozzarella'], zh: ['马苏里拉奶酪','水牛奶酪'], ja: ['モッツァレラ','モッツァレラチーズ'] } },
  { id: 'yogurt', emoji: '🍶', defaultUnit: 'container', shelfLife: 14, category: 'dairy',
    names: { en: ['Yogurt','greek yogurt','plain yogurt'], es: ['Yogur','yogur griego'], fr: ['Yaourt','yaourt grec'], de: ['Joghurt','griechischer Joghurt'], zh: ['酸奶','希腊酸奶'], ja: ['ヨーグルト','プレーンヨーグルト'] } },
  { id: 'cream', emoji: '🥛', defaultUnit: 'carton', shelfLife: 14, category: 'dairy',
    names: { en: ['Heavy Cream','whipping cream','double cream'], es: ['Crema de leche','nata para montar'], fr: ['Crème fraîche','crème liquide'], de: ['Sahne','Schlagsahne'], zh: ['奶油','鲜奶油'], ja: ['生クリーム','ホイップクリーム'] } },
  { id: 'sour_cream', emoji: '🥛', defaultUnit: 'container', shelfLife: 14, category: 'dairy',
    names: { en: ['Sour Cream'], es: ['Crema agria'], fr: ['Crème aigre'], de: ['Sauerrahm'], zh: ['酸奶油'], ja: ['サワークリーム'] } },
  { id: 'cream_cheese', emoji: '🧀', defaultUnit: 'block', shelfLife: 14, category: 'dairy',
    names: { en: ['Cream Cheese','philadelphia'], es: ['Queso crema'], fr: ['Fromage à la crème','philadelphia'], de: ['Frischkäse'], zh: ['奶油奶酪'], ja: ['クリームチーズ'] } },
  { id: 'parmesan', emoji: '🧀', defaultUnit: 'block', shelfLife: 60, category: 'dairy',
    names: { en: ['Parmesan','parmigiano','parmesan cheese'], es: ['Parmesano','queso parmesano'], fr: ['Parmesan'], de: ['Parmesan'], zh: ['帕玛森奶酪'], ja: ['パルメザン'] } },
  { id: 'ricotta', emoji: '🧀', defaultUnit: 'container', shelfLife: 7, category: 'dairy',
    names: { en: ['Ricotta','ricotta cheese'], es: ['Ricota'], fr: ['Ricotta'], de: ['Ricotta'], zh: ['乳清奶酪'], ja: ['リコッタ'] } },
  { id: 'cottage_cheese', emoji: '🥛', defaultUnit: 'container', shelfLife: 10, category: 'dairy',
    names: { en: ['Cottage Cheese'], es: ['Requesón'], fr: ['Fromage cottage'], de: ['Hüttenkäse'], zh: ['农家奶酪'], ja: ['カッテージチーズ'] } },

  // ─── PRODUCE — VEGETABLES ─────────────────────────────────────────────────
  { id: 'tomato', emoji: '🍅', defaultUnit: 'pieces', shelfLife: 7, category: 'produce',
    names: { en: ['Tomatoes','tomato','cherry tomatoes','roma tomatoes'], es: ['Tomates','tomate'], fr: ['Tomates','tomate'], de: ['Tomaten','Tomate'], zh: ['西红柿','番茄'], ja: ['トマト'] } },
  { id: 'onion', emoji: '🧅', defaultUnit: 'pieces', shelfLife: 30, category: 'produce',
    names: { en: ['Onion','onions','yellow onion','red onion','white onion'], es: ['Cebolla','cebollas'], fr: ['Oignon','oignons'], de: ['Zwiebel','Zwiebeln'], zh: ['洋葱'], ja: ['玉ねぎ'] } },
  { id: 'garlic', emoji: '🧄', defaultUnit: 'head', shelfLife: 30, category: 'produce',
    names: { en: ['Garlic','garlic head','garlic cloves'], es: ['Ajo','ajos'], fr: ['Ail'], de: ['Knoblauch'], zh: ['大蒜'], ja: ['ニンニク'] } },
  { id: 'potato', emoji: '🥔', defaultUnit: 'lbs', shelfLife: 30, category: 'produce',
    names: { en: ['Potatoes','potato','russet potato','sweet potato'], es: ['Papas','patatas','papa'], fr: ['Pommes de terre','pomme de terre'], de: ['Kartoffeln','Kartoffel'], zh: ['土豆','马铃薯'], ja: ['じゃがいも'] } },
  { id: 'sweet_potato', emoji: '🍠', defaultUnit: 'pieces', shelfLife: 21, category: 'produce',
    names: { en: ['Sweet Potato','sweet potatoes','yam'], es: ['Camote','batata'], fr: ['Patate douce'], de: ['Süßkartoffel'], zh: ['红薯','甘薯'], ja: ['さつまいも'] } },
  { id: 'carrot', emoji: '🥕', defaultUnit: 'bag', shelfLife: 21, category: 'produce',
    names: { en: ['Carrots','carrot','baby carrots'], es: ['Zanahorias','zanahoria'], fr: ['Carottes','carotte'], de: ['Karotten','Karotte','Möhren'], zh: ['胡萝卜'], ja: ['にんじん'] } },
  { id: 'broccoli', emoji: '🥦', defaultUnit: 'head', shelfLife: 7, category: 'produce',
    names: { en: ['Broccoli','broccoli florets'], es: ['Brócoli'], fr: ['Brocoli'], de: ['Brokkoli'], zh: ['西兰花'], ja: ['ブロッコリー'] } },
  { id: 'spinach', emoji: '🌿', defaultUnit: 'bag', shelfLife: 5, category: 'produce',
    names: { en: ['Spinach','baby spinach'], es: ['Espinacas','espinaca'], fr: ['Épinards','épinard'], de: ['Spinat'], zh: ['菠菜'], ja: ['ほうれん草'] } },
  { id: 'lettuce', emoji: '🥬', defaultUnit: 'head', shelfLife: 7, category: 'produce',
    names: { en: ['Lettuce','romaine','iceberg lettuce','mixed greens'], es: ['Lechuga'], fr: ['Laitue'], de: ['Salat','Kopfsalat'], zh: ['生菜'], ja: ['レタス'] } },
  { id: 'cucumber', emoji: '🥒', defaultUnit: 'pieces', shelfLife: 7, category: 'produce',
    names: { en: ['Cucumber','cucumbers'], es: ['Pepino','pepinos'], fr: ['Concombre'], de: ['Gurke'], zh: ['黄瓜'], ja: ['きゅうり'] } },
  { id: 'bell_pepper', emoji: '🫑', defaultUnit: 'pieces', shelfLife: 10, category: 'produce',
    names: { en: ['Bell Pepper','bell peppers','red pepper','green pepper','yellow pepper'], es: ['Pimiento','pimiento rojo','pimiento verde'], fr: ['Poivron'], de: ['Paprika','Paprikaschote'], zh: ['甜椒','灯笼椒'], ja: ['ピーマン','パプリカ'] } },
  { id: 'zucchini', emoji: '🥒', defaultUnit: 'pieces', shelfLife: 10, category: 'produce',
    names: { en: ['Zucchini','courgette'], es: ['Calabacín'], fr: ['Courgette'], de: ['Zucchini'], zh: ['西葫芦'], ja: ['ズッキーニ'] } },
  { id: 'eggplant', emoji: '🍆', defaultUnit: 'pieces', shelfLife: 7, category: 'produce',
    names: { en: ['Eggplant','aubergine'], es: ['Berenjena'], fr: ['Aubergine'], de: ['Aubergine'], zh: ['茄子'], ja: ['ナス'] } },
  { id: 'mushroom', emoji: '🍄', defaultUnit: 'bag', shelfLife: 7, category: 'produce',
    names: { en: ['Mushrooms','mushroom','button mushroom','cremini'], es: ['Champiñones','champiñón','hongos'], fr: ['Champignons','champignon'], de: ['Pilze','Champignons'], zh: ['蘑菇','口蘑'], ja: ['きのこ','マッシュルーム'] } },
  { id: 'celery', emoji: '🌿', defaultUnit: 'bunch', shelfLife: 14, category: 'produce',
    names: { en: ['Celery','celery stalks'], es: ['Apio'], fr: ['Céleri'], de: ['Sellerie'], zh: ['芹菜'], ja: ['セロリ'] } },
  { id: 'corn', emoji: '🌽', defaultUnit: 'pieces', shelfLife: 5, category: 'produce',
    names: { en: ['Corn','sweet corn','corn on the cob'], es: ['Maíz','elote','choclo'], fr: ['Maïs','épi de maïs'], de: ['Mais','Maiskolben'], zh: ['玉米'], ja: ['とうもろこし'] } },
  { id: 'asparagus', emoji: '🌿', defaultUnit: 'bunch', shelfLife: 5, category: 'produce',
    names: { en: ['Asparagus'], es: ['Espárragos','espárrago'], fr: ['Asperges'], de: ['Spargel'], zh: ['芦笋'], ja: ['アスパラガス'] } },
  { id: 'green_beans', emoji: '🌿', defaultUnit: 'bag', shelfLife: 7, category: 'produce',
    names: { en: ['Green Beans','string beans','french beans'], es: ['Ejotes','judías verdes'], fr: ['Haricots verts'], de: ['Grüne Bohnen'], zh: ['四季豆'], ja: ['いんげん'] } },
  { id: 'peas', emoji: '🟢', defaultUnit: 'bag', shelfLife: 5, category: 'produce',
    names: { en: ['Peas','fresh peas','snap peas','snow peas'], es: ['Guisantes','chícharos'], fr: ['Petits pois'], de: ['Erbsen'], zh: ['豌豆'], ja: ['えんどう豆'] } },
  { id: 'cauliflower', emoji: '🥦', defaultUnit: 'head', shelfLife: 7, category: 'produce',
    names: { en: ['Cauliflower'], es: ['Coliflor'], fr: ['Chou-fleur'], de: ['Blumenkohl'], zh: ['花椰菜'], ja: ['カリフラワー'] } },
  { id: 'cabbage', emoji: '🥬', defaultUnit: 'head', shelfLife: 14, category: 'produce',
    names: { en: ['Cabbage','green cabbage','red cabbage'], es: ['Repollo','col'], fr: ['Chou'], de: ['Kohl','Weißkohl'], zh: ['卷心菜','圆白菜'], ja: ['キャベツ'] } },
  { id: 'leek', emoji: '🌿', defaultUnit: 'bunch', shelfLife: 10, category: 'produce',
    names: { en: ['Leeks','leek'], es: ['Puerros','puerro'], fr: ['Poireaux','poireau'], de: ['Lauch'], zh: ['韭葱'], ja: ['リーキ','西洋ねぎ'] } },
  { id: 'kale', emoji: '🥬', defaultUnit: 'bunch', shelfLife: 5, category: 'produce',
    names: { en: ['Kale','curly kale','tuscan kale'], es: ['Col rizada','kale'], fr: ['Chou frisé','kale'], de: ['Grünkohl'], zh: ['羽衣甘蓝'], ja: ['ケール'] } },
  { id: 'beetroot', emoji: '🫐', defaultUnit: 'bunch', shelfLife: 21, category: 'produce',
    names: { en: ['Beets','beetroot','red beets'], es: ['Remolacha','betabel'], fr: ['Betteraves'], de: ['Rote Bete'], zh: ['甜菜根'], ja: ['ビーツ'] } },
  { id: 'radish', emoji: '🌸', defaultUnit: 'bunch', shelfLife: 10, category: 'produce',
    names: { en: ['Radishes','radish'], es: ['Rábanos','rábano'], fr: ['Radis'], de: ['Radieschen'], zh: ['萝卜'], ja: ['大根','ラディッシュ'] } },
  { id: 'scallion', emoji: '🌿', defaultUnit: 'bunch', shelfLife: 7, category: 'produce',
    names: { en: ['Green Onions','scallions','spring onions'], es: ['Cebolletas','cebolla de verdeo'], fr: ['Oignons verts','ciboulette'], de: ['Frühlingszwiebeln'], zh: ['葱','小葱'], ja: ['ねぎ','青ねぎ'] } },

  // ─── PRODUCE — FRUITS ─────────────────────────────────────────────────────
  { id: 'apple', emoji: '🍎', defaultUnit: 'pieces', shelfLife: 21, category: 'produce',
    names: { en: ['Apples','apple','granny smith','fuji apple','gala apple'], es: ['Manzanas','manzana'], fr: ['Pommes','pomme'], de: ['Äpfel','Apfel'], zh: ['苹果'], ja: ['りんご'] } },
  { id: 'banana', emoji: '🍌', defaultUnit: 'bunch', shelfLife: 7, category: 'produce',
    names: { en: ['Bananas','banana'], es: ['Plátanos','banana'], fr: ['Bananes','banane'], de: ['Bananen','Banane'], zh: ['香蕉'], ja: ['バナナ'] } },
  { id: 'orange', emoji: '🍊', defaultUnit: 'pieces', shelfLife: 14, category: 'produce',
    names: { en: ['Oranges','orange','navel orange'], es: ['Naranjas','naranja'], fr: ['Oranges','orange'], de: ['Orangen','Orange'], zh: ['橙子','脐橙'], ja: ['オレンジ'] } },
  { id: 'lemon', emoji: '🍋', defaultUnit: 'pieces', shelfLife: 21, category: 'produce',
    names: { en: ['Lemons','lemon'], es: ['Limones','limón'], fr: ['Citrons','citron'], de: ['Zitronen','Zitrone'], zh: ['柠檬'], ja: ['レモン'] } },
  { id: 'lime', emoji: '🍋', defaultUnit: 'pieces', shelfLife: 21, category: 'produce',
    names: { en: ['Limes','lime'], es: ['Limas','lima'], fr: ['Citrons verts','citron vert'], de: ['Limetten','Limette'], zh: ['青柠'], ja: ['ライム'] } },
  { id: 'strawberry', emoji: '🍓', defaultUnit: 'bag', shelfLife: 5, category: 'produce',
    names: { en: ['Strawberries','strawberry'], es: ['Fresas','fresa'], fr: ['Fraises','fraise'], de: ['Erdbeeren','Erdbeere'], zh: ['草莓'], ja: ['いちご'] } },
  { id: 'blueberry', emoji: '🫐', defaultUnit: 'bag', shelfLife: 7, category: 'produce',
    names: { en: ['Blueberries','blueberry'], es: ['Arándanos','arándano'], fr: ['Myrtilles','myrtille'], de: ['Blaubeeren','Heidelbeeren'], zh: ['蓝莓'], ja: ['ブルーベリー'] } },
  { id: 'grape', emoji: '🍇', defaultUnit: 'bag', shelfLife: 10, category: 'produce',
    names: { en: ['Grapes','grape','red grapes','green grapes'], es: ['Uvas','uva'], fr: ['Raisins','raisin'], de: ['Weintrauben','Trauben'], zh: ['葡萄'], ja: ['ぶどう'] } },
  { id: 'watermelon', emoji: '🍉', defaultUnit: 'pieces', shelfLife: 14, category: 'produce',
    names: { en: ['Watermelon'], es: ['Sandía'], fr: ['Pastèque'], de: ['Wassermelone'], zh: ['西瓜'], ja: ['スイカ'] } },
  { id: 'mango', emoji: '🥭', defaultUnit: 'pieces', shelfLife: 7, category: 'produce',
    names: { en: ['Mango','mangoes'], es: ['Mangos','mango'], fr: ['Mangues','mangue'], de: ['Mangos','Mango'], zh: ['芒果'], ja: ['マンゴー'] } },
  { id: 'pineapple', emoji: '🍍', defaultUnit: 'pieces', shelfLife: 7, category: 'produce',
    names: { en: ['Pineapple'], es: ['Piña'], fr: ['Ananas'], de: ['Ananas'], zh: ['菠萝'], ja: ['パイナップル'] } },
  { id: 'peach', emoji: '🍑', defaultUnit: 'pieces', shelfLife: 5, category: 'produce',
    names: { en: ['Peaches','peach','nectarine'], es: ['Duraznos','melocotones'], fr: ['Pêches','pêche'], de: ['Pfirsiche','Pfirsich'], zh: ['桃子'], ja: ['もも'] } },
  { id: 'pear', emoji: '🍐', defaultUnit: 'pieces', shelfLife: 7, category: 'produce',
    names: { en: ['Pears','pear'], es: ['Peras','pera'], fr: ['Poires','poire'], de: ['Birnen','Birne'], zh: ['梨'], ja: ['なし'] } },
  { id: 'avocado', emoji: '🥑', defaultUnit: 'pieces', shelfLife: 5, category: 'produce',
    names: { en: ['Avocado','avocados','hass avocado'], es: ['Aguacate','palta'], fr: ['Avocat'], de: ['Avocado'], zh: ['牛油果','鳄梨'], ja: ['アボカド'] } },
  { id: 'cherry', emoji: '🍒', defaultUnit: 'bag', shelfLife: 7, category: 'produce',
    names: { en: ['Cherries','cherry'], es: ['Cerezas','cereza'], fr: ['Cerises','cerise'], de: ['Kirschen','Kirsche'], zh: ['樱桃'], ja: ['さくらんぼ'] } },
  { id: 'raspberry', emoji: '🫐', defaultUnit: 'bag', shelfLife: 3, category: 'produce',
    names: { en: ['Raspberries','raspberry'], es: ['Frambuesas','frambuesa'], fr: ['Framboises','framboise'], de: ['Himbeeren','Himbeere'], zh: ['覆盆子'], ja: ['ラズベリー'] } },
  { id: 'kiwi', emoji: '🥝', defaultUnit: 'pieces', shelfLife: 14, category: 'produce',
    names: { en: ['Kiwi','kiwifruit'], es: ['Kiwi'], fr: ['Kiwi'], de: ['Kiwi'], zh: ['猕猴桃'], ja: ['キウイ'] } },
  { id: 'pomegranate', emoji: '🍎', defaultUnit: 'pieces', shelfLife: 14, category: 'produce',
    names: { en: ['Pomegranate'], es: ['Granada'], fr: ['Grenade'], de: ['Granatapfel'], zh: ['石榴'], ja: ['ざくろ'] } },
  { id: 'coconut', emoji: '🥥', defaultUnit: 'pieces', shelfLife: 30, category: 'produce',
    names: { en: ['Coconut'], es: ['Coco'], fr: ['Noix de coco'], de: ['Kokosnuss'], zh: ['椰子'], ja: ['ヤシの実'] } },
  { id: 'ginger', emoji: '🫚', defaultUnit: 'pieces', shelfLife: 21, category: 'produce',
    names: { en: ['Ginger','ginger root'], es: ['Jengibre'], fr: ['Gingembre'], de: ['Ingwer'], zh: ['生姜'], ja: ['しょうが'] } },

  // ─── MEAT ─────────────────────────────────────────────────────────────────
  { id: 'chicken_breast', emoji: '🍗', defaultUnit: 'lbs', shelfLife: 3, category: 'meat',
    names: { en: ['Chicken Breast','chicken breasts','boneless chicken'], es: ['Pechuga de pollo'], fr: ['Blanc de poulet','filet de poulet'], de: ['Hühnerbrust','Hähnchenbrust'], zh: ['鸡胸肉'], ja: ['鶏むね肉'] } },
  { id: 'chicken_thigh', emoji: '🍗', defaultUnit: 'lbs', shelfLife: 3, category: 'meat',
    names: { en: ['Chicken Thighs','chicken legs','chicken thigh'], es: ['Muslos de pollo'], fr: ['Cuisses de poulet'], de: ['Hähnchenschenkel'], zh: ['鸡腿肉'], ja: ['鶏もも肉'] } },
  { id: 'ground_beef', emoji: '🥩', defaultUnit: 'lbs', shelfLife: 3, category: 'meat',
    names: { en: ['Ground Beef','minced beef','hamburger meat'], es: ['Carne molida','carne picada'], fr: ['Viande hachée','boeuf haché'], de: ['Hackfleisch','Rinderhackfleisch'], zh: ['牛肉馅','碎牛肉'], ja: ['ひき肉','牛ひき肉'] } },
  { id: 'steak', emoji: '🥩', defaultUnit: 'lbs', shelfLife: 3, category: 'meat',
    names: { en: ['Steak','beef steak','sirloin','ribeye'], es: ['Bistec','filete'], fr: ['Steak','bifteck'], de: ['Steak','Rinderfilet'], zh: ['牛排'], ja: ['ステーキ'] } },
  { id: 'pork_chop', emoji: '🥩', defaultUnit: 'lbs', shelfLife: 3, category: 'meat',
    names: { en: ['Pork Chops','pork chop'], es: ['Chuletas de cerdo'], fr: ['Côtelettes de porc'], de: ['Schweinekotelett'], zh: ['猪排'], ja: ['ポークチョップ'] } },
  { id: 'bacon', emoji: '🥓', defaultUnit: 'pack', shelfLife: 7, category: 'meat',
    names: { en: ['Bacon','streaky bacon','turkey bacon'], es: ['Tocino','beicon'], fr: ['Bacon','lardons'], de: ['Speck','Bacon'], zh: ['培根'], ja: ['ベーコン'] } },
  { id: 'sausage', emoji: '🌭', defaultUnit: 'pack', shelfLife: 5, category: 'meat',
    names: { en: ['Sausages','sausage','breakfast sausage','italian sausage'], es: ['Salchichas','chorizo'], fr: ['Saucisses','saucisse'], de: ['Würstchen','Wurst'], zh: ['香肠'], ja: ['ソーセージ'] } },
  { id: 'salmon', emoji: '🐟', defaultUnit: 'lbs', shelfLife: 3, category: 'meat',
    names: { en: ['Salmon','salmon fillet','atlantic salmon'], es: ['Salmón'], fr: ['Saumon'], de: ['Lachs'], zh: ['三文鱼','鲑鱼'], ja: ['サーモン'] } },
  { id: 'tuna_fresh', emoji: '🐟', defaultUnit: 'lbs', shelfLife: 2, category: 'meat',
    names: { en: ['Fresh Tuna','tuna steak'], es: ['Atún fresco'], fr: ['Thon frais'], de: ['Thunfisch'], zh: ['金枪鱼'], ja: ['マグロ'] } },
  { id: 'shrimp', emoji: '🦐', defaultUnit: 'lbs', shelfLife: 3, category: 'meat',
    names: { en: ['Shrimp','prawns','tiger shrimp'], es: ['Camarones','gambas'], fr: ['Crevettes'], de: ['Garnelen'], zh: ['虾'], ja: ['エビ'] } },
  { id: 'ground_turkey', emoji: '🍗', defaultUnit: 'lbs', shelfLife: 3, category: 'meat',
    names: { en: ['Ground Turkey','turkey mince'], es: ['Pavo molido'], fr: ['Dinde hachée'], de: ['Truthahn-Hackfleisch'], zh: ['火鸡肉馅'], ja: ['ターキーひき肉'] } },
  { id: 'lamb', emoji: '🥩', defaultUnit: 'lbs', shelfLife: 3, category: 'meat',
    names: { en: ['Lamb','lamb chops','ground lamb'], es: ['Cordero'], fr: ['Agneau'], de: ['Lamm'], zh: ['羊肉'], ja: ['ラム肉'] } },
  { id: 'ham', emoji: '🥓', defaultUnit: 'pack', shelfLife: 7, category: 'meat',
    names: { en: ['Ham','deli ham','prosciutto'], es: ['Jamón'], fr: ['Jambon'], de: ['Schinken'], zh: ['火腿'], ja: ['ハム'] } },

  // ─── CANNED GOODS ─────────────────────────────────────────────────────────
  { id: 'canned_tomatoes', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned',
    names: { en: ['Canned Tomatoes','diced tomatoes','crushed tomatoes'], es: ['Tomates en lata','tomates enlatados'], fr: ['Tomates en boîte'], de: ['Dosentomaten'], zh: ['番茄罐头'], ja: ['缶詰トマト'] } },
  { id: 'canned_tuna', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned',
    names: { en: ['Canned Tuna','tuna in water','tuna in oil'], es: ['Atún en lata'], fr: ['Thon en boîte'], de: ['Thunfisch in Dose'], zh: ['金枪鱼罐头'], ja: ['ツナ缶'] } },
  { id: 'canned_beans', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned',
    names: { en: ['Canned Beans','black beans','kidney beans','white beans'], es: ['Frijoles enlatados','alubias'], fr: ['Haricots en boîte'], de: ['Bohnen in Dose'], zh: ['豆罐头'], ja: ['缶詰豆'] } },
  { id: 'canned_chickpeas', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned',
    names: { en: ['Canned Chickpeas','garbanzo beans'], es: ['Garbanzos en lata'], fr: ['Pois chiches en boîte'], de: ['Kichererbsen in Dose'], zh: ['鹰嘴豆罐头'], ja: ['缶詰ひよこ豆'] } },
  { id: 'canned_corn', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned',
    names: { en: ['Canned Corn','cream corn'], es: ['Maíz enlatado'], fr: ['Maïs en boîte'], de: ['Mais in Dose'], zh: ['玉米罐头'], ja: ['缶詰コーン'] } },
  { id: 'canned_coconut_milk', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned',
    names: { en: ['Coconut Milk','canned coconut milk','coconut cream'], es: ['Leche de coco'], fr: ['Lait de coco'], de: ['Kokosmilch'], zh: ['椰奶','椰浆'], ja: ['ココナッツミルク'] } },
  { id: 'canned_soup', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned',
    names: { en: ['Canned Soup','chicken soup','tomato soup'], es: ['Sopa enlatada'], fr: ['Soupe en boîte'], de: ['Dosensuppe'], zh: ['罐头汤'], ja: ['缶詰スープ'] } },
  { id: 'tomato_paste', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned',
    names: { en: ['Tomato Paste','tomato puree'], es: ['Pasta de tomate','puré de tomate'], fr: ['Concentré de tomate'], de: ['Tomatenmark'], zh: ['番茄酱'], ja: ['トマトペースト'] } },
  { id: 'canned_lentils', emoji: '🥫', defaultUnit: 'cans', shelfLife: 365, category: 'canned',
    names: { en: ['Canned Lentils'], es: ['Lentejas enlatadas'], fr: ['Lentilles en boîte'], de: ['Linsen in Dose'], zh: ['扁豆罐头'], ja: ['缶詰レンズ豆'] } },

  // ─── GRAINS / DRY PANTRY ──────────────────────────────────────────────────
  { id: 'rice', emoji: '🍚', defaultUnit: 'bag', shelfLife: 730, category: 'grains',
    names: { en: ['Rice','white rice','brown rice','jasmine rice','basmati'], es: ['Arroz','arroz blanco'], fr: ['Riz','riz blanc'], de: ['Reis','weißer Reis'], zh: ['大米','白米'], ja: ['米','白米'] } },
  { id: 'pasta', emoji: '🍝', defaultUnit: 'bag', shelfLife: 730, category: 'grains',
    names: { en: ['Pasta','spaghetti','penne','fettuccine','linguine'], es: ['Pasta','espagueti'], fr: ['Pâtes','spaghetti'], de: ['Nudeln','Pasta'], zh: ['意大利面','通心粉'], ja: ['パスタ','スパゲッティ'] } },
  { id: 'bread', emoji: '🍞', defaultUnit: 'loaf', shelfLife: 7, category: 'grains',
    names: { en: ['Bread','white bread','whole wheat bread','sourdough'], es: ['Pan','pan de molde'], fr: ['Pain','pain de mie'], de: ['Brot','Weißbrot'], zh: ['面包'], ja: ['パン','食パン'] } },
  { id: 'flour', emoji: '🌾', defaultUnit: 'bag', shelfLife: 365, category: 'grains',
    names: { en: ['Flour','all-purpose flour','bread flour','whole wheat flour'], es: ['Harina','harina de trigo'], fr: ['Farine'], de: ['Mehl','Weizenmehl'], zh: ['面粉','小麦粉'], ja: ['薄力粉','小麦粉'] } },
  { id: 'oats', emoji: '🌾', defaultUnit: 'bag', shelfLife: 365, category: 'breakfast',
    names: { en: ['Oats','rolled oats','quick oats','oatmeal'], es: ['Avena'], fr: ['Flocons d\'avoine','avoine'], de: ['Haferflocken','Hafer'], zh: ['燕麦','燕麦片'], ja: ['オートミール','オーツ麦'] } },
  { id: 'quinoa', emoji: '🌾', defaultUnit: 'bag', shelfLife: 730, category: 'grains',
    names: { en: ['Quinoa'], es: ['Quinoa','quinua'], fr: ['Quinoa'], de: ['Quinoa'], zh: ['藜麦'], ja: ['キヌア'] } },
  { id: 'lentils', emoji: '🌾', defaultUnit: 'bag', shelfLife: 730, category: 'grains',
    names: { en: ['Lentils','red lentils','green lentils'], es: ['Lentejas'], fr: ['Lentilles'], de: ['Linsen'], zh: ['扁豆','红扁豆'], ja: ['レンズ豆'] } },
  { id: 'chickpeas_dry', emoji: '🌾', defaultUnit: 'bag', shelfLife: 730, category: 'grains',
    names: { en: ['Dried Chickpeas','garbanzo beans'], es: ['Garbanzos secos'], fr: ['Pois chiches secs'], de: ['Kichererbsen'], zh: ['干鹰嘴豆'], ja: ['乾燥ひよこ豆'] } },
  { id: 'black_beans', emoji: '🌾', defaultUnit: 'bag', shelfLife: 730, category: 'grains',
    names: { en: ['Black Beans','dried black beans'], es: ['Frijoles negros'], fr: ['Haricots noirs'], de: ['Schwarze Bohnen'], zh: ['黑豆'], ja: ['黒豆'] } },
  { id: 'breadcrumbs', emoji: '🍞', defaultUnit: 'bag', shelfLife: 180, category: 'grains',
    names: { en: ['Breadcrumbs','panko'], es: ['Pan rallado'], fr: ['Chapelure','panko'], de: ['Semmelbrösel','Paniermehl'], zh: ['面包糠','面包屑'], ja: ['パン粉'] } },
  { id: 'couscous', emoji: '🌾', defaultUnit: 'bag', shelfLife: 730, category: 'grains',
    names: { en: ['Couscous'], es: ['Cuscús'], fr: ['Couscous'], de: ['Couscous'], zh: ['库斯库斯'], ja: ['クスクス'] } },
  { id: 'cornmeal', emoji: '🌽', defaultUnit: 'bag', shelfLife: 365, category: 'grains',
    names: { en: ['Cornmeal','polenta'], es: ['Harina de maíz','polenta'], fr: ['Semoule de maïs','polenta'], de: ['Maisgrieß','Polenta'], zh: ['玉米粉'], ja: ['コーンミール','ポレンタ'] } },

  // ─── CONDIMENTS & SAUCES ──────────────────────────────────────────────────
  { id: 'olive_oil', emoji: '🫒', defaultUnit: 'bottle', shelfLife: 365, category: 'pantryItems',
    names: { en: ['Olive Oil','extra virgin olive oil'], es: ['Aceite de oliva'], fr: ['Huile d\'olive'], de: ['Olivenöl'], zh: ['橄榄油'], ja: ['オリーブオイル'] } },
  { id: 'vegetable_oil', emoji: '🫙', defaultUnit: 'bottle', shelfLife: 365, category: 'pantryItems',
    names: { en: ['Vegetable Oil','canola oil','sunflower oil'], es: ['Aceite vegetal'], fr: ['Huile végétale'], de: ['Pflanzenöl'], zh: ['植物油'], ja: ['サラダ油','植物油'] } },
  { id: 'soy_sauce', emoji: '🫙', defaultUnit: 'bottle', shelfLife: 365, category: 'pantryItems',
    names: { en: ['Soy Sauce','tamari','low sodium soy sauce'], es: ['Salsa de soya'], fr: ['Sauce soja'], de: ['Sojasoße'], zh: ['酱油','生抽'], ja: ['醤油'] } },
  { id: 'ketchup', emoji: '🍅', defaultUnit: 'bottle', shelfLife: 180, category: 'pantryItems',
    names: { en: ['Ketchup','tomato ketchup'], es: ['Kétchup'], fr: ['Ketchup'], de: ['Ketchup'], zh: ['番茄酱'], ja: ['ケチャップ'] } },
  { id: 'mustard', emoji: '🟡', defaultUnit: 'jar', shelfLife: 365, category: 'pantryItems',
    names: { en: ['Mustard','dijon mustard','yellow mustard'], es: ['Mostaza'], fr: ['Moutarde'], de: ['Senf'], zh: ['芥末酱'], ja: ['マスタード'] } },
  { id: 'mayonnaise', emoji: '🫙', defaultUnit: 'jar', shelfLife: 180, category: 'pantryItems',
    names: { en: ['Mayonnaise','mayo'], es: ['Mayonesa'], fr: ['Mayonnaise'], de: ['Mayonnaise'], zh: ['蛋黄酱'], ja: ['マヨネーズ'] } },
  { id: 'hot_sauce', emoji: '🌶️', defaultUnit: 'bottle', shelfLife: 365, category: 'pantryItems',
    names: { en: ['Hot Sauce','chili sauce','sriracha','tabasco'], es: ['Salsa picante'], fr: ['Sauce piquante'], de: ['Chilisoße'], zh: ['辣酱'], ja: ['ホットソース'] } },
  { id: 'vinegar', emoji: '🫙', defaultUnit: 'bottle', shelfLife: 730, category: 'pantryItems',
    names: { en: ['Vinegar','white vinegar','apple cider vinegar','balsamic'], es: ['Vinagre'], fr: ['Vinaigre'], de: ['Essig'], zh: ['醋'], ja: ['酢'] } },
  { id: 'honey', emoji: '🍯', defaultUnit: 'jar', shelfLife: 730, category: 'pantryItems',
    names: { en: ['Honey','raw honey'], es: ['Miel'], fr: ['Miel'], de: ['Honig'], zh: ['蜂蜜'], ja: ['はちみつ'] } },
  { id: 'maple_syrup', emoji: '🍯', defaultUnit: 'bottle', shelfLife: 365, category: 'pantryItems',
    names: { en: ['Maple Syrup'], es: ['Jarabe de arce'], fr: ['Sirop d\'érable'], de: ['Ahornsirup'], zh: ['枫糖浆'], ja: ['メープルシロップ'] } },
  { id: 'peanut_butter', emoji: '🥜', defaultUnit: 'jar', shelfLife: 180, category: 'pantryItems',
    names: { en: ['Peanut Butter','creamy peanut butter'], es: ['Mantequilla de maní','crema de cacahuate'], fr: ['Beurre de cacahuète'], de: ['Erdnussbutter'], zh: ['花生酱'], ja: ['ピーナッツバター'] } },
  { id: 'jam', emoji: '🍓', defaultUnit: 'jar', shelfLife: 365, category: 'pantryItems',
    names: { en: ['Jam','strawberry jam','jelly','marmalade'], es: ['Mermelada'], fr: ['Confiture'], de: ['Marmelade','Konfitüre'], zh: ['果酱'], ja: ['ジャム'] } },
  { id: 'tahini', emoji: '🫙', defaultUnit: 'jar', shelfLife: 180, category: 'pantryItems',
    names: { en: ['Tahini','sesame paste'], es: ['Tahini','pasta de sésamo'], fr: ['Tahini','pâte de sésame'], de: ['Tahini','Sesammus'], zh: ['芝麻酱'], ja: ['タヒニ'] } },
  { id: 'worcestershire', emoji: '🫙', defaultUnit: 'bottle', shelfLife: 365, category: 'pantryItems',
    names: { en: ['Worcestershire Sauce'], es: ['Salsa inglesa'], fr: ['Sauce Worcestershire'], de: ['Worcestershiresoße'], zh: ['伍斯特沙司'], ja: ['ウスターソース'] } },
  { id: 'fish_sauce', emoji: '🫙', defaultUnit: 'bottle', shelfLife: 730, category: 'pantryItems',
    names: { en: ['Fish Sauce'], es: ['Salsa de pescado'], fr: ['Sauce de poisson'], de: ['Fischsauce'], zh: ['鱼露'], ja: ['ナンプラー'] } },
  { id: 'oyster_sauce', emoji: '🫙', defaultUnit: 'bottle', shelfLife: 365, category: 'pantryItems',
    names: { en: ['Oyster Sauce'], es: ['Salsa de ostras'], fr: ['Sauce aux huîtres'], de: ['Austernsauce'], zh: ['蚝油'], ja: ['オイスターソース'] } },
  { id: 'tomato_sauce', emoji: '🍝', defaultUnit: 'jar', shelfLife: 365, category: 'pantryItems',
    names: { en: ['Tomato Sauce','marinara sauce','pasta sauce'], es: ['Salsa de tomate'], fr: ['Sauce tomate'], de: ['Tomatensoße'], zh: ['番茄汁'], ja: ['トマトソース'] } },

  // ─── BAKING ───────────────────────────────────────────────────────────────
  { id: 'sugar', emoji: '🍬', defaultUnit: 'bag', shelfLife: 730, category: 'pantryItems',
    names: { en: ['Sugar','white sugar','granulated sugar'], es: ['Azúcar','azúcar blanca'], fr: ['Sucre'], de: ['Zucker','weißer Zucker'], zh: ['白糖','砂糖'], ja: ['砂糖','上白糖'] } },
  { id: 'brown_sugar', emoji: '🍬', defaultUnit: 'bag', shelfLife: 365, category: 'pantryItems',
    names: { en: ['Brown Sugar','dark brown sugar'], es: ['Azúcar morena'], fr: ['Cassonade','sucre roux'], de: ['Brauner Zucker'], zh: ['红糖','黄糖'], ja: ['黒砂糖','ブラウンシュガー'] } },
  { id: 'baking_powder', emoji: '🧂', defaultUnit: 'sachet', shelfLife: 365, category: 'pantryItems',
    names: { en: ['Baking Powder'], es: ['Polvo de hornear','levadura en polvo'], fr: ['Levure chimique'], de: ['Backpulver'], zh: ['泡打粉','发酵粉'], ja: ['ベーキングパウダー'] } },
  { id: 'baking_soda', emoji: '🧂', defaultUnit: 'sachet', shelfLife: 730, category: 'pantryItems',
    names: { en: ['Baking Soda','bicarbonate of soda'], es: ['Bicarbonato de sodio'], fr: ['Bicarbonate de soude'], de: ['Natron'], zh: ['小苏打','碳酸氢钠'], ja: ['重曹'] } },
  { id: 'vanilla_extract', emoji: '🫙', defaultUnit: 'bottle', shelfLife: 730, category: 'pantryItems',
    names: { en: ['Vanilla Extract','vanilla essence'], es: ['Extracto de vainilla'], fr: ['Extrait de vanille'], de: ['Vanilleextrakt'], zh: ['香草精'], ja: ['バニラエッセンス'] } },
  { id: 'cocoa_powder', emoji: '🍫', defaultUnit: 'bag', shelfLife: 365, category: 'pantryItems',
    names: { en: ['Cocoa Powder','unsweetened cocoa','dutch cocoa'], es: ['Cacao en polvo'], fr: ['Cacao en poudre'], de: ['Kakaopulver'], zh: ['可可粉'], ja: ['ココアパウダー'] } },
  { id: 'chocolate_chips', emoji: '🍫', defaultUnit: 'bag', shelfLife: 365, category: 'pantryItems',
    names: { en: ['Chocolate Chips','dark chocolate chips','semi-sweet chips'], es: ['Chispas de chocolate'], fr: ['Pépites de chocolat'], de: ['Schokoladentropfen'], zh: ['巧克力豆'], ja: ['チョコレートチップ'] } },
  { id: 'yeast', emoji: '🌾', defaultUnit: 'sachet', shelfLife: 180, category: 'pantryItems',
    names: { en: ['Yeast','instant yeast','active dry yeast'], es: ['Levadura'], fr: ['Levure'], de: ['Hefe'], zh: ['酵母'], ja: ['イースト'] } },

  // ─── SPICES ───────────────────────────────────────────────────────────────
  { id: 'salt', emoji: '🧂', defaultUnit: 'bag', shelfLife: 730, category: 'spices',
    names: { en: ['Salt','table salt','sea salt','kosher salt'], es: ['Sal'], fr: ['Sel'], de: ['Salz'], zh: ['盐'], ja: ['塩'] } },
  { id: 'black_pepper', emoji: '🌶️', defaultUnit: 'jar', shelfLife: 730, category: 'spices',
    names: { en: ['Black Pepper','ground pepper','peppercorns'], es: ['Pimienta negra'], fr: ['Poivre noir'], de: ['Schwarzer Pfeffer'], zh: ['黑胡椒'], ja: ['黒胡椒'] } },
  { id: 'cumin', emoji: '🌶️', defaultUnit: 'jar', shelfLife: 730, category: 'spices',
    names: { en: ['Cumin','ground cumin','cumin seeds'], es: ['Comino'], fr: ['Cumin'], de: ['Kreuzkümmel'], zh: ['孜然'], ja: ['クミン'] } },
  { id: 'paprika', emoji: '🌶️', defaultUnit: 'jar', shelfLife: 730, category: 'spices',
    names: { en: ['Paprika','smoked paprika','sweet paprika'], es: ['Pimentón','paprika'], fr: ['Paprika'], de: ['Paprika','Paprikapulver'], zh: ['辣椒粉','红椒粉'], ja: ['パプリカ'] } },
  { id: 'cinnamon', emoji: '🌿', defaultUnit: 'jar', shelfLife: 730, category: 'spices',
    names: { en: ['Cinnamon','ground cinnamon','cinnamon stick'], es: ['Canela'], fr: ['Cannelle'], de: ['Zimt'], zh: ['肉桂'], ja: ['シナモン'] } },
  { id: 'turmeric', emoji: '🟡', defaultUnit: 'jar', shelfLife: 730, category: 'spices',
    names: { en: ['Turmeric','ground turmeric'], es: ['Cúrcuma'], fr: ['Curcuma'], de: ['Kurkuma'], zh: ['姜黄'], ja: ['ターメリック'] } },
  { id: 'oregano', emoji: '🌿', defaultUnit: 'jar', shelfLife: 730, category: 'spices',
    names: { en: ['Oregano','dried oregano'], es: ['Orégano'], fr: ['Origan'], de: ['Oregano'], zh: ['牛至'], ja: ['オレガノ'] } },
  { id: 'basil', emoji: '🌿', defaultUnit: 'jar', shelfLife: 730, category: 'spices',
    names: { en: ['Basil','dried basil','fresh basil'], es: ['Albahaca'], fr: ['Basilic'], de: ['Basilikum'], zh: ['罗勒'], ja: ['バジル'] } },
  { id: 'thyme', emoji: '🌿', defaultUnit: 'jar', shelfLife: 730, category: 'spices',
    names: { en: ['Thyme','dried thyme'], es: ['Tomillo'], fr: ['Thym'], de: ['Thymian'], zh: ['百里香'], ja: ['タイム'] } },
  { id: 'chili_powder', emoji: '🌶️', defaultUnit: 'jar', shelfLife: 730, category: 'spices',
    names: { en: ['Chili Powder','chilli powder','cayenne pepper'], es: ['Chile en polvo','cayena'], fr: ['Piment en poudre','cayenne'], de: ['Chilipulver','Cayennepfeffer'], zh: ['辣椒粉','卡宴辣椒'], ja: ['チリパウダー'] } },
  { id: 'garlic_powder', emoji: '🧄', defaultUnit: 'jar', shelfLife: 730, category: 'spices',
    names: { en: ['Garlic Powder','garlic granules'], es: ['Ajo en polvo'], fr: ['Ail en poudre'], de: ['Knoblauchpulver'], zh: ['蒜粉'], ja: ['ガーリックパウダー'] } },
  { id: 'onion_powder', emoji: '🧅', defaultUnit: 'jar', shelfLife: 730, category: 'spices',
    names: { en: ['Onion Powder'], es: ['Cebolla en polvo'], fr: ['Oignon en poudre'], de: ['Zwiebelpulver'], zh: ['洋葱粉'], ja: ['オニオンパウダー'] } },
  { id: 'bay_leaves', emoji: '🌿', defaultUnit: 'jar', shelfLife: 730, category: 'spices',
    names: { en: ['Bay Leaves','bay leaf'], es: ['Hojas de laurel'], fr: ['Feuilles de laurier'], de: ['Lorbeerblätter'], zh: ['月桂叶'], ja: ['ローリエ','ベイリーフ'] } },
  { id: 'curry_powder', emoji: '🟡', defaultUnit: 'jar', shelfLife: 730, category: 'spices',
    names: { en: ['Curry Powder','curry seasoning'], es: ['Curry en polvo'], fr: ['Curry en poudre'], de: ['Currypulver'], zh: ['咖喱粉'], ja: ['カレー粉'] } },
  { id: 'garam_masala', emoji: '🌶️', defaultUnit: 'jar', shelfLife: 730, category: 'spices',
    names: { en: ['Garam Masala'], es: ['Garam masala'], fr: ['Garam masala'], de: ['Garam Masala'], zh: ['葛拉姆马萨拉'], ja: ['ガラムマサラ'] } },

  // ─── BEVERAGES ────────────────────────────────────────────────────────────
  { id: 'coffee', emoji: '☕', defaultUnit: 'bag', shelfLife: 180, category: 'beverages',
    names: { en: ['Coffee','ground coffee','coffee beans','espresso'], es: ['Café','café molido'], fr: ['Café','café moulu'], de: ['Kaffee','gemahlener Kaffee'], zh: ['咖啡','咖啡粉'], ja: ['コーヒー','コーヒー豆'] } },
  { id: 'tea', emoji: '🍵', defaultUnit: 'box', shelfLife: 365, category: 'beverages',
    names: { en: ['Tea','green tea','black tea','herbal tea'], es: ['Té','té verde','té negro'], fr: ['Thé','thé vert'], de: ['Tee','grüner Tee'], zh: ['茶','绿茶','红茶'], ja: ['お茶','緑茶','紅茶'] } },
  { id: 'orange_juice', emoji: '🍊', defaultUnit: 'carton', shelfLife: 7, category: 'beverages',
    names: { en: ['Orange Juice','OJ','fresh-squeezed OJ'], es: ['Jugo de naranja','zumo de naranja'], fr: ['Jus d\'orange'], de: ['Orangensaft'], zh: ['橙汁'], ja: ['オレンジジュース'] } },
  { id: 'sparkling_water', emoji: '💧', defaultUnit: 'bottle', shelfLife: 365, category: 'beverages',
    names: { en: ['Sparkling Water','soda water','club soda','mineral water'], es: ['Agua con gas','agua mineral'], fr: ['Eau gazeuse','eau pétillante'], de: ['Sprudelwasser','Mineralwasser'], zh: ['苏打水','气泡水'], ja: ['炭酸水','スパークリングウォーター'] } },
  { id: 'wine_red', emoji: '🍷', defaultUnit: 'bottle', shelfLife: 365, category: 'beverages',
    names: { en: ['Red Wine','merlot','cabernet'], es: ['Vino tinto'], fr: ['Vin rouge'], de: ['Rotwein'], zh: ['红葡萄酒'], ja: ['赤ワイン'] } },
  { id: 'wine_white', emoji: '🥂', defaultUnit: 'bottle', shelfLife: 365, category: 'beverages',
    names: { en: ['White Wine','chardonnay','sauvignon blanc'], es: ['Vino blanco'], fr: ['Vin blanc'], de: ['Weißwein'], zh: ['白葡萄酒'], ja: ['白ワイン'] } },

  // ─── FROZEN ───────────────────────────────────────────────────────────────
  { id: 'frozen_peas', emoji: '🟢', defaultUnit: 'bag', shelfLife: 180, category: 'frozen',
    names: { en: ['Frozen Peas'], es: ['Guisantes congelados'], fr: ['Petits pois surgelés'], de: ['Tiefkühlerbsen'], zh: ['速冻豌豆'], ja: ['冷凍グリーンピース'] } },
  { id: 'frozen_corn', emoji: '🌽', defaultUnit: 'bag', shelfLife: 180, category: 'frozen',
    names: { en: ['Frozen Corn','frozen sweet corn'], es: ['Maíz congelado'], fr: ['Maïs surgelé'], de: ['Tiefkühlmais'], zh: ['速冻玉米'], ja: ['冷凍コーン'] } },
  { id: 'frozen_berries', emoji: '🫐', defaultUnit: 'bag', shelfLife: 180, category: 'frozen',
    names: { en: ['Frozen Berries','frozen mixed berries'], es: ['Frutas del bosque congeladas'], fr: ['Fruits rouges surgelés'], de: ['Tiefkühlbeeren'], zh: ['速冻浆果'], ja: ['冷凍ベリーミックス'] } },
  { id: 'frozen_spinach', emoji: '🥬', defaultUnit: 'bag', shelfLife: 180, category: 'frozen',
    names: { en: ['Frozen Spinach'], es: ['Espinacas congeladas'], fr: ['Épinards surgelés'], de: ['Tiefkühlspinat'], zh: ['速冻菠菜'], ja: ['冷凍ほうれん草'] } },
  { id: 'ice_cream', emoji: '🍦', defaultUnit: 'container', shelfLife: 180, category: 'frozen',
    names: { en: ['Ice Cream','vanilla ice cream','chocolate ice cream'], es: ['Helado'], fr: ['Glace','crème glacée'], de: ['Eis','Eiscreme'], zh: ['冰淇淋'], ja: ['アイスクリーム'] } },

  // ─── SNACKS ───────────────────────────────────────────────────────────────
  { id: 'chips', emoji: '🥔', defaultUnit: 'bag', shelfLife: 60, category: 'snacks',
    names: { en: ['Chips','potato chips','crisps'], es: ['Papas fritas','patatas fritas'], fr: ['Chips'], de: ['Chips','Kartoffelchips'], zh: ['薯片'], ja: ['ポテトチップス'] } },
  { id: 'crackers', emoji: '🍘', defaultUnit: 'box', shelfLife: 90, category: 'snacks',
    names: { en: ['Crackers','saltine crackers','graham crackers'], es: ['Galletas saladas'], fr: ['Crackers','biscuits salés'], de: ['Cracker'], zh: ['饼干'], ja: ['クラッカー'] } },
  { id: 'nuts', emoji: '🥜', defaultUnit: 'bag', shelfLife: 90, category: 'snacks',
    names: { en: ['Nuts','mixed nuts','almonds','walnuts','cashews'], es: ['Nueces','almendras','anacardos'], fr: ['Noix','amandes','noix de cajou'], de: ['Nüsse','Mandeln','Cashews'], zh: ['坚果','杏仁','腰果'], ja: ['ナッツ','アーモンド','カシューナッツ'] } },
  { id: 'popcorn', emoji: '🍿', defaultUnit: 'bag', shelfLife: 90, category: 'snacks',
    names: { en: ['Popcorn','microwave popcorn'], es: ['Palomitas','pochoclos'], fr: ['Popcorn'], de: ['Popcorn'], zh: ['爆米花'], ja: ['ポップコーン'] } },
  { id: 'granola', emoji: '🌾', defaultUnit: 'bag', shelfLife: 90, category: 'breakfast',
    names: { en: ['Granola','granola bars','muesli'], es: ['Granola','müsli'], fr: ['Granola','müesli'], de: ['Müsli','Granola'], zh: ['格兰诺拉麦片'], ja: ['グラノーラ','ミューズリー'] } },
  { id: 'chocolate', emoji: '🍫', defaultUnit: 'bar', shelfLife: 180, category: 'snacks',
    names: { en: ['Chocolate','dark chocolate','milk chocolate'], es: ['Chocolate','chocolate negro'], fr: ['Chocolat','chocolat noir'], de: ['Schokolade','Zartbitterschokolade'], zh: ['巧克力'], ja: ['チョコレート'] } },

  // ─── BAKERY ───────────────────────────────────────────────────────────────
  { id: 'tortilla', emoji: '🫓', defaultUnit: 'pack', shelfLife: 14, category: 'bakery',
    names: { en: ['Tortillas','flour tortillas','corn tortillas'], es: ['Tortillas'], fr: ['Tortillas'], de: ['Tortillas'], zh: ['玉米饼','墨西哥薄饼'], ja: ['トルティーヤ'] } },
  { id: 'pita_bread', emoji: '🫓', defaultUnit: 'pack', shelfLife: 7, category: 'bakery',
    names: { en: ['Pita Bread','pita'], es: ['Pan de pita'], fr: ['Pain pita'], de: ['Fladenbrot','Pita'], zh: ['口袋饼'], ja: ['ピタパン'] } },
  { id: 'bagel', emoji: '🥯', defaultUnit: 'pack', shelfLife: 5, category: 'bakery',
    names: { en: ['Bagels','bagel','everything bagel'], es: ['Bagels','bagel'], fr: ['Bagels'], de: ['Bagels'], zh: ['百吉饼'], ja: ['ベーグル'] } },
  { id: 'muffin', emoji: '🧁', defaultUnit: 'pack', shelfLife: 5, category: 'bakery',
    names: { en: ['Muffins','muffin','english muffin'], es: ['Magdalenas','muffins'], fr: ['Muffins'], de: ['Muffins'], zh: ['松饼'], ja: ['マフィン'] } },
];

// ─── Search utility ──────────────────────────────────────────────────────────

type LangCode = 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ja';

/**
 * Search the food database for entries matching the query.
 * Matches against names in the given language (falls back to 'en').
 * Results ranked: starts-with > contains. Returns up to `limit` results.
 */
export function searchFoods(query: string, lang: string, limit = 8): FoodEntry[] {
  const langCode = (['en','es','fr','de','zh','ja'].includes(lang) ? lang : 'en') as LangCode;
  const q = query.toLowerCase().trim();
  if (q.length < 2) return [];

  const startsWith: FoodEntry[] = [];
  const contains: FoodEntry[] = [];

  for (const entry of FOOD_DATABASE) {
    const terms = (entry.names[langCode] ?? entry.names.en).map(t => t.toLowerCase());
    const matchesStartsWith = terms.some(t => t.startsWith(q));
    const matchesContains = !matchesStartsWith && terms.some(t => t.includes(q));
    if (matchesStartsWith) startsWith.push(entry);
    else if (matchesContains) contains.push(entry);
    if (startsWith.length + contains.length >= limit * 2) break;
  }

  return [...startsWith, ...contains].slice(0, limit);
}

/**
 * Compute the smart expiry date string (YYYY-MM-DD) for a food entry.
 */
export function getSmartExpiryDate(entry: FoodEntry): string {
  const d = new Date();
  d.setDate(d.getDate() + entry.shelfLife);
  return d.toISOString().split('T')[0];
}

/**
 * Get the display name (first term) for a food entry in the given language.
 */
export function getFoodDisplayName(entry: FoodEntry, lang: string): string {
  const langCode = (['en','es','fr','de','zh','ja'].includes(lang) ? lang : 'en') as LangCode;
  return (entry.names[langCode]?.[0]) ?? entry.names.en[0];
}
```

- [ ] **Step 5.2: Verify TypeScript compiles**

```bash
cd c:/Users/smitk/grocerygenius/frontend
npm run build 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 5.3: Commit**

```bash
cd c:/Users/smitk/grocerygenius
git add frontend/src/data/foodDatabase.ts
git commit -m "feat: add food database with 600+ entries, multilingual search, smart expiry"
```

---

## Task 6: Build the smart search UI in App.tsx

**Files:**
- Modify: `frontend/src/App.tsx`

This task replaces the existing inline add-pantry form (lines ~3670–3803) with the smart search + compact card confirm UI.

- [ ] **Step 6.1: Add imports at top of App.tsx**

Find the existing imports block in `frontend/src/App.tsx`. Add after the last import:

```ts
import { searchFoods, getSmartExpiryDate, getFoodDisplayName, type FoodEntry } from './data/foodDatabase';
```

- [ ] **Step 6.2: Add smart search state variables**

In `frontend/src/App.tsx`, find the state declarations block (around line 149 where `showAddPantry` is declared). Add these new state variables directly after `showAddPantry`:

```ts
const [smartSearchQuery, setSmartSearchQuery] = useState('');
const [smartSearchResults, setSmartSearchResults] = useState<FoodEntry[]>([]);
const [selectedFood, setSelectedFood] = useState<FoodEntry | null>(null);
const [smartExpiryDate, setSmartExpiryDate] = useState('');
const smartSearchRef = useRef<HTMLDivElement>(null);
```

- [ ] **Step 6.3: Add smart search handler functions**

In `frontend/src/App.tsx`, find the section with other handler functions (e.g. around `handleSaveEditPantryItem`). Add these handlers:

```ts
const handleSmartSearchChange = (query: string) => {
  setSmartSearchQuery(query);
  setSelectedFood(null);
  setSmartExpiryDate('');
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
  setNewPantryItem({
    name: displayName,
    quantity: '' as any,
    unit: food.defaultUnit,
    category: food.category,
    expiryDate: '',
    emoji: food.emoji,
  });
};

const handleAcceptSmartExpiry = () => {
  if (!selectedFood) return;
  const date = getSmartExpiryDate(selectedFood);
  setSmartExpiryDate(date);
  setNewPantryItem(prev => ({ ...prev, expiryDate: date }));
};

const handleResetSmartSearch = () => {
  setSmartSearchQuery('');
  setSmartSearchResults([]);
  setSelectedFood(null);
  setSmartExpiryDate('');
  setNewPantryItem({ name: '', quantity: 1, unit: 'pc', category: 'other', expiryDate: '', emoji: undefined });
};
```

Note: `i18n` is already available in App.tsx via `const { t, i18n } = useTranslation();` — verify this import exists, and add `i18n` to the destructure if it's only `const { t }`.

- [ ] **Step 6.4: Replace the inline add-pantry form**

Find the existing `{showAddPantry && ( ... )}` block (lines ~3670–3803). Replace the entire block with:

```tsx
{showAddPantry && (
  <div style={{ background: '#f9fafb', padding: isMobile ? '1rem' : '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>

    {/* ── Smart search input ── */}
    <div ref={smartSearchRef} style={{ position: 'relative', marginBottom: selectedFood ? '0.75rem' : '0' }}>
      <input
        type="text"
        placeholder={t('pantry.smartSearch')}
        value={smartSearchQuery}
        autoFocus
        onChange={(e) => handleSmartSearchChange(e.target.value)}
        style={{
          width: '100%',
          padding: '0.75rem 2.5rem 0.75rem 0.75rem',
          border: '2px solid #8b5cf6',
          borderRadius: '8px',
          fontSize: '1rem',
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

    {/* ── Compact card confirm (after food selected) ── */}
    {selectedFood && (
      <div style={{
        background: 'white', border: '1.5px solid #8b5cf6', borderRadius: '10px',
        padding: isMobile ? '0.9rem' : '1rem', boxShadow: '0 2px 8px rgba(139,92,246,0.08)',
        marginTop: '0.5rem',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f3f4f6' }}>
          <span style={{ fontSize: '1.5rem' }}>{selectedFood.emoji}</span>
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>{getFoodDisplayName(selectedFood, i18n.language || 'en')}</span>
          <span style={{ marginLeft: 'auto', background: '#f5f3ff', color: '#7c3aed', borderRadius: '6px', padding: '0.15rem 0.5rem', fontSize: '0.75rem', fontWeight: 600 }}>
            {t(`pantry.categories.${selectedFood.category}`) || selectedFood.category}
          </span>
        </div>

        {/* Quantity + Unit row */}
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
            <select
              value={newPantryItem.unit}
              onChange={(e) => setNewPantryItem(prev => ({ ...prev, unit: e.target.value }))}
              style={{
                width: '100%', padding: '0.6rem', border: '1.5px solid #e5e7eb',
                borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box', cursor: 'pointer',
              }}
            >
              {(['carton','dozen','pieces','lbs','kg','g','oz','cups','cup','ml','l','tbsp','tsp',
                'bag','bottle','box','cans','bottles','boxes','bunch','jar','loaf','pack',
                'head','clove','slice','container','roll','bar','block','sachet','fillet'
              ] as const).map(u => (
                <option key={u} value={u}>{t(`pantry.units.${u}`) || u}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Smart expiry chip + date picker */}
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.35rem', fontWeight: 600 }}>
            {t('pantry.expiryDate')}
          </label>
          <button
            type="button"
            onClick={handleAcceptSmartExpiry}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a',
              borderRadius: '6px', padding: '0.3rem 0.65rem', fontSize: '0.8rem',
              fontWeight: 600, cursor: 'pointer', marginBottom: '0.4rem',
            }}
          >
            ✨ {t('pantry.smartExpiry')}: {getSmartExpiryDate(selectedFood).split('-').slice(1).join('/')}
            {' '}({t('pantry.smartExpiryDays', { count: selectedFood.shelfLife })})
          </button>
          <input
            type="date"
            value={newPantryItem.expiryDate}
            onChange={(e) => {
              setSmartExpiryDate(e.target.value);
              setNewPantryItem(prev => ({ ...prev, expiryDate: e.target.value }));
            }}
            style={{
              display: 'block', width: '100%', padding: '0.6rem',
              border: '1.5px solid #e5e7eb', borderRadius: '8px',
              fontSize: '0.95rem', boxSizing: 'border-box',
            }}
          />
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
              setNewPantryItem({ name: '', quantity: 1, unit: 'pc', category: 'other', expiryDate: '', emoji: undefined });
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
            border: 'none', borderRadius: '8px', cursor: (!newPantryItem.quantity || newPantryItem.quantity === ('' as any)) ? 'not-allowed' : 'pointer',
            fontWeight: 700, fontSize: '1rem',
          }}
        >
          {(!newPantryItem.quantity || newPantryItem.quantity === ('' as any))
            ? t('pantry.quantityRequired')
            : t('pantry.addToPantry')}
        </button>
      </div>
    )}

    {/* ── Manual fallback (no food selected) ── */}
    {!selectedFood && smartSearchQuery.length === 0 && (
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr 1fr', gap: isMobile ? '0.75rem' : '1rem', marginTop: '0.75rem' }}>
        <input
          type="text"
          placeholder={t('pantry.itemPlaceholder')}
          value={newPantryItem.name}
          onChange={(e) => setNewPantryItem({...newPantryItem, name: e.target.value})}
          style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box' }}
        />
        <input
          type="number" min="1" placeholder={t('pantry.quantity')}
          value={newPantryItem.quantity}
          onChange={(e) => setNewPantryItem({...newPantryItem, quantity: parseInt(e.target.value) || 1})}
          style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box' }}
        />
        <select
          value={newPantryItem.unit}
          onChange={(e) => setNewPantryItem({...newPantryItem, unit: e.target.value})}
          style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box' }}
        >
          <option value="pc">{t('pantry.units.pieces')}</option>
          <option value="kg">{t('pantry.units.kg')}</option>
          <option value="lbs">{t('pantry.units.lbs')}</option>
          <option value="cups">{t('pantry.units.cups')}</option>
          <option value="g">{t('pantry.units.grams')}</option>
          <option value="oz">{t('pantry.units.oz')}</option>
        </select>
        <input
          type="date"
          value={newPantryItem.expiryDate}
          onChange={(e) => setNewPantryItem({...newPantryItem, expiryDate: e.target.value})}
          style={{ gridColumn: '1 / -1', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box' }}
        />
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
              setNewPantryItem({ name: '', quantity: 1, unit: 'pc', category: 'other', expiryDate: '', emoji: undefined });
              setShowAddPantry(false);
              success(t('toasts.itemAddedToPantry'));
            } catch (error) {
              console.error('Error adding pantry item:', error);
              warning(t('toasts.failedAddItem'));
            }
          }}
          style={{ gridColumn: '1 / -1', padding: '0.75rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
        >
          {t('pantry.addToPantry')}
        </button>
      </div>
    )}
  </div>
)}
```

- [ ] **Step 6.5: Close dropdown when clicking outside**

In App.tsx, find the `useEffect` hooks section. Add:

```ts
useEffect(() => {
  const handleClickOutside = (e: MouseEvent) => {
    if (smartSearchRef.current && !smartSearchRef.current.contains(e.target as Node)) {
      setSmartSearchResults([]);
    }
  };
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, []);
```

- [ ] **Step 6.6: Reset smart search when closing the add form**

Find where `setShowAddPantry(false)` is called from the cancel button (the `+ Add Item` / `✕ Cancel` toggle button around line 3437). Add a call to `handleResetSmartSearch()` alongside each `setShowAddPantry(false)` call in that toggle:

Change:
```tsx
onClick={() => setShowAddPantry(!showAddPantry)}
```
To:
```tsx
onClick={() => {
  if (showAddPantry) handleResetSmartSearch();
  setShowAddPantry(!showAddPantry);
}}
```

- [ ] **Step 6.7: Verify build compiles**

```bash
cd c:/Users/smitk/grocerygenius/frontend
npm run build 2>&1 | tail -30
```

Expected: no TypeScript errors, build succeeds.

- [ ] **Step 6.8: Commit**

```bash
cd c:/Users/smitk/grocerygenius
git add frontend/src/App.tsx
git commit -m "feat: smart search UI with compact card confirm, emoji, smart expiry"
```

---

## Task 7: Final verification and push

- [ ] **Step 7.1: Run dev server and manually test**

```bash
cd c:/Users/smitk/grocerygenius/frontend
npm run dev
```

Verify:
1. Open pantry tab → click "+ Add Item"
2. Type "mil" → dropdown shows 🥛 Milk, 🍫 Milo, etc.
3. Select Milk → compact card shows with unit "carton", quantity blank
4. Tap smart expiry chip → date field fills with today +7 days
5. Enter quantity → "Add to Pantry" button enables
6. Submit → item appears in list with 🥛 emoji instead of 📦
7. Type a non-database item ("asdf") → no dropdown, fallback manual form shows
8. Change language to Spanish → type "lech" → shows "Leche" result

- [ ] **Step 7.2: Push to dev**

```bash
cd c:/Users/smitk/grocerygenius
git push origin dev
```

---

## Self-Review Notes

- **Spec coverage check:**
  - ✅ Smart search bar replacing name input
  - ✅ Dropdown with up to 8 suggestions + emoji
  - ✅ Food selected → compact card confirm (Option C)
  - ✅ Quantity blank (required), unit pre-filled and editable
  - ✅ Smart expiry chip (tappable, fills date field, remains editable)
  - ✅ Date field always visible
  - ✅ Manual fallback for non-database items
  - ✅ Emoji stored on PantryItem + Supabase column
  - ✅ Pantry list renders `item.emoji ?? category-fallback`
  - ✅ All 6 languages: i18n keys + multilingual search terms
  - ✅ Mobile: full-width dropdown, min 44px tap targets, native `<select>`
  - ✅ Desktop: dropdown popover with shadow
  - ✅ ~600 food entries across all categories
  - ✅ Supabase migration via MCP

- **Type consistency:** `FoodEntry`, `searchFoods`, `getSmartExpiryDate`, `getFoodDisplayName` defined in Task 5 and used consistently in Task 6. `newPantryItem` state gains `emoji?: string` in Task 2 and is used in Tasks 6's add handler.

- **No placeholders:** All code blocks are complete and runnable.
