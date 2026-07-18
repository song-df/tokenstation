#!/usr/bin/env python3
"""Fix inclusionai/ling-2.6-flash pricing"""
import json, sqlite3
conn = sqlite3.connect("/opt/newapi/data/data.db")
cur = conn.execute("SELECT value FROM options WHERE key='ModelRatio'")
mr = json.loads(cur.fetchone()[0])
cur = conn.execute("SELECT value FROM options WHERE key='CompletionRatio'")
cr = json.loads(cur.fetchone()[0])
mr["inclusionai/ling-2.6-flash"] = 0.4
cr["inclusionai/ling-2.6-flash"] = 3
conn.execute("UPDATE options SET value=json.dumps(mr) WHERE key='ModelRatio'")
conn.execute("UPDATE options SET value=json.dumps(cr) WHERE key='CompletionRatio'")
conn.commit()
print("Added: inclusionai/ling-2.6-flash MR=0.4 CR=3")
conn.close()