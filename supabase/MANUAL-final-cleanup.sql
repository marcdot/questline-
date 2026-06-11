-- ⚠️ MANUAL ONLY — DO NOT PLACE IN migrations/ (it would auto-run and nuke test accounts).
-- Run this by hand ONLY at FINAL acceptance, AFTER P7 QA + the iP3 device session are done.
-- The lead still needs marc@questline.test + lead-feelcheck-p3@questline.test for live verification.
-- Delete test accounts (P7 cleanup — cascade deletes all their data)
-- marc@questline.test
delete from auth.users where email = 'marc@questline.test';
-- lead-feelcheck-p3@questline.test  
delete from auth.users where email = 'lead-feelcheck-p3@questline.test';
