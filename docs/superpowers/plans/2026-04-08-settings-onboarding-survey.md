# Settings Panel & Onboarding Survey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a personalized onboarding survey for new users and a persistent settings side panel for all users, backed by extended profile data including physical stats, calorie auto-calculation, cooking level, and AI-labeled custom dietary preferences.

**Architecture:** Two new React components (`OnboardingSurvey`, `SettingsPanel`) are wired into `App.tsx` alongside a new FastAPI router (`profile.py`) for dietary label generation and account deletion. Profile state is loaded once on auth and passed down as props. The dietary filter dropdown in the recipe generator is extended to include the user's custom dietary labels.

**Tech Stack:** React + TypeScript, Supabase (auth + DB), FastAPI (Python), OpenAI gpt-4o-mini, react-i18next (6 locales)

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `backend/app/routers/profile.py` | `POST /profile/dietary-label`, `DELETE /profile` |
| Modify | `backend/app/main.py` | Register profile router |
| Modify | `frontend/src/lib/supabase.ts` | Extend `Profile` type, add `profileService` |
| Modify | `frontend/src/locales/en/translation.json` | Add `survey.*`, `settings.*` keys |
| Modify | `frontend/src/locales/es/translation.json` | Same |
| Modify | `frontend/src/locales/fr/translation.json` | Same |
| Modify | `frontend/src/locales/de/translation.json` | Same |
| Modify | `frontend/src/locales/ja/translation.json` | Same |
| Modify | `frontend/src/locales/zh/translation.json` | Same |
| Create | `frontend/src/components/OnboardingSurvey.tsx` | 4-step onboarding wizard modal |
| Create | `frontend/src/components/SettingsPanel.tsx` | Right-drawer (desktop) / bottom-sheet (mobile) |
| Modify | `frontend/src/App.tsx` | Wire survey + settings state, gear button, profile load, dietary defaults |

---

## Task 1: Supabase DB Migration

**Files:**
- Create: `supabase/migrations/20260408_profile_extensions.sql`

- [ ] **Step 1: Write the migration SQL**

Create `supabase/migrations/20260408_profile_extensions.sql`:

```sql
-- Extend profiles table with personalization fields
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS cooking_level        text,
  ADD COLUMN IF NOT EXISTS age                  integer,
  ADD COLUMN IF NOT EXISTS weight_kg            numeric(5,2),
  ADD COLUMN IF NOT EXISTS height_cm            integer,
  ADD COLUMN IF NOT EXISTS biological_sex       text,
  ADD COLUMN IF NOT EXISTS activity_level       text DEFAULT 'moderate',
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS custom_dietary_labels jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Add check constraints
ALTER TABLE profiles
  ADD CONSTRAINT profiles_cooking_level_check
    CHECK (cooking_level IN ('beginner','home_cook','intermediate','advanced') OR cooking_level IS NULL),
  ADD CONSTRAINT profiles_biological_sex_check
    CHECK (biological_sex IN ('male','female') OR biological_sex IS NULL),
  ADD CONSTRAINT profiles_activity_level_check
    CHECK (activity_level IN ('sedentary','light','moderate','active','very_active') OR activity_level IS NULL);
```

- [ ] **Step 2: Apply the migration in the Supabase dashboard**

Go to your Supabase project → SQL Editor → paste and run the migration above.

Expected: "Success. No rows returned."

- [ ] **Step 3: Verify columns exist**

In Supabase SQL Editor run:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;
```
Expected: rows for `cooking_level`, `age`, `weight_kg`, `height_cm`, `biological_sex`, `activity_level`, `onboarding_completed`, `custom_dietary_labels` are present.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260408_profile_extensions.sql
git commit -m "chore: add profile extension migration for onboarding survey fields"
```

---

## Task 2: Backend — Profile Router

**Files:**
- Create: `backend/app/routers/profile.py`
- Test: `backend/test_profile.py`

- [ ] **Step 1: Write the failing test**

Create `backend/test_profile.py`:

```python
import pytest
import json
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient

# We test the dietary-label endpoint logic in isolation by mocking call_chat_completion
# and the delete endpoint by mocking supabase admin calls.

def test_dietary_label_returns_label_and_description(monkeypatch):
    """POST /profile/dietary-label returns {label, description} from OpenAI."""
    from app.routers.profile import router
    from fastapi import FastAPI
    app = FastAPI()
    app.include_router(router, prefix="/profile")
    client = TestClient(app)

    mock_response = json.dumps({"label": "Mediterranean (No Shellfish)", "description": "A Mediterranean diet excluding shellfish."})

    with patch("app.routers.profile.call_chat_completion", new_callable=AsyncMock, return_value=mock_response):
        response = client.post("/profile/dietary-label", json={"text": "Mediterranean diet with no shellfish"})

    assert response.status_code == 200
    data = response.json()
    assert data["label"] == "Mediterranean (No Shellfish)"
    assert "shellfish" in data["description"].lower()


def test_dietary_label_fallback_on_openai_failure(monkeypatch):
    """POST /profile/dietary-label falls back gracefully if OpenAI call raises."""
    from app.routers.profile import router
    from fastapi import FastAPI
    app = FastAPI()
    app.include_router(router, prefix="/profile")
    client = TestClient(app)

    with patch("app.routers.profile.call_chat_completion", new_callable=AsyncMock, side_effect=Exception("OpenAI down")):
        response = client.post("/profile/dietary-label", json={"text": "My very long custom diet name that exceeds thirty characters easily"})

    assert response.status_code == 200
    data = response.json()
    assert len(data["label"]) <= 33  # truncated to 30 chars + "..."
    assert data["description"] == ""
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && python -m pytest test_profile.py -v
```
Expected: `ERROR` — `app.routers.profile` does not exist yet.

- [ ] **Step 3: Create the profile router**

Create `backend/app/routers/profile.py`:

```python
import json
import os
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from app.services.openai_client import call_chat_completion

router = APIRouter()

DIETARY_LABEL_SYSTEM_PROMPT = (
    "You are a dietary preference labeler for a recipe app. "
    "Given a user's free-text dietary preference, return a JSON object with two fields: "
    "`label` (2–4 words, title case, suitable as a dropdown option) and "
    "`description` (one sentence, used as a tooltip/filter hint in a recipe generator). "
    "Return only valid JSON, no markdown."
)


class DietaryLabelRequest(BaseModel):
    text: str


class DietaryLabelResponse(BaseModel):
    label: str
    description: str


@router.post("/dietary-label", response_model=DietaryLabelResponse)
async def generate_dietary_label(payload: DietaryLabelRequest):
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=422, detail="text must not be empty")

    try:
        raw = await call_chat_completion(
            system_prompt=DIETARY_LABEL_SYSTEM_PROMPT,
            user_prompt=text,
            max_tokens=120,
            temperature=0.3,
        )
        data = json.loads(raw)
        return DietaryLabelResponse(
            label=str(data.get("label", text[:30])),
            description=str(data.get("description", "")),
        )
    except Exception:
        # Graceful fallback: use truncated input as label, no description
        truncated = text[:30] + ("..." if len(text) > 30 else "")
        return DietaryLabelResponse(label=truncated, description="")


class DeleteAccountRequest(BaseModel):
    user_id: str


@router.delete("/account")
async def delete_account(payload: DeleteAccountRequest):
    """
    Delete all user data from all tables, then delete the Supabase auth user.
    Requires SUPABASE_SERVICE_ROLE_KEY env var (not the anon key).
    Called from the frontend after the user confirms deletion.
    The frontend signs out immediately after this returns 200.
    """
    from supabase import create_client
    url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not service_key:
        raise HTTPException(status_code=500, detail="Supabase service credentials not configured")

    sb = create_client(url, service_key)
    user_id = payload.user_id

    # Delete all user rows (order matters for FK constraints)
    tables = ["calorie_log", "meal_plans", "shopping_items", "pantry_items", "saved_recipes", "profiles"]
    for table in tables:
        sb.table(table).delete().eq("user_id", user_id).execute()

    # Delete auth user
    sb.auth.admin.delete_user(user_id)

    return {"deleted": True}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && python -m pytest test_profile.py -v
```
Expected:
```
test_profile.py::test_dietary_label_returns_label_and_description PASSED
test_profile.py::test_dietary_label_fallback_on_openai_failure PASSED
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/profile.py backend/test_profile.py
git commit -m "feat: add profile router with dietary-label and delete-account endpoints"
```

---

## Task 3: Register Profile Router

**Files:**
- Modify: `backend/app/main.py`

- [ ] **Step 1: Add the import and router registration**

In `backend/app/main.py`, add after the existing router imports:

```python
from app.routers import profile as profile_router
```

And after the existing `app.include_router(donation.router, ...)` line:

```python
app.include_router(profile_router.router, prefix="/profile", tags=["profile"])
```

- [ ] **Step 2: Verify the server starts and the endpoint is visible**

```bash
cd backend && uvicorn app.main:app --reload --port 8000
```

Navigate to `http://localhost:8000/docs` — confirm `POST /profile/dietary-label` and `DELETE /profile/account` appear under the `profile` tag.

- [ ] **Step 3: Commit**

```bash
git add backend/app/main.py
git commit -m "feat: register profile router in FastAPI app"
```

---

## Task 4: Extend Profile Type and Add profileService

**Files:**
- Modify: `frontend/src/lib/supabase.ts`

- [ ] **Step 1: Extend the `Profile` interface**

In `frontend/src/lib/supabase.ts`, replace the existing `Profile` interface:

```typescript
export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  daily_calorie_goal: number;
  dietary_preferences?: string[];
  // New personalization fields
  cooking_level?: 'beginner' | 'home_cook' | 'intermediate' | 'advanced';
  age?: number;
  weight_kg?: number;
  height_cm?: number;
  biological_sex?: 'male' | 'female';
  activity_level?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  onboarding_completed: boolean;
  custom_dietary_labels: CustomDietaryLabel[];
  created_at: string;
  updated_at: string;
}

export interface CustomDietaryLabel {
  id: string;       // uuid generated client-side
  label: string;    // e.g. "Mediterranean (No Shellfish)"
  description: string;
}
```

- [ ] **Step 2: Add `profileService` at the bottom of `supabase.ts`**

Append after the existing `setupAuthListener` export:

```typescript
// ============================================
// PROFILE SERVICE
// ============================================

export const profileService = {
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data as Profile;
  },

  async upsertProfile(userId: string, updates: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>): Promise<{ error: any }> {
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: userId, ...updates }, { onConflict: 'id' });
    return { error };
  },
};
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors related to `supabase.ts`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/supabase.ts
git commit -m "feat: extend Profile type and add profileService for personalization fields"
```

---

## Task 5: i18n Keys — All 6 Locales

**Files:**
- Modify: `frontend/src/locales/en/translation.json`
- Modify: `frontend/src/locales/es/translation.json`
- Modify: `frontend/src/locales/fr/translation.json`
- Modify: `frontend/src/locales/de/translation.json`
- Modify: `frontend/src/locales/ja/translation.json`
- Modify: `frontend/src/locales/zh/translation.json`

- [ ] **Step 1: Add keys to English locale**

In `frontend/src/locales/en/translation.json`, add these top-level keys before the closing `}`:

```json
"survey": {
  "title": "Personalize GroceryGenius",
  "subtitle": "Takes about 60 seconds. Helps us tailor recipes and calorie goals just for you.",
  "letsGo": "Let's Go →",
  "skipForNow": "Skip for now",
  "back": "← Back",
  "skipStep": "Skip this step",
  "next": "Next →",
  "finish": "Finish ✓",
  "stepOf": "{{step}} of {{total}}",
  "step1Title": "What's your preferred language?",
  "step2Title": "Tell us about yourself",
  "step3Title": "How comfortable are you in the kitchen?",
  "step4Title": "Any dietary preferences?",
  "recommendedCalories": "Recommended: {{calories}} cal/day",
  "tapToOverride": "(tap to override)",
  "aiWillGenerate": "✨ AI will generate a label for custom diets",
  "customDietPlaceholder": "Or type your own: e.g. Mediterranean...",
  "cookingLevels": {
    "beginner": "🌱 Beginner — I keep it simple",
    "home_cook": "🏠 Home Cook — I follow recipes",
    "intermediate": "🔪 Intermediate — I improvise",
    "advanced": "⭐ Advanced — I love to experiment"
  },
  "activityLevels": {
    "sedentary": "Sedentary (little or no exercise)",
    "light": "Light (1–3 days/week)",
    "moderate": "Moderate (3–5 days/week)",
    "active": "Active (6–7 days/week)",
    "very_active": "Very Active (hard exercise daily)"
  },
  "dietaryPresets": {
    "vegetarian": "Vegetarian",
    "vegan": "Vegan",
    "gluten-free": "Gluten-Free",
    "dairy-free": "Dairy-Free",
    "halal": "Halal",
    "kosher": "Kosher",
    "keto": "Keto",
    "low-carb": "Low-Carb",
    "nut-free": "Nut-Free",
    "paleo": "Paleo"
  },
  "fields": {
    "age": "Age",
    "sex": "Biological Sex",
    "male": "Male",
    "female": "Female",
    "weight": "Weight",
    "height": "Height",
    "activityLevel": "Activity Level",
    "dailyCalorieGoal": "Daily Calorie Goal",
    "lbs": "lbs",
    "kg": "kg",
    "ftIn": "ft/in",
    "cm": "cm"
  }
},
"settings": {
  "title": "Settings",
  "saveChanges": "Save Changes",
  "saved": "Settings saved",
  "sections": {
    "profile": "Profile",
    "physical": "Physical Info",
    "dietary": "Dietary Preferences",
    "security": "Security",
    "danger": "Danger Zone"
  },
  "cookingLevel": "Cooking Level",
  "recommendedCalories": "✨ Recommended: {{calories}} cal/day",
  "dailyCalorieGoal": "Daily Calorie Goal",
  "addCustomDiet": "+ Add custom diet",
  "customDietPlaceholder": "Type a custom diet...",
  "changePassword": "🔑 Change Password",
  "newPassword": "New Password",
  "confirmPassword": "Confirm Password",
  "passwordMismatch": "Passwords do not match",
  "passwordChanged": "Password changed successfully",
  "deleteAccount": "🗑️ Delete Account",
  "deleteConfirmTitle": "Delete Your Account?",
  "deleteConfirmBody": "This will permanently delete all your data including pantry, recipes, meal plans, and shopping lists. This cannot be undone.",
  "deleteTypeConfirm": "Type DELETE to confirm",
  "deleteConfirmPlaceholder": "DELETE",
  "deleteConfirmButton": "Permanently Delete Account",
  "deleteCancel": "Cancel",
  "aiGeneratingLabel": "Generating label..."
}
```

- [ ] **Step 2: Add keys to Spanish locale (`es/translation.json`)**

Add these top-level keys:

```json
"survey": {
  "title": "Personaliza GroceryGenius",
  "subtitle": "Tarda unos 60 segundos. Te ayuda a personalizar recetas y objetivos calóricos.",
  "letsGo": "Empezar →",
  "skipForNow": "Saltar por ahora",
  "back": "← Atrás",
  "skipStep": "Saltar este paso",
  "next": "Siguiente →",
  "finish": "Finalizar ✓",
  "stepOf": "{{step}} de {{total}}",
  "step1Title": "¿Cuál es tu idioma preferido?",
  "step2Title": "Cuéntanos sobre ti",
  "step3Title": "¿Qué tan cómodo estás en la cocina?",
  "step4Title": "¿Tienes preferencias dietéticas?",
  "recommendedCalories": "Recomendado: {{calories}} cal/día",
  "tapToOverride": "(toca para editar)",
  "aiWillGenerate": "✨ La IA generará una etiqueta para dietas personalizadas",
  "customDietPlaceholder": "O escribe la tuya: p. ej. Mediterránea...",
  "cookingLevels": {
    "beginner": "🌱 Principiante — Lo mantengo simple",
    "home_cook": "🏠 Cocinero casero — Sigo recetas",
    "intermediate": "🔪 Intermedio — Improviso",
    "advanced": "⭐ Avanzado — Me encanta experimentar"
  },
  "activityLevels": {
    "sedentary": "Sedentario (poco o nada de ejercicio)",
    "light": "Ligero (1–3 días/semana)",
    "moderate": "Moderado (3–5 días/semana)",
    "active": "Activo (6–7 días/semana)",
    "very_active": "Muy activo (ejercicio intenso diario)"
  },
  "dietaryPresets": {
    "vegetarian": "Vegetariano",
    "vegan": "Vegano",
    "gluten-free": "Sin Gluten",
    "dairy-free": "Sin Lácteos",
    "halal": "Halal",
    "kosher": "Kosher",
    "keto": "Keto",
    "low-carb": "Bajo en Carbohidratos",
    "nut-free": "Sin Frutos Secos",
    "paleo": "Paleo"
  },
  "fields": {
    "age": "Edad",
    "sex": "Sexo Biológico",
    "male": "Masculino",
    "female": "Femenino",
    "weight": "Peso",
    "height": "Altura",
    "activityLevel": "Nivel de Actividad",
    "dailyCalorieGoal": "Objetivo Calórico Diario",
    "lbs": "lbs",
    "kg": "kg",
    "ftIn": "ft/in",
    "cm": "cm"
  }
},
"settings": {
  "title": "Configuración",
  "saveChanges": "Guardar Cambios",
  "saved": "Configuración guardada",
  "sections": {
    "profile": "Perfil",
    "physical": "Información Física",
    "dietary": "Preferencias Dietéticas",
    "security": "Seguridad",
    "danger": "Zona Peligrosa"
  },
  "cookingLevel": "Nivel de Cocina",
  "recommendedCalories": "✨ Recomendado: {{calories}} cal/día",
  "dailyCalorieGoal": "Objetivo Calórico Diario",
  "addCustomDiet": "+ Agregar dieta personalizada",
  "customDietPlaceholder": "Escribe una dieta personalizada...",
  "changePassword": "🔑 Cambiar Contraseña",
  "newPassword": "Nueva Contraseña",
  "confirmPassword": "Confirmar Contraseña",
  "passwordMismatch": "Las contraseñas no coinciden",
  "passwordChanged": "Contraseña cambiada con éxito",
  "deleteAccount": "🗑️ Eliminar Cuenta",
  "deleteConfirmTitle": "¿Eliminar tu cuenta?",
  "deleteConfirmBody": "Esto eliminará permanentemente todos tus datos incluyendo despensa, recetas, plan de comidas y listas de compras. Esta acción no se puede deshacer.",
  "deleteTypeConfirm": "Escribe DELETE para confirmar",
  "deleteConfirmPlaceholder": "DELETE",
  "deleteConfirmButton": "Eliminar Cuenta Permanentemente",
  "deleteCancel": "Cancelar",
  "aiGeneratingLabel": "Generando etiqueta..."
}
```

- [ ] **Step 3: Add keys to French locale (`fr/translation.json`)**

```json
"survey": {
  "title": "Personnalisez GroceryGenius",
  "subtitle": "Prend environ 60 secondes. Nous aide à adapter les recettes et les objectifs caloriques pour vous.",
  "letsGo": "C'est parti →",
  "skipForNow": "Passer pour l'instant",
  "back": "← Retour",
  "skipStep": "Passer cette étape",
  "next": "Suivant →",
  "finish": "Terminer ✓",
  "stepOf": "{{step}} sur {{total}}",
  "step1Title": "Quelle est votre langue préférée ?",
  "step2Title": "Parlez-nous de vous",
  "step3Title": "À quel point êtes-vous à l'aise en cuisine ?",
  "step4Title": "Avez-vous des préférences alimentaires ?",
  "recommendedCalories": "Recommandé : {{calories}} cal/jour",
  "tapToOverride": "(appuyer pour modifier)",
  "aiWillGenerate": "✨ L'IA générera une étiquette pour les régimes personnalisés",
  "customDietPlaceholder": "Ou tapez le vôtre : ex. Méditerranéen...",
  "cookingLevels": {
    "beginner": "🌱 Débutant — Je fais simple",
    "home_cook": "🏠 Cuisinier maison — Je suis les recettes",
    "intermediate": "🔪 Intermédiaire — J'improvise",
    "advanced": "⭐ Avancé — J'adore expérimenter"
  },
  "activityLevels": {
    "sedentary": "Sédentaire (peu ou pas d'exercice)",
    "light": "Léger (1–3 jours/semaine)",
    "moderate": "Modéré (3–5 jours/semaine)",
    "active": "Actif (6–7 jours/semaine)",
    "very_active": "Très actif (exercice intense quotidien)"
  },
  "dietaryPresets": {
    "vegetarian": "Végétarien",
    "vegan": "Végétalien",
    "gluten-free": "Sans Gluten",
    "dairy-free": "Sans Produits Laitiers",
    "halal": "Halal",
    "kosher": "Casher",
    "keto": "Keto",
    "low-carb": "Faible en Glucides",
    "nut-free": "Sans Noix",
    "paleo": "Paléo"
  },
  "fields": {
    "age": "Âge",
    "sex": "Sexe Biologique",
    "male": "Masculin",
    "female": "Féminin",
    "weight": "Poids",
    "height": "Taille",
    "activityLevel": "Niveau d'Activité",
    "dailyCalorieGoal": "Objectif Calorique Quotidien",
    "lbs": "lbs",
    "kg": "kg",
    "ftIn": "pi/po",
    "cm": "cm"
  }
},
"settings": {
  "title": "Paramètres",
  "saveChanges": "Enregistrer",
  "saved": "Paramètres sauvegardés",
  "sections": {
    "profile": "Profil",
    "physical": "Informations Physiques",
    "dietary": "Préférences Alimentaires",
    "security": "Sécurité",
    "danger": "Zone Dangereuse"
  },
  "cookingLevel": "Niveau de Cuisine",
  "recommendedCalories": "✨ Recommandé : {{calories}} cal/jour",
  "dailyCalorieGoal": "Objectif Calorique Quotidien",
  "addCustomDiet": "+ Ajouter un régime personnalisé",
  "customDietPlaceholder": "Saisir un régime personnalisé...",
  "changePassword": "🔑 Changer le Mot de Passe",
  "newPassword": "Nouveau Mot de Passe",
  "confirmPassword": "Confirmer le Mot de Passe",
  "passwordMismatch": "Les mots de passe ne correspondent pas",
  "passwordChanged": "Mot de passe changé avec succès",
  "deleteAccount": "🗑️ Supprimer le Compte",
  "deleteConfirmTitle": "Supprimer votre compte ?",
  "deleteConfirmBody": "Cela supprimera définitivement toutes vos données. Cette action est irréversible.",
  "deleteTypeConfirm": "Tapez DELETE pour confirmer",
  "deleteConfirmPlaceholder": "DELETE",
  "deleteConfirmButton": "Supprimer le Compte Définitivement",
  "deleteCancel": "Annuler",
  "aiGeneratingLabel": "Génération de l'étiquette..."
}
```

- [ ] **Step 4: Add keys to German locale (`de/translation.json`)**

```json
"survey": {
  "title": "GroceryGenius personalisieren",
  "subtitle": "Dauert ca. 60 Sekunden. Hilft uns, Rezepte und Kalorienziele auf Sie anzupassen.",
  "letsGo": "Los geht's →",
  "skipForNow": "Jetzt überspringen",
  "back": "← Zurück",
  "skipStep": "Schritt überspringen",
  "next": "Weiter →",
  "finish": "Fertig ✓",
  "stepOf": "{{step}} von {{total}}",
  "step1Title": "Was ist Ihre bevorzugte Sprache?",
  "step2Title": "Erzählen Sie uns von sich",
  "step3Title": "Wie sicher sind Sie in der Küche?",
  "step4Title": "Haben Sie Ernährungspräferenzen?",
  "recommendedCalories": "Empfohlen: {{calories}} kcal/Tag",
  "tapToOverride": "(tippen zum Bearbeiten)",
  "aiWillGenerate": "✨ KI erstellt ein Label für individuelle Diäten",
  "customDietPlaceholder": "Oder eigene eingeben: z.B. Mediterran...",
  "cookingLevels": {
    "beginner": "🌱 Anfänger — Ich halte es einfach",
    "home_cook": "🏠 Hobbykoch — Ich folge Rezepten",
    "intermediate": "🔪 Fortgeschritten — Ich improvisiere",
    "advanced": "⭐ Profi — Ich experimentiere gerne"
  },
  "activityLevels": {
    "sedentary": "Sitzend (wenig oder kein Sport)",
    "light": "Leicht (1–3 Tage/Woche)",
    "moderate": "Mäßig (3–5 Tage/Woche)",
    "active": "Aktiv (6–7 Tage/Woche)",
    "very_active": "Sehr aktiv (tägliches intensives Training)"
  },
  "dietaryPresets": {
    "vegetarian": "Vegetarisch",
    "vegan": "Vegan",
    "gluten-free": "Glutenfrei",
    "dairy-free": "Laktosefrei",
    "halal": "Halal",
    "kosher": "Koscher",
    "keto": "Keto",
    "low-carb": "Low-Carb",
    "nut-free": "Nussfrei",
    "paleo": "Paleo"
  },
  "fields": {
    "age": "Alter",
    "sex": "Biologisches Geschlecht",
    "male": "Männlich",
    "female": "Weiblich",
    "weight": "Gewicht",
    "height": "Größe",
    "activityLevel": "Aktivitätslevel",
    "dailyCalorieGoal": "Tägliches Kalorienziel",
    "lbs": "lbs",
    "kg": "kg",
    "ftIn": "ft/in",
    "cm": "cm"
  }
},
"settings": {
  "title": "Einstellungen",
  "saveChanges": "Speichern",
  "saved": "Einstellungen gespeichert",
  "sections": {
    "profile": "Profil",
    "physical": "Körperliche Daten",
    "dietary": "Ernährungspräferenzen",
    "security": "Sicherheit",
    "danger": "Gefahrenbereich"
  },
  "cookingLevel": "Kochlevel",
  "recommendedCalories": "✨ Empfohlen: {{calories}} kcal/Tag",
  "dailyCalorieGoal": "Tägliches Kalorienziel",
  "addCustomDiet": "+ Individuelle Diät hinzufügen",
  "customDietPlaceholder": "Individuelle Diät eingeben...",
  "changePassword": "🔑 Passwort ändern",
  "newPassword": "Neues Passwort",
  "confirmPassword": "Passwort bestätigen",
  "passwordMismatch": "Passwörter stimmen nicht überein",
  "passwordChanged": "Passwort erfolgreich geändert",
  "deleteAccount": "🗑️ Konto löschen",
  "deleteConfirmTitle": "Ihr Konto löschen?",
  "deleteConfirmBody": "Dies löscht dauerhaft alle Ihre Daten. Diese Aktion kann nicht rückgängig gemacht werden.",
  "deleteTypeConfirm": "Geben Sie DELETE ein zur Bestätigung",
  "deleteConfirmPlaceholder": "DELETE",
  "deleteConfirmButton": "Konto dauerhaft löschen",
  "deleteCancel": "Abbrechen",
  "aiGeneratingLabel": "Label wird erstellt..."
}
```

- [ ] **Step 5: Add keys to Japanese locale (`ja/translation.json`)**

```json
"survey": {
  "title": "GroceryGeniusをカスタマイズ",
  "subtitle": "約60秒で完了します。レシピやカロリー目標をあなたに合わせてカスタマイズするのに役立ちます。",
  "letsGo": "始める →",
  "skipForNow": "今はスキップ",
  "back": "← 戻る",
  "skipStep": "このステップをスキップ",
  "next": "次へ →",
  "finish": "完了 ✓",
  "stepOf": "{{total}}中{{step}}",
  "step1Title": "希望する言語は何ですか？",
  "step2Title": "あなた自身について教えてください",
  "step3Title": "料理の腕前はどのくらいですか？",
  "step4Title": "食事の好みはありますか？",
  "recommendedCalories": "推奨: 1日{{calories}}kcal",
  "tapToOverride": "(タップして編集)",
  "aiWillGenerate": "✨ AIがカスタム食事ラベルを生成します",
  "customDietPlaceholder": "独自の食事を入力: 例 地中海式...",
  "cookingLevels": {
    "beginner": "🌱 初心者 — シンプルに",
    "home_cook": "🏠 家庭料理 — レシピを参考に",
    "intermediate": "🔪 中級者 — アレンジが好き",
    "advanced": "⭐ 上級者 — 実験が好き"
  },
  "activityLevels": {
    "sedentary": "ほぼ動かない",
    "light": "軽い運動（週1〜3日）",
    "moderate": "適度な運動（週3〜5日）",
    "active": "活発（週6〜7日）",
    "very_active": "非常に活発（毎日ハードな運動）"
  },
  "dietaryPresets": {
    "vegetarian": "ベジタリアン",
    "vegan": "ヴィーガン",
    "gluten-free": "グルテンフリー",
    "dairy-free": "乳製品不使用",
    "halal": "ハラール",
    "kosher": "コーシャ",
    "keto": "ケトジェニック",
    "low-carb": "低糖質",
    "nut-free": "ナッツフリー",
    "paleo": "パレオ"
  },
  "fields": {
    "age": "年齢",
    "sex": "生物学的性別",
    "male": "男性",
    "female": "女性",
    "weight": "体重",
    "height": "身長",
    "activityLevel": "活動レベル",
    "dailyCalorieGoal": "1日のカロリー目標",
    "lbs": "ポンド",
    "kg": "kg",
    "ftIn": "フィート/インチ",
    "cm": "cm"
  }
},
"settings": {
  "title": "設定",
  "saveChanges": "保存する",
  "saved": "設定を保存しました",
  "sections": {
    "profile": "プロフィール",
    "physical": "身体情報",
    "dietary": "食事の好み",
    "security": "セキュリティ",
    "danger": "危険ゾーン"
  },
  "cookingLevel": "料理レベル",
  "recommendedCalories": "✨ 推奨: 1日{{calories}}kcal",
  "dailyCalorieGoal": "1日のカロリー目標",
  "addCustomDiet": "+ カスタム食事を追加",
  "customDietPlaceholder": "カスタム食事を入力...",
  "changePassword": "🔑 パスワードを変更",
  "newPassword": "新しいパスワード",
  "confirmPassword": "パスワードの確認",
  "passwordMismatch": "パスワードが一致しません",
  "passwordChanged": "パスワードが変更されました",
  "deleteAccount": "🗑️ アカウントを削除",
  "deleteConfirmTitle": "アカウントを削除しますか？",
  "deleteConfirmBody": "すべてのデータが完全に削除されます。この操作は元に戻せません。",
  "deleteTypeConfirm": "DELETEと入力して確認",
  "deleteConfirmPlaceholder": "DELETE",
  "deleteConfirmButton": "アカウントを完全に削除",
  "deleteCancel": "キャンセル",
  "aiGeneratingLabel": "ラベルを生成中..."
}
```

- [ ] **Step 6: Add keys to Chinese locale (`zh/translation.json`)**

```json
"survey": {
  "title": "个性化 GroceryGenius",
  "subtitle": "大约需要60秒。帮助我们为您量身定制食谱和卡路里目标。",
  "letsGo": "开始 →",
  "skipForNow": "暂时跳过",
  "back": "← 返回",
  "skipStep": "跳过此步骤",
  "next": "下一步 →",
  "finish": "完成 ✓",
  "stepOf": "{{total}}中第{{step}}步",
  "step1Title": "您偏好的语言是？",
  "step2Title": "告诉我们关于您的信息",
  "step3Title": "您在厨房里有多熟练？",
  "step4Title": "您有饮食偏好吗？",
  "recommendedCalories": "推荐：每天{{calories}}卡路里",
  "tapToOverride": "（点击修改）",
  "aiWillGenerate": "✨ AI将为自定义饮食生成标签",
  "customDietPlaceholder": "或输入您的：例如地中海饮食...",
  "cookingLevels": {
    "beginner": "🌱 初学者 — 保持简单",
    "home_cook": "🏠 家庭厨师 — 按照食谱",
    "intermediate": "🔪 中级 — 即兴发挥",
    "advanced": "⭐ 高级 — 热爱实验"
  },
  "activityLevels": {
    "sedentary": "久坐（很少或不运动）",
    "light": "轻度（每周1–3天）",
    "moderate": "中度（每周3–5天）",
    "active": "活跃（每周6–7天）",
    "very_active": "非常活跃（每天高强度运动）"
  },
  "dietaryPresets": {
    "vegetarian": "素食",
    "vegan": "纯素",
    "gluten-free": "无麸质",
    "dairy-free": "无乳制品",
    "halal": "清真",
    "kosher": "犹太洁食",
    "keto": "生酮",
    "low-carb": "低碳水",
    "nut-free": "无坚果",
    "paleo": "旧石器饮食"
  },
  "fields": {
    "age": "年龄",
    "sex": "生理性别",
    "male": "男",
    "female": "女",
    "weight": "体重",
    "height": "身高",
    "activityLevel": "活动水平",
    "dailyCalorieGoal": "每日卡路里目标",
    "lbs": "磅",
    "kg": "千克",
    "ftIn": "英尺/英寸",
    "cm": "厘米"
  }
},
"settings": {
  "title": "设置",
  "saveChanges": "保存更改",
  "saved": "设置已保存",
  "sections": {
    "profile": "个人资料",
    "physical": "身体信息",
    "dietary": "饮食偏好",
    "security": "安全",
    "danger": "危险区域"
  },
  "cookingLevel": "烹饪水平",
  "recommendedCalories": "✨ 推荐：每天{{calories}}卡路里",
  "dailyCalorieGoal": "每日卡路里目标",
  "addCustomDiet": "+ 添加自定义饮食",
  "customDietPlaceholder": "输入自定义饮食...",
  "changePassword": "🔑 修改密码",
  "newPassword": "新密码",
  "confirmPassword": "确认密码",
  "passwordMismatch": "密码不匹配",
  "passwordChanged": "密码修改成功",
  "deleteAccount": "🗑️ 删除账户",
  "deleteConfirmTitle": "删除您的账户？",
  "deleteConfirmBody": "这将永久删除您所有的数据，包括储藏室、食谱、餐饮计划和购物清单。此操作无法撤销。",
  "deleteTypeConfirm": "输入 DELETE 确认",
  "deleteConfirmPlaceholder": "DELETE",
  "deleteConfirmButton": "永久删除账户",
  "deleteCancel": "取消",
  "aiGeneratingLabel": "正在生成标签..."
}
```

- [ ] **Step 7: Verify i18n loads without errors**

```bash
cd frontend && npm run dev
```
Open the browser console — confirm no missing key warnings for `survey.*` or `settings.*` in English.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/locales/
git commit -m "feat: add survey and settings i18n keys for all 6 locales"
```

---

## Task 6: OnboardingSurvey Component

**Files:**
- Create: `frontend/src/components/OnboardingSurvey.tsx`

- [ ] **Step 1: Create the component**

Create `frontend/src/components/OnboardingSurvey.tsx`:

```typescript
import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { Profile, CustomDietaryLabel } from '../lib/supabase';

// Calorie calculation: Mifflin-St Jeor + TDEE multiplier
function calcRecommendedCalories(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: 'male' | 'female',
  activity: Profile['activity_level']
): number {
  const bmr =
    sex === 'male'
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  const multipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  return Math.round(bmr * (multipliers[activity ?? 'moderate'] ?? 1.55));
}

// Convert lbs → kg
function lbsToKg(lbs: number): number {
  return Math.round(lbs * 0.453592 * 100) / 100;
}

// Convert ft+in → cm
function ftInToCm(ft: number, inches: number): number {
  return Math.round((ft * 30.48) + (inches * 2.54));
}

const PRESET_DIETARY_KEYS = [
  'vegetarian', 'vegan', 'gluten-free', 'dairy-free',
  'halal', 'kosher', 'keto', 'low-carb', 'nut-free', 'paleo',
];

const LANGUAGES = [
  { code: 'en', flag: '🇺🇸', label: 'English' },
  { code: 'es', flag: '🇪🇸', label: 'Español' },
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
  { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
  { code: 'ja', flag: '🇯🇵', label: '日本語' },
  { code: 'zh', flag: '🇨🇳', label: '中文' },
];

interface SurveyData {
  cooking_level: Profile['cooking_level'];
  age: string;
  biological_sex: Profile['biological_sex'];
  weightValue: string;
  weightUnit: 'lbs' | 'kg';
  heightFt: string;
  heightIn: string;
  heightCm: string;
  heightUnit: 'ft' | 'cm';
  activity_level: Profile['activity_level'];
  daily_calorie_goal: number;
  dietary_preferences: string[];
  custom_dietary_labels: CustomDietaryLabel[];
}

interface OnboardingSurveyProps {
  userId: string;
  apiBase: string;
  onComplete: (data: Partial<Profile>) => void;
  onSkip: () => void;
}

const OnboardingSurvey: React.FC<OnboardingSurveyProps> = ({
  userId,
  apiBase,
  onComplete,
  onSkip,
}) => {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState(0); // 0 = welcome
  const [customDietText, setCustomDietText] = useState('');
  const [generatingLabel, setGeneratingLabel] = useState(false);

  const [data, setData] = useState<SurveyData>({
    cooking_level: undefined,
    age: '',
    biological_sex: undefined,
    weightValue: '',
    weightUnit: 'lbs',
    heightFt: '',
    heightIn: '',
    heightCm: '',
    heightUnit: 'ft',
    activity_level: 'moderate',
    daily_calorie_goal: 2000,
    dietary_preferences: [],
    custom_dietary_labels: [],
  });

  // Compute recommended calories from current form values
  const recommendedCalories = useCallback((): number | null => {
    const age = parseInt(data.age);
    const sex = data.biological_sex;
    if (!age || !sex) return null;

    let kg: number;
    if (data.weightUnit === 'lbs') {
      const lbs = parseFloat(data.weightValue);
      if (!lbs) return null;
      kg = lbsToKg(lbs);
    } else {
      kg = parseFloat(data.weightValue);
      if (!kg) return null;
    }

    let cm: number;
    if (data.heightUnit === 'ft') {
      const ft = parseInt(data.heightFt);
      const inches = parseInt(data.heightIn) || 0;
      if (!ft) return null;
      cm = ftInToCm(ft, inches);
    } else {
      cm = parseInt(data.heightCm);
      if (!cm) return null;
    }

    return calcRecommendedCalories(kg, cm, age, sex, data.activity_level);
  }, [data]);

  const toggleDietaryPreset = (key: string) => {
    setData(prev => ({
      ...prev,
      dietary_preferences: prev.dietary_preferences.includes(key)
        ? prev.dietary_preferences.filter(k => k !== key)
        : [...prev.dietary_preferences, key],
    }));
  };

  const handleAddCustomDiet = async () => {
    const text = customDietText.trim();
    if (!text) return;
    setGeneratingLabel(true);
    try {
      const res = await fetch(`${apiBase}/profile/dietary-label`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const labelData = await res.json();
      const newLabel: CustomDietaryLabel = {
        id: uuidv4(),
        label: labelData.label,
        description: labelData.description,
      };
      setData(prev => ({
        ...prev,
        custom_dietary_labels: [...prev.custom_dietary_labels, newLabel],
        dietary_preferences: [...prev.dietary_preferences, newLabel.id],
      }));
      setCustomDietText('');
    } finally {
      setGeneratingLabel(false);
    }
  };

  const handleFinish = () => {
    const rec = recommendedCalories();
    let weight_kg: number | undefined;
    if (data.weightUnit === 'lbs') {
      const lbs = parseFloat(data.weightValue);
      if (lbs) weight_kg = lbsToKg(lbs);
    } else {
      weight_kg = parseFloat(data.weightValue) || undefined;
    }

    let height_cm: number | undefined;
    if (data.heightUnit === 'ft') {
      const ft = parseInt(data.heightFt);
      if (ft) height_cm = ftInToCm(ft, parseInt(data.heightIn) || 0);
    } else {
      height_cm = parseInt(data.heightCm) || undefined;
    }

    onComplete({
      cooking_level: data.cooking_level,
      age: parseInt(data.age) || undefined,
      biological_sex: data.biological_sex,
      weight_kg,
      height_cm,
      activity_level: data.activity_level,
      daily_calorie_goal: data.daily_calorie_goal || rec || 2000,
      dietary_preferences: data.dietary_preferences,
      custom_dietary_labels: data.custom_dietary_labels,
      onboarding_completed: true,
    });
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
  };

  const cardStyle: React.CSSProperties = {
    background: 'white',
    borderRadius: '20px',
    padding: '2rem',
    maxWidth: '480px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  };

  const btnPrimary: React.CSSProperties = {
    width: '100%',
    padding: '0.75rem',
    background: 'linear-gradient(45deg, #667eea, #764ba2)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontWeight: '700',
    fontSize: '1rem',
    cursor: 'pointer',
    marginTop: '1rem',
  };

  const btnGhost: React.CSSProperties = {
    width: '100%',
    padding: '0.5rem',
    background: 'transparent',
    color: '#9ca3af',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.875rem',
    marginTop: '0.5rem',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.6rem 0.75rem',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '1rem',
    boxSizing: 'border-box',
  };

  const sectionLabel: React.CSSProperties = {
    fontSize: '0.7rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#9ca3af',
    letterSpacing: '0.05em',
    marginBottom: '0.5rem',
  };

  // ── Step 0: Welcome ───────────────────────────────────────
  if (step === 0) {
    return (
      <div style={overlayStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>👨‍🍳</div>
            <h2 style={{ margin: 0, color: '#667eea', fontSize: '1.5rem' }}>{t('survey.title')}</h2>
            <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>{t('survey.subtitle')}</p>
          </div>
          <button style={btnPrimary} onClick={() => setStep(1)}>{t('survey.letsGo')}</button>
          <button style={btnGhost} onClick={onSkip}>{t('survey.skipForNow')}</button>
        </div>
      </div>
    );
  }

  // ── Step 1: Language ──────────────────────────────────────
  if (step === 1) {
    return (
      <div style={overlayStyle}>
        <div style={cardStyle}>
          <div style={sectionLabel}>{t('survey.stepOf', { step: 1, total: 4 })}</div>
          <h2 style={{ margin: '0 0 1rem', color: '#374151' }}>{t('survey.step1Title')}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => i18n.changeLanguage(lang.code)}
                style={{
                  padding: '0.75rem',
                  border: i18n.language.startsWith(lang.code) ? '2px solid #667eea' : '1px solid #e5e7eb',
                  background: i18n.language.startsWith(lang.code) ? '#f5f3ff' : 'white',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: i18n.language.startsWith(lang.code) ? '700' : '400',
                  fontSize: '0.875rem',
                  textAlign: 'left',
                }}
              >
                {lang.flag} {lang.label}
              </button>
            ))}
          </div>
          <button style={btnPrimary} onClick={() => setStep(2)}>{t('survey.next')}</button>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
            <button style={{ ...btnGhost, width: 'auto' }} onClick={() => setStep(0)}>{t('survey.back')}</button>
            <button style={{ ...btnGhost, width: 'auto' }} onClick={() => setStep(2)}>{t('survey.skipStep')}</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 2: Physical Info ─────────────────────────────────
  if (step === 2) {
    const rec = recommendedCalories();
    return (
      <div style={overlayStyle}>
        <div style={cardStyle}>
          <div style={sectionLabel}>{t('survey.stepOf', { step: 2, total: 4 })}</div>
          <h2 style={{ margin: '0 0 1rem', color: '#374151' }}>{t('survey.step2Title')}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>{t('survey.fields.age')}</label>
              <input
                type="number"
                min="1" max="120"
                value={data.age}
                onChange={e => setData(p => ({ ...p, age: e.target.value }))}
                style={inputStyle}
                placeholder="25"
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>{t('survey.fields.sex')}</label>
              <select
                value={data.biological_sex ?? ''}
                onChange={e => setData(p => ({ ...p, biological_sex: e.target.value as Profile['biological_sex'] }))}
                style={inputStyle}
              >
                <option value="">—</option>
                <option value="male">{t('survey.fields.male')}</option>
                <option value="female">{t('survey.fields.female')}</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>{t('survey.fields.weight')}</label>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <input
                  type="number"
                  min="1"
                  value={data.weightValue}
                  onChange={e => setData(p => ({ ...p, weightValue: e.target.value }))}
                  style={{ ...inputStyle, flex: 1 }}
                  placeholder={data.weightUnit === 'lbs' ? '150' : '68'}
                />
                <button
                  onClick={() => setData(p => ({ ...p, weightUnit: p.weightUnit === 'lbs' ? 'kg' : 'lbs' }))}
                  style={{ padding: '0.5rem 0.6rem', border: '2px solid #e5e7eb', borderRadius: '8px', background: '#f3f4f6', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600' }}
                >
                  {data.weightUnit}
                </button>
              </div>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>{t('survey.fields.height')}</label>
              {data.heightUnit === 'ft' ? (
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <input type="number" min="1" max="8" value={data.heightFt} onChange={e => setData(p => ({ ...p, heightFt: e.target.value }))} style={{ ...inputStyle, flex: 1 }} placeholder="5" />
                  <input type="number" min="0" max="11" value={data.heightIn} onChange={e => setData(p => ({ ...p, heightIn: e.target.value }))} style={{ ...inputStyle, flex: 1 }} placeholder="8" />
                  <button onClick={() => setData(p => ({ ...p, heightUnit: 'cm' }))} style={{ padding: '0.5rem 0.4rem', border: '2px solid #e5e7eb', borderRadius: '8px', background: '#f3f4f6', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600' }}>ft</button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <input type="number" min="50" max="250" value={data.heightCm} onChange={e => setData(p => ({ ...p, heightCm: e.target.value }))} style={{ ...inputStyle, flex: 1 }} placeholder="175" />
                  <button onClick={() => setData(p => ({ ...p, heightUnit: 'ft' }))} style={{ padding: '0.5rem 0.4rem', border: '2px solid #e5e7eb', borderRadius: '8px', background: '#f3f4f6', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600' }}>cm</button>
                </div>
              )}
            </div>
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.8rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>{t('survey.fields.activityLevel')}</label>
            <select
              value={data.activity_level ?? 'moderate'}
              onChange={e => setData(p => ({ ...p, activity_level: e.target.value as Profile['activity_level'] }))}
              style={inputStyle}
            >
              {(['sedentary','light','moderate','active','very_active'] as const).map(level => (
                <option key={level} value={level}>{t(`survey.activityLevels.${level}`)}</option>
              ))}
            </select>
          </div>
          {rec && (
            <div style={{ background: '#f0fdf4', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ color: '#059669', fontWeight: '600', fontSize: '0.875rem' }}>
                {t('survey.recommendedCalories', { calories: rec.toLocaleString() })}
                <span style={{ color: '#9ca3af', fontWeight: '400' }}> {t('survey.tapToOverride')}</span>
              </div>
              <input
                type="number"
                value={data.daily_calorie_goal || rec}
                onChange={e => setData(p => ({ ...p, daily_calorie_goal: parseInt(e.target.value) || rec }))}
                style={{ ...inputStyle, marginTop: '0.5rem', fontSize: '0.875rem' }}
              />
            </div>
          )}
          <button style={btnPrimary} onClick={() => setStep(3)}>{t('survey.next')}</button>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
            <button style={{ ...btnGhost, width: 'auto' }} onClick={() => setStep(1)}>{t('survey.back')}</button>
            <button style={{ ...btnGhost, width: 'auto' }} onClick={() => setStep(3)}>{t('survey.skipStep')}</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 3: Cooking Level ─────────────────────────────────
  if (step === 3) {
    const levels = ['beginner', 'home_cook', 'intermediate', 'advanced'] as const;
    return (
      <div style={overlayStyle}>
        <div style={cardStyle}>
          <div style={sectionLabel}>{t('survey.stepOf', { step: 3, total: 4 })}</div>
          <h2 style={{ margin: '0 0 1rem', color: '#374151' }}>{t('survey.step3Title')}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {levels.map(level => (
              <button
                key={level}
                onClick={() => setData(p => ({ ...p, cooking_level: level }))}
                style={{
                  padding: '0.75rem 1rem',
                  border: data.cooking_level === level ? '2px solid #667eea' : '1px solid #e5e7eb',
                  background: data.cooking_level === level ? '#f5f3ff' : 'white',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontWeight: data.cooking_level === level ? '700' : '400',
                  fontSize: '0.9rem',
                }}
              >
                {t(`survey.cookingLevels.${level}`)}
              </button>
            ))}
          </div>
          <button style={btnPrimary} onClick={() => setStep(4)}>{t('survey.next')}</button>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
            <button style={{ ...btnGhost, width: 'auto' }} onClick={() => setStep(2)}>{t('survey.back')}</button>
            <button style={{ ...btnGhost, width: 'auto' }} onClick={() => setStep(4)}>{t('survey.skipStep')}</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 4: Dietary Prefs ─────────────────────────────────
  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <div style={sectionLabel}>{t('survey.stepOf', { step: 4, total: 4 })}</div>
        <h2 style={{ margin: '0 0 1rem', color: '#374151' }}>{t('survey.step4Title')}</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
          {PRESET_DIETARY_KEYS.map(key => {
            const selected = data.dietary_preferences.includes(key);
            return (
              <button
                key={key}
                onClick={() => toggleDietaryPreset(key)}
                style={{
                  padding: '0.4rem 0.75rem',
                  border: selected ? '2px solid #667eea' : '1px solid #e5e7eb',
                  background: selected ? '#f5f3ff' : 'white',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontWeight: selected ? '700' : '400',
                  fontSize: '0.875rem',
                }}
              >
                {selected ? '✓ ' : ''}{t(`survey.dietaryPresets.${key}`)}
              </button>
            );
          })}
          {data.custom_dietary_labels.map(custom => {
            const selected = data.dietary_preferences.includes(custom.id);
            return (
              <button
                key={custom.id}
                onClick={() => toggleDietaryPreset(custom.id)}
                style={{
                  padding: '0.4rem 0.75rem',
                  border: selected ? '2px solid #10b981' : '1px solid #e5e7eb',
                  background: selected ? '#f0fdf4' : 'white',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontWeight: selected ? '700' : '400',
                  fontSize: '0.875rem',
                }}
              >
                {selected ? '✓ ' : ''}✨ {custom.label}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <input
            type="text"
            value={customDietText}
            onChange={e => setCustomDietText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddCustomDiet()}
            placeholder={t('survey.customDietPlaceholder')}
            style={{ ...inputStyle, flex: 1 }}
            disabled={generatingLabel}
          />
          <button
            onClick={handleAddCustomDiet}
            disabled={generatingLabel || !customDietText.trim()}
            style={{
              padding: '0.6rem 0.75rem',
              background: 'linear-gradient(45deg, #667eea, #764ba2)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: generatingLabel ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              opacity: generatingLabel || !customDietText.trim() ? 0.6 : 1,
            }}
          >
            {generatingLabel ? '…' : '+'}
          </button>
        </div>
        <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '0 0 1rem' }}>{t('survey.aiWillGenerate')}</p>
        <button
          style={{ ...btnPrimary, background: 'linear-gradient(45deg, #10b981, #059669)' }}
          onClick={handleFinish}
        >
          {t('survey.finish')}
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
          <button style={{ ...btnGhost, width: 'auto' }} onClick={() => setStep(3)}>{t('survey.back')}</button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingSurvey;
```

- [ ] **Step 2: Install uuid if not present**

```bash
cd frontend && npm list uuid 2>/dev/null || npm install uuid && npm install --save-dev @types/uuid
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors in `OnboardingSurvey.tsx`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/OnboardingSurvey.tsx
git commit -m "feat: add OnboardingSurvey component — 4-step personalization wizard"
```

---

## Task 7: SettingsPanel Component

**Files:**
- Create: `frontend/src/components/SettingsPanel.tsx`

- [ ] **Step 1: Create the component**

Create `frontend/src/components/SettingsPanel.tsx`:

```typescript
import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { Profile, CustomDietaryLabel, profileService, authService, supabase } from '../lib/supabase';

function calcRecommendedCalories(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: 'male' | 'female',
  activity: Profile['activity_level']
): number {
  const bmr =
    sex === 'male'
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  const multipliers: Record<string, number> = {
    sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
  };
  return Math.round(bmr * (multipliers[activity ?? 'moderate'] ?? 1.55));
}

function lbsToKg(lbs: number): number { return Math.round(lbs * 0.453592 * 100) / 100; }
function kgToLbs(kg: number): number { return Math.round(kg * 2.20462 * 10) / 10; }
function ftInToCm(ft: number, inches: number): number { return Math.round(ft * 30.48 + inches * 2.54); }
function cmToFtIn(cm: number): { ft: number; inches: number } {
  const totalInches = cm / 2.54;
  return { ft: Math.floor(totalInches / 12), inches: Math.round(totalInches % 12) };
}

const PRESET_DIETARY_KEYS = [
  'vegetarian', 'vegan', 'gluten-free', 'dairy-free',
  'halal', 'kosher', 'keto', 'low-carb', 'nut-free', 'paleo',
];

interface SettingsPanelProps {
  userId: string;
  profile: Profile;
  apiBase: string;
  isMobile: boolean;
  onClose: () => void;
  onSave: (updated: Partial<Profile>) => void;
  onSignOut: () => void;
  onDeleteAccount: () => void;
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  userId, profile, apiBase, isMobile, onClose, onSave,
  onSignOut, onDeleteAccount, showSuccess, showError,
}) => {
  const { t } = useTranslation();

  // Local form state (pre-filled from profile)
  const [cookingLevel, setCookingLevel] = useState(profile.cooking_level ?? '');
  const [age, setAge] = useState(String(profile.age ?? ''));
  const [sex, setSex] = useState<Profile['biological_sex']>(profile.biological_sex);
  const [weightValue, setWeightValue] = useState(profile.weight_kg ? String(kgToLbs(profile.weight_kg)) : '');
  const [weightUnit, setWeightUnit] = useState<'lbs' | 'kg'>('lbs');
  const [heightFt, setHeightFt] = useState(() => {
    if (!profile.height_cm) return '';
    return String(cmToFtIn(profile.height_cm).ft);
  });
  const [heightIn, setHeightIn] = useState(() => {
    if (!profile.height_cm) return '';
    return String(cmToFtIn(profile.height_cm).inches);
  });
  const [heightCm, setHeightCm] = useState(String(profile.height_cm ?? ''));
  const [heightUnit, setHeightUnit] = useState<'ft' | 'cm'>('ft');
  const [activityLevel, setActivityLevel] = useState<Profile['activity_level']>(profile.activity_level ?? 'moderate');
  const [calorieGoal, setCalorieGoal] = useState(String(profile.daily_calorie_goal ?? 2000));
  const [dietaryPrefs, setDietaryPrefs] = useState<string[]>(profile.dietary_preferences ?? []);
  const [customLabels, setCustomLabels] = useState<CustomDietaryLabel[]>(profile.custom_dietary_labels ?? []);
  const [customDietText, setCustomDietText] = useState('');
  const [generatingLabel, setGeneratingLabel] = useState(false);
  const [saving, setSaving] = useState(false);

  // Change password state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const recommendedCalories = useCallback((): number | null => {
    const ageNum = parseInt(age);
    if (!ageNum || !sex) return null;
    let kg: number;
    if (weightUnit === 'lbs') {
      const lbs = parseFloat(weightValue);
      if (!lbs) return null;
      kg = lbsToKg(lbs);
    } else {
      kg = parseFloat(weightValue);
      if (!kg) return null;
    }
    let cm: number;
    if (heightUnit === 'ft') {
      const ft = parseInt(heightFt);
      if (!ft) return null;
      cm = ftInToCm(ft, parseInt(heightIn) || 0);
    } else {
      cm = parseInt(heightCm);
      if (!cm) return null;
    }
    return calcRecommendedCalories(kg, cm, ageNum, sex, activityLevel);
  }, [age, sex, weightValue, weightUnit, heightFt, heightIn, heightCm, heightUnit, activityLevel]);

  const toggleDietaryPreset = (key: string) => {
    setDietaryPrefs(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const removeCustomLabel = (id: string) => {
    setCustomLabels(prev => prev.filter(l => l.id !== id));
    setDietaryPrefs(prev => prev.filter(k => k !== id));
  };

  const handleAddCustomDiet = async () => {
    const text = customDietText.trim();
    if (!text) return;
    setGeneratingLabel(true);
    try {
      const res = await fetch(`${apiBase}/profile/dietary-label`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const labelData = await res.json();
      const newLabel: CustomDietaryLabel = { id: uuidv4(), label: labelData.label, description: labelData.description };
      setCustomLabels(prev => [...prev, newLabel]);
      setDietaryPrefs(prev => [...prev, newLabel.id]);
      setCustomDietText('');
    } catch {
      showError('Failed to generate label. Diet added with original text.');
      const fallback: CustomDietaryLabel = { id: uuidv4(), label: text.slice(0, 30), description: '' };
      setCustomLabels(prev => [...prev, fallback]);
      setDietaryPrefs(prev => [...prev, fallback.id]);
      setCustomDietText('');
    } finally {
      setGeneratingLabel(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    let weight_kg: number | undefined;
    if (weightUnit === 'lbs') {
      const lbs = parseFloat(weightValue);
      if (lbs) weight_kg = lbsToKg(lbs);
    } else {
      weight_kg = parseFloat(weightValue) || undefined;
    }
    let height_cm: number | undefined;
    if (heightUnit === 'ft') {
      const ft = parseInt(heightFt);
      if (ft) height_cm = ftInToCm(ft, parseInt(heightIn) || 0);
    } else {
      height_cm = parseInt(heightCm) || undefined;
    }

    const updates: Partial<Profile> = {
      cooking_level: cookingLevel as Profile['cooking_level'] || undefined,
      age: parseInt(age) || undefined,
      biological_sex: sex,
      weight_kg,
      height_cm,
      activity_level: activityLevel,
      daily_calorie_goal: parseInt(calorieGoal) || 2000,
      dietary_preferences: dietaryPrefs,
      custom_dietary_labels: customLabels,
    };
    const { error } = await profileService.upsertProfile(userId, updates);
    setSaving(false);
    if (error) {
      showError('Failed to save settings.');
    } else {
      showSuccess(t('settings.saved'));
      onSave(updates);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      showError(t('settings.passwordMismatch'));
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      showError(error.message);
    } else {
      showSuccess(t('settings.passwordChanged'));
      setShowPasswordForm(false);
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setDeleting(true);
    try {
      await fetch(`${apiBase}/profile/account`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });
      await authService.signOut();
      onDeleteAccount();
    } catch {
      showError('Failed to delete account. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const rec = recommendedCalories();

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.5rem 0.6rem',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '0.875rem',
    boxSizing: 'border-box',
  };

  const sectionHeaderStyle: React.CSSProperties = {
    fontSize: '0.65rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#9ca3af',
    marginBottom: '0.5rem',
  };

  const sectionStyle: React.CSSProperties = {
    padding: '0.75rem',
    borderBottom: '1px solid #f3f4f6',
  };

  // Backdrop click handler
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  // ── Desktop: Right-side drawer ────────────────────────────
  // ── Mobile: Bottom sheet ──────────────────────────────────
  const panelContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Panel header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '1rem',
        borderRadius: isMobile ? '16px 16px 0 0' : '0',
        flexShrink: 0,
      }}>
        {isMobile && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <div style={{ width: '36px', height: '4px', background: 'rgba(255,255,255,0.4)', borderRadius: '2px' }} />
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: '700', fontSize: '1.1rem' }}>⚙️ {t('settings.title')}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.25rem', cursor: 'pointer', opacity: 0.8 }}>✕</button>
        </div>
        <div style={{ fontSize: '0.75rem', opacity: 0.85, marginTop: '0.25rem' }}>
          {profile.full_name} · {profile.email}
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Profile section */}
        <div style={sectionStyle}>
          <div style={sectionHeaderStyle}>👤 {t('settings.sections.profile')}</div>
          <label style={{ fontSize: '0.8rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>{t('settings.cookingLevel')}</label>
          <select value={cookingLevel} onChange={e => setCookingLevel(e.target.value)} style={inputStyle}>
            <option value="">—</option>
            {(['beginner','home_cook','intermediate','advanced'] as const).map(level => (
              <option key={level} value={level}>{t(`survey.cookingLevels.${level}`)}</option>
            ))}
          </select>
        </div>

        {/* Physical info section */}
        <div style={sectionStyle}>
          <div style={sectionHeaderStyle}>🏃 {t('settings.sections.physical')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.2rem' }}>{t('survey.fields.age')}</label>
              <input type="number" min="1" max="120" value={age} onChange={e => setAge(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.2rem' }}>{t('survey.fields.sex')}</label>
              <select value={sex ?? ''} onChange={e => setSex(e.target.value as Profile['biological_sex'])} style={inputStyle}>
                <option value="">—</option>
                <option value="male">{t('survey.fields.male')}</option>
                <option value="female">{t('survey.fields.female')}</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.2rem' }}>{t('survey.fields.weight')}</label>
              <div style={{ display: 'flex', gap: '0.2rem' }}>
                <input type="number" value={weightValue} onChange={e => setWeightValue(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                <button onClick={() => setWeightUnit(u => u === 'lbs' ? 'kg' : 'lbs')} style={{ padding: '0.4rem', border: '1px solid #e5e7eb', borderRadius: '6px', background: '#f3f4f6', cursor: 'pointer', fontSize: '0.7rem', fontWeight: '600' }}>{weightUnit}</button>
              </div>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.2rem' }}>{t('survey.fields.height')}</label>
              {heightUnit === 'ft' ? (
                <div style={{ display: 'flex', gap: '0.2rem' }}>
                  <input type="number" value={heightFt} onChange={e => setHeightFt(e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder="5" />
                  <input type="number" value={heightIn} onChange={e => setHeightIn(e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder="8" />
                  <button onClick={() => setHeightUnit('cm')} style={{ padding: '0.4rem', border: '1px solid #e5e7eb', borderRadius: '6px', background: '#f3f4f6', cursor: 'pointer', fontSize: '0.7rem', fontWeight: '600' }}>ft</button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.2rem' }}>
                  <input type="number" value={heightCm} onChange={e => setHeightCm(e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder="175" />
                  <button onClick={() => setHeightUnit('ft')} style={{ padding: '0.4rem', border: '1px solid #e5e7eb', borderRadius: '6px', background: '#f3f4f6', cursor: 'pointer', fontSize: '0.7rem', fontWeight: '600' }}>cm</button>
                </div>
              )}
            </div>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.2rem' }}>{t('survey.fields.activityLevel')}</label>
            <select value={activityLevel ?? 'moderate'} onChange={e => setActivityLevel(e.target.value as Profile['activity_level'])} style={inputStyle}>
              {(['sedentary','light','moderate','active','very_active'] as const).map(level => (
                <option key={level} value={level}>{t(`survey.activityLevels.${level}`)}</option>
              ))}
            </select>
          </div>
          {rec && (
            <div style={{ background: '#f0fdf4', borderRadius: '8px', padding: '0.5rem', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#059669', fontWeight: '600' }}>
              {t('settings.recommendedCalories', { calories: rec.toLocaleString() })}
            </div>
          )}
          <div>
            <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.2rem' }}>{t('settings.dailyCalorieGoal')}</label>
            <input type="number" value={calorieGoal} onChange={e => setCalorieGoal(e.target.value)} style={inputStyle} />
          </div>
        </div>

        {/* Dietary preferences section */}
        <div style={sectionStyle}>
          <div style={sectionHeaderStyle}>🥗 {t('settings.sections.dietary')}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
            {PRESET_DIETARY_KEYS.map(key => {
              const selected = dietaryPrefs.includes(key);
              return (
                <button key={key} onClick={() => toggleDietaryPreset(key)} style={{
                  padding: '0.3rem 0.6rem',
                  border: selected ? '2px solid #667eea' : '1px solid #e5e7eb',
                  background: selected ? '#f5f3ff' : 'white',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  fontWeight: selected ? '700' : '400',
                  fontSize: '0.8rem',
                }}>
                  {selected ? '✓ ' : ''}{t(`survey.dietaryPresets.${key}`)}
                </button>
              );
            })}
            {customLabels.map(custom => {
              const selected = dietaryPrefs.includes(custom.id);
              return (
                <div key={custom.id} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <button onClick={() => toggleDietaryPreset(custom.id)} style={{
                    padding: '0.3rem 0.6rem',
                    border: selected ? '2px solid #10b981' : '1px solid #e5e7eb',
                    background: selected ? '#f0fdf4' : 'white',
                    borderRadius: '16px',
                    cursor: 'pointer',
                    fontWeight: selected ? '700' : '400',
                    fontSize: '0.8rem',
                  }}>
                    ✨ {custom.label}
                  </button>
                  <button onClick={() => removeCustomLabel(custom.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '0.75rem', padding: '0.1rem' }}>✕</button>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <input
              type="text"
              value={customDietText}
              onChange={e => setCustomDietText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddCustomDiet()}
              placeholder={t('settings.customDietPlaceholder')}
              style={{ ...inputStyle, flex: 1 }}
              disabled={generatingLabel}
            />
            <button
              onClick={handleAddCustomDiet}
              disabled={generatingLabel || !customDietText.trim()}
              style={{ padding: '0.4rem 0.6rem', background: 'linear-gradient(45deg,#667eea,#764ba2)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600', opacity: generatingLabel || !customDietText.trim() ? 0.6 : 1 }}
            >
              {generatingLabel ? t('settings.aiGeneratingLabel') : '+'}
            </button>
          </div>
        </div>

        {/* Security section */}
        <div style={sectionStyle}>
          <div style={sectionHeaderStyle}>🔒 {t('settings.sections.security')}</div>
          <button
            onClick={() => setShowPasswordForm(v => !v)}
            style={{ width: '100%', padding: '0.5rem', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.875rem', cursor: 'pointer', textAlign: 'left' }}
          >
            {t('settings.changePassword')} {showPasswordForm ? '▲' : '→'}
          </button>
          {showPasswordForm && (
            <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder={t('settings.newPassword')} style={inputStyle} minLength={6} />
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder={t('settings.confirmPassword')} style={inputStyle} minLength={6} />
              <button
                onClick={handleChangePassword}
                disabled={changingPassword || !newPassword || !confirmPassword}
                style={{ padding: '0.5rem', background: 'linear-gradient(45deg,#667eea,#764ba2)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', opacity: changingPassword ? 0.6 : 1 }}
              >
                {changingPassword ? '…' : t('settings.changePassword')}
              </button>
            </div>
          )}
        </div>

        {/* Danger zone section */}
        <div style={{ padding: '0.75rem' }}>
          <div style={{ ...sectionHeaderStyle, color: '#ef4444' }}>⚠️ {t('settings.sections.danger')}</div>
          <button
            onClick={() => setShowDeleteModal(true)}
            style={{ width: '100%', padding: '0.5rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '6px', fontSize: '0.875rem', color: '#dc2626', cursor: 'pointer', textAlign: 'left' }}
          >
            {t('settings.deleteAccount')}
          </button>
        </div>
      </div>

      {/* Save button */}
      <div style={{ padding: '0.75rem', borderTop: '2px solid #f3f4f6', flexShrink: 0 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ width: '100%', padding: '0.75rem', background: saving ? '#9ca3af' : 'linear-gradient(45deg,#667eea,#764ba2)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '1rem', cursor: saving ? 'not-allowed' : 'pointer' }}
        >
          {saving ? '…' : t('settings.saveChanges')}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', maxWidth: '400px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 0.75rem', color: '#dc2626' }}>{t('settings.deleteConfirmTitle')}</h3>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0 0 1rem' }}>{t('settings.deleteConfirmBody')}</p>
            <label style={{ fontSize: '0.8rem', color: '#374151', display: 'block', marginBottom: '0.5rem' }}>{t('settings.deleteTypeConfirm')}</label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder={t('settings.deleteConfirmPlaceholder')}
              style={{ width: '100%', padding: '0.6rem', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '1rem', boxSizing: 'border-box', marginBottom: '1rem' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
                style={{ flex: 1, padding: '0.6rem', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
              >
                {t('settings.deleteCancel')}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || deleting}
                style={{ flex: 1, padding: '0.6rem', background: deleteConfirmText === 'DELETE' ? '#dc2626' : '#e5e7eb', color: deleteConfirmText === 'DELETE' ? 'white' : '#9ca3af', border: 'none', borderRadius: '8px', cursor: deleteConfirmText === 'DELETE' ? 'pointer' : 'not-allowed', fontWeight: '700' }}
              >
                {deleting ? '…' : t('settings.deleteConfirmButton')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop: right-side drawer */}
      {!isMobile && (
        <div onClick={handleBackdropClick} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 999, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '320px', background: 'white', height: '100%', boxShadow: '-4px 0 24px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', overflowY: 'hidden' }}>
            {panelContent}
          </div>
        </div>
      )}

      {/* Mobile: bottom sheet */}
      {isMobile && (
        <div onClick={handleBackdropClick} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 999, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ width: '100%', background: 'white', borderRadius: '16px 16px 0 0', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 -4px 24px rgba(0,0,0,0.18)' }}>
            {panelContent}
          </div>
        </div>
      )}
    </>
  );
};

export default SettingsPanel;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors in `SettingsPanel.tsx`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/SettingsPanel.tsx
git commit -m "feat: add SettingsPanel component — right-drawer desktop, bottom-sheet mobile"
```

---

## Task 8: Wire App.tsx

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Add imports at the top of App.tsx**

After the existing component imports (near line 41–44), add:

```typescript
import OnboardingSurvey from './components/OnboardingSurvey';
import SettingsPanel from './components/SettingsPanel';
import { profileService, CustomDietaryLabel } from './lib/supabase';
```

- [ ] **Step 2: Add settings + survey state near the top of the App component (around line 148)**

After the `const [showMissionPopup, setShowMissionPopup] = useState(false);` line, add:

```typescript
const [showSettings, setShowSettings] = useState(false);
const [showSurvey, setShowSurvey] = useState(false);
const [userProfile, setUserProfile] = useState<import('./lib/supabase').Profile | null>(null);
const [customDietaryLabels, setCustomDietaryLabels] = useState<CustomDietaryLabel[]>([]);
```

- [ ] **Step 3: Load profile in `loadUserData` and trigger survey if needed**

Inside the `loadUserData` function, after the block that loads `daily_calorie_goal` (around line 336–344), add:

```typescript
// Load full profile for settings + survey
try {
  const profileResult = await profileService.getProfile(user.id);
  if (profileResult) {
    setUserProfile(profileResult);
    setCustomDietaryLabels(profileResult.custom_dietary_labels ?? []);
    // Pre-select user's first dietary preference in the recipe generator
    if (profileResult.dietary_preferences && profileResult.dietary_preferences.length > 0) {
      setDietaryFilter(profileResult.dietary_preferences[0]);
    }
    // Trigger onboarding survey for new users
    if (!profileResult.onboarding_completed) {
      setShowSurvey(true);
    }
  }
} catch (err) {
  console.error('Error loading profile:', err);
}
```

- [ ] **Step 4: Add gear button to desktop header**

In the desktop header section (around line 2562), inside the `{!isMobile && (...)}` block, add a gear button **before** the Sign Out button:

```typescript
{!isMobile && (
  <button onClick={() => setShowSettings(true)} style={{
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
```

- [ ] **Step 5: Add gear button to mobile drawer footer**

In the mobile drawer footer section (around line 2501–2514), add a settings button before the sign-out button:

```typescript
<button
  className="mobile-drawer-footer-btn"
  onClick={() => { setShowSettings(true); setDrawerOpen(false); }}
>
  ⚙️ {t('settings.title')}
</button>
```

- [ ] **Step 6: Add custom dietary labels to the recipe generator dietary dropdowns**

Both dietary `<select>` elements in App.tsx (lines ~2719 and ~2852) need custom label options added. After the last hardcoded `<option>` in each select, add:

```typescript
{customDietaryLabels.map(custom => (
  <option key={custom.id} value={custom.id}>✨ {custom.label}</option>
))}
```

- [ ] **Step 7: Handle survey completion and skip in App.tsx JSX**

At the bottom of the App return statement, before the closing `</div>`, add:

```typescript
{/* Onboarding Survey */}
{showSurvey && userProfile && (
  <OnboardingSurvey
    userId={user.id}
    apiBase={API_BASE}
    onComplete={async (surveyData) => {
      const { error } = await profileService.upsertProfile(user.id, surveyData);
      if (!error) {
        setUserProfile(prev => prev ? { ...prev, ...surveyData } : null);
        if (surveyData.daily_calorie_goal) setDailyCalorieGoal(surveyData.daily_calorie_goal);
        if (surveyData.custom_dietary_labels) setCustomDietaryLabels(surveyData.custom_dietary_labels);
        if (surveyData.dietary_preferences && surveyData.dietary_preferences.length > 0) {
          setDietaryFilter(surveyData.dietary_preferences[0]);
        }
      }
      setShowSurvey(false);
      setShowMissionPopup(true);
    }}
    onSkip={async () => {
      await profileService.upsertProfile(user.id, { onboarding_completed: true });
      setShowSurvey(false);
      setShowMissionPopup(true);
    }}
  />
)}

{/* Settings Panel */}
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
    }}
    onSignOut={async () => {
      await authService.signOut();
      setUser(null);
      setShowSettings(false);
    }}
    onDeleteAccount={() => {
      setUser(null);
      setShowSettings(false);
    }}
    showSuccess={success}
    showError={error}
  />
)}
```

- [ ] **Step 8: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 9: Manual smoke test**

Start the dev server:
```bash
cd frontend && npm run dev
```

Run through this checklist:
1. Sign up a new account — survey appears before mission popup ✓
2. Complete survey steps, confirm calorie recommendation calculates live ✓
3. Add a custom diet — AI label generates and chip appears ✓
4. Finish survey — mission popup fires afterward ✓
5. Open settings with gear button (desktop and mobile) ✓
6. Edit physical info — calorie recommendation updates ✓
7. Save settings — success toast appears ✓
8. Recipe generator dietary dropdown shows user's preferences pre-selected ✓
9. Change password — success toast appears ✓
10. Delete Account: type DELETE → button enables → account deleted, redirected to auth ✓

- [ ] **Step 10: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: wire OnboardingSurvey and SettingsPanel into App — gear button, profile load, dietary defaults"
```

---

## Self-Review

**Spec coverage check:**

| Spec Requirement | Task |
|---|---|
| New profile columns (cooking_level, age, weight_kg, height_cm, biological_sex, activity_level, onboarding_completed, custom_dietary_labels) | Task 1 |
| Mifflin-St Jeor calorie formula with activity multiplier | Task 6 (OnboardingSurvey), Task 7 (SettingsPanel) |
| Onboarding survey triggered after signup, before mission popup | Task 8 |
| Survey Step 1: language (immediately applies i18n) | Task 6 |
| Survey Step 2: physical info with live calorie recommendation | Task 6 |
| Survey Step 3: cooking level | Task 6 |
| Survey Step 4: preset chips + free-text → AI label | Task 6 |
| Skip entire survey / skip individual steps | Task 6 |
| Settings side panel — right drawer (desktop) + bottom sheet (mobile) | Task 7 |
| ⚙️ gear button in desktop header + mobile drawer | Task 8 |
| Settings: cooking level, physical info, dietary prefs, change password, delete account | Task 7 |
| Language NOT in settings | ✓ (absent from SettingsPanel) |
| AI dietary label endpoint | Task 2 |
| Fallback on OpenAI failure | Task 2 |
| Custom labels merged into recipe generator dropdown | Task 8 Step 6 |
| First dietary preference pre-selected in recipe generator | Task 8 Step 3 |
| Delete account: type DELETE confirmation, cascade delete | Task 7, Task 2 |
| Change password via Supabase updateUser | Task 7 |
| i18n for all 6 languages | Task 5 |
| Mobile-friendly (bottom sheet, 16px inputs) | Task 7 |

All spec requirements covered. ✓
