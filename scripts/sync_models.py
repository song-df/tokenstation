#!/usr/bin/env python3
"""Sync top free models + top 3 paid models per provider from OpenRouter weekly."""
import json, sqlite3, sys, urllib.request, time
from collections import defaultdict
from datetime import datetime

NEWAPI_DB = "/opt/newapi/data/data.db"
OR_URL = "https://openrouter.ai/api/v1/models"
TOP_FREE = 5
TOP_PER_PROVIDER = 3

def fetch():
    req = urllib.request.Request(OR_URL, headers={"User-Agent": "TliStation/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())

def parse(data):
    free, paid = [], []
    for m in data.get("data", []):
        p = m.get("pricing", {})
        pp = float(p.get("prompt", 0))
        cp = float(p.get("completion", 0))
        price_1m = (pp + cp) / 2 * 1_000_000
        entry = {
            "id": m["id"], "name": m.get("name", m["id"]),
            "ctx": int(m.get("context_length", 0)),
            "desc": m.get("description", ""),
            "price_1m": price_1m,
        }
        if pp == 0 and cp == 0:
            free.append(entry)
        elif price_1m > 0:
            paid.append(entry)
    free.sort(key=lambda x: x["ctx"], reverse=True)

    # Group paid by provider, keep top N per provider
    by_prov = defaultdict(list)
    for entry in paid:
        prov = entry["id"].split("/")[0] if "/" in entry["id"] else "other"
        by_prov[prov].append(entry)
    paid_top = []
    for prov_entries in by_prov.values():
        prov_entries.sort(key=lambda x: x["id"], reverse=True)  # newest first
        paid_top.extend(prov_entries[:TOP_PER_PROVIDER])

    return free[:TOP_FREE], paid_top

def main():
    print(f"[sync_models] {datetime.now().isoformat()}")
    try:
        data = fetch()
        free, paid = parse(data)
        selected = free + paid
        print(f"  Total: {len(data.get('data',[]))}, Free top {len(free)}, Paid top {len(paid)}")
        for m in free:
            print(f"    FREE {m['name']} ({m['id']})")
        print(f"  Paid by provider:")
        counts = defaultdict(int)
        for m in paid:
            prov = m["id"].split("/")[0]
            counts[prov] += 1
        for prov in sorted(counts):
            print(f"    {prov}: {counts[prov]}")

        db = sqlite3.connect(NEWAPI_DB)
        now = int(time.time())

        # Models table — update existing, insert new
        for m in selected:
            ex = db.execute("SELECT id FROM models WHERE model_name=? AND deleted_at IS NULL", (m["id"],)).fetchone()
            if ex:
                db.execute("UPDATE models SET description=?, updated_time=? WHERE id=?", (m["desc"], now, ex[0]))
            else:
                db.execute("INSERT INTO models(model_name,description,status,sync_official,created_time,updated_time) VALUES(?,?,1,0,?,?)", (m["id"], m["desc"], now, now))

        # Channel
        ch = db.execute("SELECT id,models FROM channels WHERE name='OpenRouter' AND status=1").fetchone()
        if ch:
            em = set(ch[1].split(",")) if ch[1] else set()
            for m in selected:
                em.add(m["id"])
            db.execute("UPDATE channels SET models=? WHERE id=?", (",".join(sorted(em)), ch[0]))

            # ModelMapping
            mm_row = db.execute("SELECT model_mapping FROM channels WHERE id=?", (ch[0],)).fetchone()
            mapping = json.loads(mm_row[0]) if mm_row and mm_row[0] else {}
            for m in selected:
                if m["id"] not in mapping:
                    mapping[m["id"]] = m["id"]
            db.execute("UPDATE channels SET model_mapping=? WHERE id=?", (json.dumps(mapping, ensure_ascii=False), ch[0]))

        # ModelRatio
        row = db.execute("SELECT value FROM options WHERE key='ModelRatio'").fetchone()
        ratio = json.loads(row[0]) if row else {}
        row2 = db.execute("SELECT value FROM options WHERE key='CompletionRatio'").fetchone()
        comp = json.loads(row2[0]) if row2 else {}
        for m in free:
            ratio[m["id"]] = 0
            comp[m["id"]] = 1
        for m in paid:
            ratio[m["id"]] = max(0.01, round(m["price_1m"] / 1.4, 4))
            comp[m["id"]] = 1
        db.execute("UPDATE options SET value=? WHERE key='ModelRatio'", (json.dumps(ratio, ensure_ascii=False),))
        db.execute("UPDATE options SET value=? WHERE key='CompletionRatio'", (json.dumps(comp, ensure_ascii=False),))

        db.commit(); db.close()
        print(f"  Done: {len(selected)} models synced")
    except Exception as e:
        print(f"  ERROR: {e}", file=sys.stderr)
        import traceback; traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
