# backend/app/services/openai_client.py
import asyncio
import logging
import os
import time

import httpx
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
# Never log any part of the key itself — logs are retained by the host.
if not OPENAI_API_KEY:
    logger.warning("OPENAI_API_KEY not configured - AI endpoints will fail")

OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions"
MODEL = "gpt-4o-mini"  # Better at math and calculations

# USD per 1M tokens (input, output) — OpenAI list prices as of 2026-07.
MODEL_PRICES_PER_1M = {
    "gpt-4o-mini": (0.15, 0.60),
    "gpt-4o": (2.50, 10.00),
}

TIMEOUT = httpx.Timeout(connect=10.0, read=90.0, write=30.0, pool=10.0)
MAX_RETRIES = 2  # retries after the first attempt
RETRY_BACKOFF_SECONDS = 1.0
RETRY_STATUS_CODES = {429, 500, 502, 503, 504}


def estimate_cost_usd(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    """Estimate cost from the price table; dated model names match their base entry."""
    prices = None
    for base in sorted(MODEL_PRICES_PER_1M, key=len, reverse=True):
        if model == base or model.startswith(base + "-"):
            prices = MODEL_PRICES_PER_1M[base]
            break
    if prices is None:
        return 0.0
    return (prompt_tokens * prices[0] + completion_tokens * prices[1]) / 1_000_000


def log_openai_usage(model: str, duration_ms: float, usage, route: str = "") -> None:
    """
    Log one INFO line per OpenAI call: model, latency, tokens, estimated cost, calling route.
    `usage` may be a dict (HTTP API) or an SDK CompletionUsage object.
    `route` identifies the endpoint/call site that triggered the request (e.g. "recipes.generate_recipes").
    """
    if usage is None:
        prompt_tokens = completion_tokens = total_tokens = 0
    elif isinstance(usage, dict):
        prompt_tokens = usage.get("prompt_tokens") or 0
        completion_tokens = usage.get("completion_tokens") or 0
        total_tokens = usage.get("total_tokens") or (prompt_tokens + completion_tokens)
    else:
        prompt_tokens = getattr(usage, "prompt_tokens", 0) or 0
        completion_tokens = getattr(usage, "completion_tokens", 0) or 0
        total_tokens = getattr(usage, "total_tokens", 0) or (prompt_tokens + completion_tokens)

    logger.info(
        "openai call route=%s model=%s duration_ms=%.0f prompt_tokens=%d completion_tokens=%d "
        "total_tokens=%d est_cost_usd=%.6f",
        route or "-", model, duration_ms, prompt_tokens, completion_tokens, total_tokens,
        estimate_cost_usd(model, prompt_tokens, completion_tokens),
    )


async def _post_with_retry(payload: dict) -> dict:
    """POST to the chat completions API, retrying connect errors, timeouts, 429 and 5xx."""
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }
    for attempt in range(MAX_RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT) as client:
                r = await client.post(OPENAI_CHAT_URL, headers=headers, json=payload)
            if r.status_code in RETRY_STATUS_CODES and attempt < MAX_RETRIES:
                logger.warning(
                    "OpenAI HTTP %d, retrying (attempt %d/%d)",
                    r.status_code, attempt + 1, MAX_RETRIES,
                )
                await asyncio.sleep(RETRY_BACKOFF_SECONDS * (2 ** attempt))
                continue
            r.raise_for_status()
            return r.json()
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            if attempt >= MAX_RETRIES:
                raise
            logger.warning(
                "OpenAI request failed (%s: %s), retrying (attempt %d/%d)",
                type(exc).__name__, exc, attempt + 1, MAX_RETRIES,
            )
            await asyncio.sleep(RETRY_BACKOFF_SECONDS * (2 ** attempt))
    raise RuntimeError("unreachable")  # loop always returns or raises


async def call_chat_completion(system_prompt: str, user_prompt: str, max_tokens: int = 600, temperature: float = 0.7, route: str = ""):
    """
    Call the OpenAI Chat Completions HTTP API and return the assistant's content as text.
    `route` identifies the calling endpoint, for cost/usage logging (e.g. "recipes.generate_recipes").
    """
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

    start = time.perf_counter()
    resp = await _post_with_retry(payload)
    duration_ms = (time.perf_counter() - start) * 1000
    log_openai_usage(resp.get("model", MODEL), duration_ms, resp.get("usage"), route=route)

    # safe extraction
    choices = resp.get("choices", [])
    if not choices:
        return ""
    return choices[0].get("message", {}).get("content", "").strip()
