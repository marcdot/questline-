#!/bin/bash
URL="https://oovismpmhcmytforydfe.supabase.co"
SRV="eyJhbG...eMQc"
ANON="eyJhbG...2fg8"

echo "=== AUTH ADMIN API ==="
RESULT=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$URL/auth/v1/admin/users" \
  -H "apikey: $SRV" \
  -H "Authorization: Bearer *** \
  -H "Content-Type: application/json" \
  -d '{"email":"test_a@questline.dev","password":"password123","email_confirm":true}')
echo "$RESULT"

echo ""
echo "=== REST API ==="
RESULT=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$URL/rest/v1/user_profile" \
  -H "apikey: $SRV" \
  -H "Authorization: Bearer ***")
echo "$RESULT"
