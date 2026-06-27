#!/usr/bin/env python3
"""Sync top 5 free models from OpenRouter to new-api weekly."""
import json, sqlite3, sys, urllib.request, time
from datetime import datetime

NEWAPI_DB = "/opt/newapi/data/data.db"
OR_URL = "https://openrouter.ai/api/v1/models"
TOP_N = 5

def fetch():
    req = urllib.request.Request(OR_URL, headers={"User-Agent": "TliStation/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())

def top_free(data):
    free = []
    for m in data.get("data", []):
        p = m.get("pricing", {})
        if p.get("prompt") == "0" and p.get("completion") == "0":
            free.append({
                "id": m["id"], "name": m.get("name", m["id"]),
                "ctx": int(m.get("context_length", 0)),
                "desc": m.get("description", ""),
            })
    free.sort(key=lambda x: x["ctx"], reverse=True)
    return free[:TOP_N]

def sync(models):
    db = sqlite3.connect(NEWAPI_DB)
    now = int(time.time())

    for m in models:
        ex = db.execute("SELECT id FROM models WHERE model_name=? AND deleted_at IS NULL", (m["id"],)).fetchone()
        if ex:
            db.execute("UPDATE models SET description=?, updated_time=? WHERE id=?", (m["desc"], now, ex[0]))
        else:
            db.execute("INSERT INTO models(model_name,description,status,sync_official,created_time,updated_time) VALUES(?,?,1,0,?,?)",
                       (m["id"], m["desc"], now, now))

    ch = db.execute("SELECT id,models FROM channels WHERE name='OpenRouter' AND status=1").fetchone()
    if ch:
        em = set(ch[1].split(",")) if ch[1] else set()
        for m in models:
            em.add(m["id"])
        db.execute("UPDATE channels SET models=? WHERE id=?", (",".join(sorted(em)), ch[0]))

    for key in ("ModelRatio", "CompletionRatio"):
        row = db.execute("SELECT value FROM options WHERE key=?", (key,)).fetchone()
        d = json.loads(row[0]) if row else {}
        for m in models:
            d[m["id"]] = 0 if key == "ModelRatio" else 1
        db.execute("UPDATE options SET value=? WHERE key=?", (json.dumps(d, ensure_ascii=False), key))

    db.commit(); db.close()
    return len(models)

def main():
    print(f"[sync_free_models] {datetime.now().isoformat()}")
    try:
        data = fetch()
        top = top_free(data)
        print(f"  Total: {len(data.get('data',[]))}  Free: {sum(1 for m in data.get('data',[]) if m.get('pricing',{}).get('prompt')=='0')}")
        print(f"  Synced {TOP_N}:")
        for m in top:
            print(f"    {m['name']} ({m['id']}) ctx={m['ctx']}")
        print(f"  Done: {sync(top)} models")
    except Exception as e:
        print(f"  ERROR: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
