-- 1. Überprüfen der aktuellen Constraint
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conname = 'users_role_check';

-- 2. Aktuelle users-Tabelle anzeigen
\d users;

-- 3. Constraint löschen (falls vorhanden)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- 4. Neue Constraint mit korrekten Rollen erstellen
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role IN ('anbieter', 'schulleiter', 'lehrer', 'admin', 'teacher', 'principal', 'provider'));

-- 5. Alternativ: Constraint komplett entfernen (falls Sie flexibel sein möchten)
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- 6. Überprüfen ob die Constraint korrekt gesetzt wurde
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conname = 'users_role_check';
