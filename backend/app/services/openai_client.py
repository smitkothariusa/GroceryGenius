# backend/app/services/openai_client.py
import os
import httpx
from dotenv import load_dotenv

load_dotenv()
OPENAI_API_KEY=os.getenv("OPENAI_API_KEY")
print(f"🔑 API Key loaded: {'✅ Found' if OPENAI_API_KEY else '❌ Missing'}")
print(f"🔑 Key starts with: {OPENAI_API_KEY[:10]}..." if OPENAI_API_KEY else "🔑 Key is None/empty")
 
OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions"
MODEL = "gpt-3.5-turbo"  # change if you have access to other models

async def call_chat_completion(system_prompt: str, user_prompt: str, max_tokens: int = 600, temperature: float = 0.7):
    """
    Call the OpenAI Chat Completions HTTP API and return the assistant's content as text.
    """
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
        "n": 1
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.post(OPENAI_CHAT_URL, headers=headers, json=payload)
        r.raise_for_status()
        resp = r.json()
        # safe extraction
        choices = resp.get("choices", [])
        if not choices:
            return ""
        return choices[0].get("message", {}).get("content", "").strip()
