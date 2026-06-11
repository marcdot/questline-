-- Delete test accounts (P7 cleanup — cascade deletes all their data)
-- marc@questline.test
delete from auth.users where email = 'marc@questline.test';
-- lead-feelcheck-p3@questline.test  
delete from auth.users where email = 'lead-feelcheck-p3@questline.test';
