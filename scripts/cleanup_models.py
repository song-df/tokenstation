#!/usr/bin/env python3
"""Clean up: keep only top 3 paid models per provider + 5 free models from OpenRouter."""
import json, sqlite3, re
from collections import defaultdict

NEWAPI_DB = "/opt/newapi/data/data.db"
KEEP_FREE = 5

db = sqlite3.connect(NEWAPI_DB)

# Get all models from models table that look like OpenRouter models (contain /)
all_models = db.execute(
    "SELECT model_name FROM models WHERE deleted_at IS NULL AND model_name LIKE '%/%'"
).fetchall()
all_names = {r[0] for r in all_models}
print(f"Total OpenRouter-style models in DB: {len(all_names)}")

# Get ModelRatio for pricing info
ratio_row = db.execute("SELECT value FROM options WHERE key='ModelRatio'").fetchone()
ratios = json.loads(ratio_row[0]) if ratio_row else {}

# Separate free vs paid
free_models = {k for k, v in ratios.items() if v == 0 and k in all_names}
paid_models = {k for k in all_names if k not in free_models}

print(f"Free: {len(free_models)}, Paid: {len(paid_models)}")

# Sort free by context (keep top 5)
free_with_ctx = []
for m in free_models:
    # ctx not in ratios, check from models table or skip
    free_with_ctx.append(m)
free_keep = set(list(free_with_ctx)[:KEEP_FREE])

# Group paid by provider (text before /)
providers = defaultdict(list)
for m in paid_models:
    parts = m.split("/", 1)
    if len(parts) == 2:
        providers[parts[0]].append(m)

# Keep top 3 per provider (sorted by model name as proxy for newest)
paid_keep = set()
for prov, models in sorted(providers.items()):
    # Sort by model name descending (usually newer = later in name)
    models.sort(reverse=True)
    paid_keep.update(models[:3])
    if len(models) > 3:
        print(f"  {prov}: keeping {models[:3]}, dropping {len(models)-3}")

all_keep = free_keep | paid_keep
all_drop = all_names - all_keep

print(f"\nKeep: {len(all_keep)} (free={len(free_keep)}, paid={len(paid_keep)})")
print(f"Drop: {len(all_drop)}")

if not all_drop:
    print("Nothing to clean up.")
    db.close()
    exit()

# Clean up models table (soft delete)
for m in all_drop:
    db.execute("UPDATE models SET deleted_at=datetime('now') WHERE model_name=? AND deleted_at IS NULL", (m,))

# Clean up channel models
ch = db.execute("SELECT id, models FROM channels WHERE name='OpenRouter' AND status=1").fetchone()
if ch:
    channel_models = set(ch[1].split(",")) if ch[1] else set()
    channel_models = channel_models - all_drop
    db.execute("UPDATE channels SET models=? WHERE id=?", (",".join(sorted(channel_models)), ch[0]))
    print(f"Channel models: {len(channel_models)}")

# Clean up model_mapping
mm_row = db.execute("SELECT model_mapping FROM channels WHERE id=?", (ch[0],)).fetchone()
mapping = json.loads(mm_row[0]) if mm_row and mm_row[0] else {}
for m in all_drop:
    mapping.pop(m, None)
db.execute("UPDATE channels SET model_mapping=? WHERE id=?", (json.dumps(mapping, ensure_ascii=False), ch[0]))
print(f"ModelMapping: {len(mapping)}")

# Clean up ModelRatio
for m in all_drop:
    ratios.pop(m, None)
db.execute("UPDATE options SET value=? WHERE key='ModelRatio'", (json.dumps(ratios, ensure_ascii=False),))

# Clean up CompletionRatio
comp_row = db.execute("SELECT value FROM options WHERE key='CompletionRatio'").fetchone()
comp = json.loads(comp_row[0]) if comp_row else {}
for m in all_drop:
    comp.pop(m, None)
db.execute("UPDATE options SET value=? WHERE key='CompletionRatio'", (json.dumps(comp, ensure_ascii=False),))

db.commit()
db.close()
print(f"\nDone. ModelRatio: {len(ratios)}, CompletionRatio: {len(comp)}")
