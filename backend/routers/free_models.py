"""Public endpoint: list current free models."""
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

    # Get free model IDs from options
    ratio_row = conn.execute("SELECT value FROM options WHERE key='ModelRatio'").fetchone()
    free_ids = set()
    if ratio_row:
        ratio = json.loads(ratio_row[0])
        free_ids = {k for k, v in ratio.items() if v == 0}

    if not free_ids:
        conn.close()
        return []

    # Get model details
    placeholders = ",".join("?" for _ in free_ids)
    rows = conn.execute(
        f"SELECT model_name, description FROM models WHERE model_name IN ({placeholders}) AND deleted_at IS NULL AND status=1",
        list(free_ids),
    ).fetchall()

    conn.close()
    return [{"id": r["model_name"], "name": r["model_name"].split("/")[-1], "description": r["description"]} for r in rows]
