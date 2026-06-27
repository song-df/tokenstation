"""Public endpoints: list free models and model pricing."""
from __future__ import annotations
import json
from fastapi import APIRouter
from services.proxy import NEWAPI_DB_PATH

router = APIRouter(tags=["free-models"])


@router.get("/api/public/free-models")
async def free_models():
    """Return current free models from new-api ModelRatio (ratio=0)."""
    import sqlite3
    conn = sqlite3.connect(f"file:{NEWAPI_DB_PATH}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    ratio_row = conn.execute("SELECT value FROM options WHERE key='ModelRatio'").fetchone()
    free_ids = set()
    if ratio_row:
        ratio = json.loads(ratio_row[0])
        free_ids = {k for k, v in ratio.items() if v == 0}
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



@router.get("/api/public/model-prices")
async def model_prices():
    """Return ModelRatio values for all active models (for frontend pricing)."""
    import sqlite3
    conn = sqlite3.connect(f"file:{NEWAPI_DB_PATH}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    ratio_row = conn.execute("SELECT value FROM options WHERE key='ModelRatio'").fetchone()
    prices = {}
    if ratio_row:
        prices = json.loads(ratio_row[0])
    # Get known model names from models table
    known = set()
    for r in conn.execute("SELECT model_name FROM models WHERE deleted_at IS NULL AND status=1"):
        known.add(r["model_name"])
    conn.close()
    # Only return prices for models that exist in the models table
    return {k: v for k, v in prices.items() if k in known}
