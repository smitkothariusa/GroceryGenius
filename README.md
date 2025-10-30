# 🍳 GroceryGenius

An AI-powered meal planning and grocery management app that helps you make the most of what's in your kitchen.

## What It Does

GroceryGenius helps you answer the age-old question: "What should I cook tonight?" It takes the ingredients you have and generates personalized recipes, tracks your pantry, manages shopping lists, and helps you plan meals for the week.

## Features

### Recipe Generation
Enter ingredients you have on hand, and get three recipe suggestions - one standard recipe and two healthy, budget-friendly alternatives. Each recipe includes:
- Complete ingredient lists with measurements
- Step-by-step instructions
- Nutritional information
- Health benefits
- Budget-saving tips
- Health grade (A+ to D)

### Pantry Management
Keep track of what you have at home and get alerts when items are about to expire.

### Shopping Lists
The app automatically identifies missing ingredients from recipes and adds them to your shopping list. You can:
- Check off items as you shop
- See estimated costs
- Export to text or CSV
- Share with others
- Print your list

### Favorites
Save recipes you like and track how many times you've made them.

### Nutrition Tracking
Monitor your daily calorie intake and see nutritional breakdowns for each recipe.

### Dietary Filters
Filter recipes by dietary preferences: vegetarian, vegan, keto, or gluten-free.

## Tech Stack

**Frontend:**
- React with TypeScript
- Vite
- Local storage for data persistence

**Backend:**
- FastAPI (Python)
- OpenAI GPT-3.5-turbo for recipe generation
- Supabase (planned for future releases)

**Deployment:**
- Frontend: Vercel
- Backend: Render

## Installation

### Prerequisites
- Node.js 16 or higher
- Python 3.8+
- OpenAI API key

### Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
echo "OPENAI_API_KEY=your-api-key-here" > .env

# Start the server
uvicorn app.main:app --reload
```

Backend runs at `http://localhost:8000`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs at `http://localhost:5173`

## Environment Variables

**Backend (.env):**
```
OPENAI_API_KEY=your-openai-api-key
```

**Frontend (.env.local):**
```
VITE_API_URL=http://localhost:8000
```

## Usage

1. Add ingredients you have available or search for a specific recipe
2. Select dietary preferences if needed
3. Adjust serving size
4. Generate recipes
5. View detailed recipe information including nutrition facts
6. Add missing ingredients to your shopping list
7. Save favorite recipes for later

## Project Structure

```
grocery-genius/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── routers/
│   │   │   ├── recipes.py
│   │   │   ├── pantry.py
│   │   │   └── shopping.py
│   │   └── services/
│   │       ├── openai_client.py
│   │       └── recipe_parser.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   └── lib/
│   └── package.json
└── README.md
```

## Roadmap

**Current Features:**
- Recipe generation with AI
- Pantry tracking
- Shopping list management
- Nutrition information and health grading
- Favorite recipes

**Planned Features:**
- User authentication and cloud data sync
- Ingredient substitution suggestions
- Weekly meal calendar
- Recipe image generation
- Barcode scanner for pantry items
- Community recipe sharing
- Meal prep planning


## Acknowledgments

Built with OpenAI's GPT-3.5-turbo API for intelligent recipe generation and FastAPI for the backend infrastructure.