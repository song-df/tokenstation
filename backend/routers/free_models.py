"""Public endpoints: model pricing and context."""
from __future__ import annotations
import json
from fastapi import APIRouter
from services.proxy import NEWAPI_DB_PATH

router = APIRouter(tags=["free-models"])

# 平台已知模型的 T粒/1K 输出价格（已含 1.38× 溢价）
PLATFORM_PRICES: dict[str, float] = {
    'deepseek-v4-pro': 0.83,
    'deepseek-v4-flash': 0.28,
    'claude-opus-4-8': 77.68,
    'claude-sonnet-4-6': 46.61,
    'claude-haiku-4-5': 15.54,
    'claude-fable-5': 233.03,
    'gpt-5.5': 93.21,
    'gpt-5.5-pro': 466.07,
    'gpt-5.3-codex': 43.51,
    'gemini-3.5-flash': 27.97,
    'gemini-3.1-pro': 37.27,
    'step-3.7-flash': 3.57,
    'qwen3.7-max': 11.65,
    'glm-5.1': 12.43,
    'glm-5.2': 12.43,
    'kimi-k2.6': 10.6,
    'minimax-m2.5': 2.8,
    'minimax-m3': 6.2,
    'qwen3.5-397b-a17b': 9.33,
}


def _load_ratios():
    import sqlite3
    conn = sqlite3.connect(f"file:{NEWAPI_DB_PATH}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    row = conn.execute("SELECT value FROM options WHERE key='ModelRatio'").fetchone()
    conn.close()
    return json.loads(row[0]) if row else {}


@router.get("/api/public/model-prices")
async def model_prices():
    """Return T粒/1K output prices for all active models."""
    ratios = _load_ratios()
    # Gather all model names from models table
    import sqlite3
    conn = sqlite3.connect(f"file:{NEWAPI_DB_PATH}?mode=ro", uri=True)
    known = {r[0] for r in conn.execute("SELECT model_name FROM models WHERE deleted_at IS NULL AND status=1")}
    conn.close()

    prices = {}
    for name in known:
        if name in PLATFORM_PRICES:
            prices[name] = round(PLATFORM_PRICES[name], 2)
        elif ratios.get(name, 0) == 0:
            prices[name] = 0  # free
        else:
            # OpenRouter model: estimate from ModelRatio
            # Use avg of deepseek-v4-pro (mr=0.2144→0.83) and flash (mr=0.05→0.28)
            # → conversion factor ≈ 4.5
            prices[name] = round(ratios[name] * 4.5, 2)
    return prices


@router.get("/api/public/free-models")
async def free_models():
    """Return current free models from new-api ModelRatio (ratio=0)."""
    import sqlite3
    conn = sqlite3.connect(f"file:{NEWAPI_DB_PATH}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    ratios = _load_ratios()
    free_ids = {k for k, v in ratios.items() if v == 0}
    if not free_ids:
        conn.close()
        return []
    placeholders = ",".join("?" for _ in free_ids)
    rows = conn.execute(
        f"SELECT model_name, description FROM models WHERE model_name IN ({placeholders}) AND deleted_at IS NULL AND status=1",
        list(free_ids),
    ).fetchall()
    conn.close()
    return [{"id": r["model_name"], "name": r["model_name"].split("/")[-1], "description": r["description"]} for r in rows]


@router.get("/api/public/model-context")
async def model_context():
    """Return context_length (max tokens) for all active models."""
    import sqlite3
    conn = sqlite3.connect(f"file:{NEWAPI_DB_PATH}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    row = conn.execute("SELECT value FROM options WHERE key='ModelContextLength'").fetchone()
    conn.close()
    return json.loads(row[0]) if row else {}
