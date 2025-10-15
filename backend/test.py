import httpx
import os
from dotenv import load_dotenv

# Load your .env file
load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")

print(f"Testing API key: {api_key[:20]}..." if api_key else "❌ NO API KEY FOUND")

# Test the API
headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

payload = {
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Hello!"}],
    "max_tokens": 10
}

try:
    with httpx.Client() as client:
        response = client.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=30.0
        )
        
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        print("✅ API KEY WORKS!")
        print(response.json())
    else:
        print("❌ API KEY FAILED!")
        print(response.text)
        
except Exception as e:
    print(f"❌ ERROR: {e}")