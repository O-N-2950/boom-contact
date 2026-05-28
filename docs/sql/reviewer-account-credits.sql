-- ════════════════════════════════════════════════════════════════════════════
-- reviewer-account-credits.sql
--
-- ⚠️ NE PAS EXÉCUTER SANS VALIDATION ⚠️
--
-- Préparation du compte de test Apple App Review / Google Play Review
-- pour boom.contact. Le compte permet aux reviewers de tester le flow
-- sans payer (10 crédits offerts).
--
-- Prérequis avant exécution :
--   1. Backup snapshot PostgreSQL Railway pris dans les 24h.
--   2. Mot de passe reviewer généré + hashé bcrypt cost 12.
--   3. Variable d'env REVIEWER_PASSWORD_HASH disponible (NE PAS COMMITER).
--   4. Validation explicite Olivier sur ce fichier exact.
--   5. Exécution en transaction (BEGIN / COMMIT) pour rollback facile.
--
-- Schéma cible : table `users` (cf. server/src/db/schema.ts) — id varchar(20)
-- primaire, email unique, role varchar(20) défaut 'customer', credits int
-- défaut 0, consent_cgu boolean, verified boolean, token_version int...
--
-- Idempotent : ré-exécutable sans dupliquer ni écraser le mot de passe.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- 1. Vérifier l'environnement (commenter si non applicable)
SELECT current_database() AS env_check_db,
       inet_server_addr() AS env_check_host,
       NOW()              AS exec_at;

-- 2. Créer ou mettre à jour le compte reviewer
--    NOTE : remplacer 'REPLACE_WITH_BCRYPT_HASH' par le hash bcrypt généré
--           AVANT exécution. Ne pas commiter de hash réel dans ce fichier.
INSERT INTO users (
    id,
    email,
    password_hash,
    role,
    credits,
    consent_cgu,
    consent_cgu_at,
    consent_marketing,
    country,
    language,
    first_name,
    last_name,
    verified,
    token_version,
    created_at
)
VALUES (
    -- id : 20 chars max ; on prend une convention lisible
    'reviewer_apple_play',
    'reviewer@boom.contact',
    'REPLACE_WITH_BCRYPT_HASH',   -- ⚠️ remplacer juste avant exécution
    'customer',                    -- pas admin
    10,                            -- 10 crédits offerts
    TRUE,
    NOW(),
    FALSE,
    'CH',
    'fr',
    'App',
    'Reviewer',
    TRUE,                          -- skip flow vérif email
    0,
    NOW()
)
ON CONFLICT (email) DO UPDATE SET
    credits           = 10,
    role              = 'customer',
    consent_cgu       = TRUE,
    consent_cgu_at    = COALESCE(EXCLUDED.consent_cgu_at, users.consent_cgu_at),
    verified          = TRUE,
    -- NE PAS écraser le mot de passe s'il a déjà été défini lors d'une
    -- précédente exécution. Mettre à jour uniquement si le hash fourni est
    -- différent de la valeur sentinelle.
    password_hash     = CASE
                          WHEN EXCLUDED.password_hash = 'REPLACE_WITH_BCRYPT_HASH'
                            THEN users.password_hash
                          ELSE EXCLUDED.password_hash
                        END;

-- 3. Vérification immédiate
SELECT id,
       email,
       role,
       credits,
       consent_cgu,
       verified,
       country,
       language,
       token_version,
       (password_hash IS NOT NULL AND password_hash <> 'REPLACE_WITH_BCRYPT_HASH') AS password_set,
       created_at
FROM users
WHERE email = 'reviewer@boom.contact';

-- 4. Vérification d'unicité (sécurité)
SELECT COUNT(*) AS reviewer_rows
FROM users
WHERE email = 'reviewer@boom.contact';
-- attendu : exactement 1

-- 5. Décision finale (Olivier)
--    Si le SELECT précédent montre 1 ligne avec password_set = TRUE et
--    credits = 10, valider avec COMMIT. Sinon ROLLBACK.

-- COMMIT;     -- ← décommenter après validation
ROLLBACK;     -- ← par défaut : ne rien committer

-- ════════════════════════════════════════════════════════════════════════════
-- Rotation / désactivation post-acceptation stores (à exécuter ~3 mois après
-- acceptation et stabilité). Ne pas exécuter avant.
-- ════════════════════════════════════════════════════════════════════════════
--
-- BEGIN;
-- UPDATE users
-- SET credits       = 0,
--     token_version = token_version + 1
-- WHERE email = 'reviewer@boom.contact';
-- COMMIT;
--
-- ════════════════════════════════════════════════════════════════════════════
