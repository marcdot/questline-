#!/usr/bin/env python3
"""Questline Backend Phase A — Verification Script
Reads keys from ./keys.json (not committed).
"""
import json, urllib.request, uuid, sys
from urllib.error import HTTPError

try:
    with open("C:/Users/Cutom/Desktop/app/questline/keys.json") as f:
        k = json.load(f)
except FileNotFoundError:
    print("❌ keys.json not found")
    sys.exit(1)

URL = k["url"]
SRV_KEY = k["service_role"]
ANON_KEY = k["anon"]

def sup(method, path, body=None, key=SRV_KEY):
    req = urllib.request.Request(f"{URL}{path}")
    req.add_header("apikey", key)
    req.add_header("Authorization", f"Bearer {key}")
    req.add_header("Content-Type", "application/json")
    req.method = method
    data = json.dumps(body).encode() if body else None
    try:
        resp = urllib.request.urlopen(req, data=data, timeout=10)
        text = resp.read().decode()
        return resp.status, json.loads(text) if text else []
    except HTTPError as e:
        return e.code, json.loads(e.read().decode())
    except Exception as e:
        return 0, str(e)

results = {"rls_anon": False, "rls_cross": False, "idempotent": False, "test_vector_8": False}
uid_a = uid_b = None

# 1. Create test users
print("### 1. CREATE TEST USERS ###")
for email in ["test_a@questline.dev", "test_b@questline.dev"]:
    status, data = sup("POST", "/auth/v1/admin/users", {
        "email": email, "password": "password123", "email_confirm": True
    })
    print(f"  {email}: HTTP {status}", end="")
    if status in (200, 201):
        uid = data.get("id")
        print(f" → ID: {uid}")
        if "test_a" in email: uid_a = uid
        else: uid_b = uid
    else:
        msg = json.dumps(data)[:100]
        print(f" → {msg}")

# 2. Check profiles
print("\n### 2. USER PROFILES ###")
status, data = sup("GET", "/rest/v1/user_profile")
print(f"  Found {len(data) if isinstance(data,list) else data} profiles")
for u in (data if isinstance(data, list) else []):
    e = u.get("email","")
    print(f"    {u['id'][:8]}...: {e}")
    if e == "test_a@questline.dev": uid_a = u['id']
    elif e == "test_b@questline.dev": uid_b = u['id']

if not uid_a:
    print("❌ No User A — aborting")
    sys.exit(1)

# 3. Create test data for A
print("\n### 3. TEST DATA ###")
h_id = str(uuid.uuid4())
q_id = str(uuid.uuid4())
ins_id = str(uuid.uuid4())
ev_id = str(uuid.uuid4())

for tbl, rec in [
    ("habit", {"id": h_id, "user_id": uid_a, "name": "Run", "color": "#E8743B", "sort_order": 0}),
    ("quest", {"id": q_id, "user_id": uid_a, "habit_id": h_id, "title": "Go for a run",
               "cadence": "daily", "target_count": 1, "weekdays": '{}', "active_from": "2026-06-10"}),
    ("quest_instance", {"id": ins_id, "user_id": uid_a, "quest_id": q_id,
                        "period_key": "2026-06-10", "progress": 0, "target_count": 1}),
]:
    s, d = sup("POST", f"/rest/v1/{tbl}", rec)
    print(f"  {tbl}: HTTP {s}")

# 4. RLS: anon (no auth) should not see data
print("\n### 4. RLS — ANON (no auth) ###")
s, d = sup("GET", f"/rest/v1/habit?id=eq.{h_id}", key=ANON_KEY)
results["rls_anon"] = s == 200 and len(d) == 0
print(f"  Anon reads habit: {len(d)} rows → {'✅' if results['rls_anon'] else '❌'}")

# 5. RLS: User B should not read User A's data
print("\n### 5. RLS — CROSS-USER ###")
s, auth = sup("POST", "/auth/v1/token?grant_type=password", 
              {"email": "test_b@questline.dev", "password": "password123"}, key=ANON_KEY)
if s == 200:
    token_b = auth["access_token"]
    print(f"  User B token: {token_b[:20]}...")
    # Read A's habit
    req = urllib.request.Request(f"{URL}/rest/v1/habit?id=eq.{h_id}")
    req.add_header("apikey", ANON_KEY)
    req.add_header("Authorization", f"Bearer {token_b}")
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        d = json.loads(resp.read().decode())
        print(f"  B reads A's habit: {len(d)} rows → {'✅ PASS' if len(d)==0 else '❌ FAIL'}")
        results["rls_cross"] = len(d) == 0
    except HTTPError as e:
        print(f"  B reads A's habit: HTTP {e.code} → ✅ PASS")
        results["rls_cross"] = True
    # Write to A's habit
    try:
        req2 = urllib.request.Request(f"{URL}/rest/v1/habit?id=eq.{h_id}",
            data=json.dumps({"name":"Hacked"}).encode(), method="PATCH")
        req2.add_header("apikey", ANON_KEY)
        req2.add_header("Authorization", f"Bearer {token_b}")
        req2.add_header("Content-Type", "application/json")
        urllib.request.urlopen(req2, timeout=10)
        print(f"  B writes to A's habit: ACCEPTED → ❌ FAIL")
        results["rls_cross"] = False
    except HTTPError as e:
        print(f"  B writes to A's habit: HTTP {e.code} → ✅ PASS")
else:
    print(f"  Sign in B failed: HTTP {s} {json.dumps(auth)[:100]}")

# 6. apply_quest_event idempotency
print("\n### 6. IDEMPOTENCY ###")
ev_id2 = str(uuid.uuid4())
s, d = sup("POST", "/rest/rpc/apply_quest_event",
           {"p_event_id": ev_id2, "p_instance_id": ins_id, "p_kind": "increment", "p_delta": 1})
print(f"  First call: applied={d.get('applied')}, xp={d.get('xp_granted')}")

s, d2 = sup("POST", "/rest/rpc/apply_quest_event",
            {"p_event_id": ev_id2, "p_instance_id": ins_id, "p_kind": "increment", "p_delta": 1})
results["idempotent"] = d2.get("applied") == False and d2.get("xp_granted") == 0
print(f"  Second call: applied={d2.get('applied')}, xp={d2.get('xp_granted')} → {'✅' if results['idempotent'] else '❌'}")

# 7. docs/05 §8 test vector
print("\n### 7. §8 TEST VECTOR ###")
wq_id = str(uuid.uuid4())
mon_i = str(uuid.uuid4())
wed_i = str(uuid.uuid4())

s, d = sup("POST", "/rest/v1/quest", {
    "id": wq_id, "user_id": uid_a, "habit_id": h_id,
    "title": "Run", "cadence": "weekly", "target_count": 1,
    "weekdays": "{mon,wed,fri}", "active_from": "2026-06-08"
})
print(f"  Create weekly quest: HTTP {s}")

sup("POST", "/rest/rpc/generate_child_quests", {"p_quest_id": wq_id})
s, children = sup("GET", f"/rest/v1/quest?generated_parent_id=eq.{wq_id}")
print(f"  Children: {len(children) if isinstance(children,list) else children}")

mon_cid = wed_cid = None
for c in (children if isinstance(children,list) else []):
    wds = c.get("weekdays","")
    if isinstance(wds,str): wds = [w.strip() for w in wds.strip("{}").split(",")] if wds.strip("{}") else []
    print(f"    child {c['id'][:8]}... weekdays={wds}")
    if "mon" in wds: mon_cid = c["id"]
    if "wed" in wds: wed_cid = c["id"]

if mon_cid:
    sup("POST", "/rest/v1/quest_instance",
        {"id": mon_i, "user_id": uid_a, "quest_id": mon_cid,
         "period_key": "2026-06-08", "progress": 0, "target_count": 1})
if wed_cid:
    sup("POST", "/rest/v1/quest_instance",
        {"id": wed_i, "user_id": uid_a, "quest_id": wed_cid,
         "period_key": "2026-06-10", "progress": 0, "target_count": 1})

# Complete Mon
me = str(uuid.uuid4())
s, d = sup("POST", "/rest/rpc/apply_quest_event",
           {"p_event_id": me, "p_instance_id": mon_i, "p_kind": "increment", "p_delta": 1})
print(f"  Mon done: streak={d.get('streak_after')}")

# Complete Wed
we = str(uuid.uuid4())
s, d = sup("POST", "/rest/rpc/apply_quest_event",
           {"p_event_id": we, "p_instance_id": wed_i, "p_kind": "increment", "p_delta": 1})
xp = d.get("xp_granted", 0)
st = d.get("streak_after", 0)
results["test_vector_8"] = (xp == 14 and st == 2)
print(f"  Wed done: xp={xp}, streak={st}  (expected: xp=14, streak=2)")
print(f"  {'✅ PASS' if results['test_vector_8'] else '❌ FAIL'}")

# SUMMARY
print("\n" + "═" * 50)
print("VERIFICATION RESULTS")
print("═" * 50)
all_pass = all(results.values())
for k, v in results.items():
    print(f"  {k:<20} {'✅' if v else '❌'}")
print(f"\n  ALL PASS: {'✅ YES' if all_pass else '❌ NO'}")
