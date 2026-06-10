import json, urllib.request, ssl
from urllib.error import HTTPError

with open("C:/Users/Cutom/Desktop/app/questline/keys.json") as f:
    k = json.load(f)
URL = k["url"]
SRV = k["service_role"]
ctx = ssl.create_default_context()

# Test 1: POST with bare minimum headers
data = json.dumps({"c": "daily", "d": "2026-06-10"}).encode()
req = urllib.request.Request(f"{URL}/rest/rpc/period_key_for", data=data, method="POST")
req.add_header("apikey", SRV)
req.add_header("Authorization", f"Bearer {SRV}")
req.add_header("Content-Type", "application/json")
try:
    resp = urllib.request.urlopen(req, context=ctx, timeout=10)
    print(f"Test 1 (POST, 3 headers): HTTP {resp.status} -> {resp.read().decode()}")
except HTTPError as e:
    print(f"Test 1: HTTP {e.code} -> {e.read().decode()[:200]}")

# Test 2: POST with Accept header too
req2 = urllib.request.Request(f"{URL}/rest/rpc/period_key_for", data=data, method="POST")
req2.add_header("apikey", SRV)
req2.add_header("Authorization", f"Bearer {SRV}")
req2.add_header("Content-Type", "application/json")
req2.add_header("Accept", "application/json")
try:
    resp2 = urllib.request.urlopen(req2, context=ctx, timeout=10)
    print(f"Test 2 (+ Accept): HTTP {resp2.status} -> {resp2.read().decode()}")
except HTTPError as e:
    print(f"Test 2: HTTP {e.code} -> {e.read().decode()[:200]}")

# Test 3: POST with Prefer header  
req3 = urllib.request.Request(f"{URL}/rest/rpc/period_key_for", data=data, method="POST")
req3.add_header("apikey", SRV)
req3.add_header("Authorization", f"Bearer {SRV}")
req3.add_header("Content-Type", "application/json")
req3.add_header("Prefer", "params=single-object")
try:
    resp3 = urllib.request.urlopen(req3, context=ctx, timeout=10)
    print(f"Test 3 (+ Prefer): HTTP {resp3.status} -> {resp3.read().decode()}")
except HTTPError as e:
    print(f"Test 3: HTTP {e.code} -> {e.read().decode()[:200]}")

# Test 4: GET with query params
req4 = urllib.request.Request(f"{URL}/rest/v1/rpc/period_key_for?c=daily&d=2026-06-10")
req4.add_header("apikey", SRV)
req4.add_header("Authorization", f"Bearer {SRV}")
try:
    resp4 = urllib.request.urlopen(req4, context=ctx, timeout=10)
    print(f"Test 4 (GET): HTTP {resp4.status} -> {resp4.read().decode()}")
except HTTPError as e:
    print(f"Test 4: HTTP {e.code} -> {e.read().decode()[:200]}")
