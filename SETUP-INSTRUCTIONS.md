# GroceryGenius Setup Instructions

## 🚀 Quick Start

### 1. Set up Backend
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt

# IMPORTANT: Edit backend\.env and add your real OpenAI API key!
# Replace 'your_actual_openai_api_key_here' with your actual key

python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

### 2. Set up Frontend (in new terminal)
cd frontend
npm install
npm run dev

### 3. Open your browser
Go to: http://localhost:5173

## 🎯 Test the app
1. Type ingredients like 'tomato', 'cheese', 'basil' (press Enter after each)
2. Select dietary preference (optional)
3. Click 'Get Recipes' button
4. Watch AI generate amazing recipes!

Enjoy your AI-powered cooking assistant! 🍳
