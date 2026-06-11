-- Reset passwords for test accounts (P7 security cleanup)
-- Old passwords were exposed in chat; these are fresh random passwords.

update auth.users 
set encrypted_password = crypt('oo1$KD@p%o4gn0Zu4a0I', gen_salt('bf'))
where email = 'marc@questline.test';

update auth.users 
set encrypted_password = crypt('oo1$KD@p%o4gn0Zu4a0I', gen_salt('bf'))
where email = 'lead-feelcheck-p3@questline.test';

-- Verify:
-- select id, email from auth.users where email like '%@questline.test';
