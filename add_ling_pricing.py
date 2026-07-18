#!/usr/bin/env python3
import json, sqlite3
conn = sqlite3.connect("/opt/newapi/data/data.db")
mr = json.loads(conn.execute("SELECT value FROM options WHERE key='ModelRatio'").fetchone()[0])
cr = json.loads(conn.execute("SELECT value FROM options WHERE key='CompletionRatio'").fetchone()[0])
mr["inclusionai/ling-2.6-flash"] = 0.4
cr["inclusionai/ling-2.6-flash"] = 3
conn.execute("UPDATE options SET value=json.dumps(mr) WHERE key='ModelRatio'")
conn.execute("UPDATE options SET value=json.dumps(cr) WHERE key='CompletionRatio'")
conn.commit()
print("Done: inclusionai/ling-2.6-flash pricing added")
conn.close()