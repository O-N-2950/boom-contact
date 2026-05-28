# Compte reviewer — Apple App Review & Google Play Review

> Préparation du compte de test à fournir aux reviewers Apple et Google.
> Ce document est exploitable directement par Olivier (admin DB).
> Le script SQL est dans `docs/sql/reviewer-account-credits.sql` — **NE PAS EXÉCUTER SANS VALIDATION**.

---

## 1. Objectif

Permettre à un reviewer Apple ou Google de :
1. Se connecter sans avoir à payer.
2. Tester l'intégralité du flow (création de session, QR, photos, voix, signature, génération PDF).
3. Disposer de 10 crédits offerts pour générer des PDFs.
4. Recevoir les emails de confirmation et le PDF.

---

## 2. Paramètres du compte

| Paramètre | Valeur recommandée |
|---|---|
| **Email** | `reviewer@boom.contact` |
| **Mot de passe** | à générer par Olivier (min. 16 caractères, jamais dans le repo) |
| **Rôle** | `customer` (utilisateur standard, pas admin) |
| **Crédits** | `10` |
| **Pays / langue** | `CH` / `fr` (par défaut, ajustable) |
| **Consent CGU** | `true` (à la création) |
| **Consent marketing** | `false` (pas opt-in marketing) |
| **Verified** | `true` (pour skip flow vérif email) |
| **Environnement** | **production** (recommandé — l'app est en prod et les guidelines Apple/Google exigent un compte sur l'environnement servi) |

---

## 3. Méthode d'octroi des crédits

Deux approches possibles :

### Option A — SQL direct (recommandée, exécutable par Olivier)

Script préparé dans `docs/sql/reviewer-account-credits.sql`. Il :
- Crée le compte s'il n'existe pas (idempotent via `ON CONFLICT`).
- Met à jour les crédits à 10 si le compte existe déjà.
- Marque les consents CGU + verified à `true`.
- N'écrase **jamais** un mot de passe existant (mot de passe géré séparément par Olivier).

⚠️ **NE PAS EXÉCUTER** sans avoir :
1. Vérifié l'environnement (production via `DATABASE_URL` Railway).
2. Backup snapshot DB pris dans les 24h.
3. Hashé un mot de passe (bcrypt) et l'avoir prêt en variable d'env ou input.
4. Validé avec Olivier la version finale du script.

### Option B — Endpoint admin (si disponible)

Si le backend expose un endpoint admin protégé pour créer un user avec crédits offerts, l'utiliser. **Non implémenté à ce jour** — le script SQL reste la voie privilégiée.

---

## 4. Génération du mot de passe (sans exécution depuis ce doc)

Côté shell local d'Olivier :

```bash
# Générer un mot de passe aléatoire 24 caractères
PASS=$(openssl rand -base64 18)
echo "Mot de passe reviewer : $PASS"

# Le hacher avec bcrypt cost 12 (cohérent avec le backend)
node -e "console.log(require('bcrypt').hashSync(process.argv[1], 12))" "$PASS"
```

> Stocker le mot de passe en clair **uniquement** dans le champ sécurisé d'App Store Connect / Play Console (et un coffre-fort interne). Le hash bcrypt est ce qui ira en base.

---

## 5. Instructions à donner aux reviewers

Reprises depuis `docs/app-review-instructions.md` :

- **URL test** : https://www.boom.contact/
- **Email** : `reviewer@boom.contact`
- **Mot de passe** : *fourni séparément via App Store Connect / Play Console*
- **Crédits offerts** : 10 (suffisant pour 10 tests avec génération PDF)
- **Données fictives** à utiliser :
  - Conducteur A : `Camille Martin` · `demo.a@boom.contact`
  - Conducteur B : `Luca Rossi` · `participant.b@example.com`
  - Plaques : `VD 000 000` / `VD 000 001`
  - Lieu : `Lausanne, Suisse`
- **Carte Stripe test** (si test paiement supplémentaire) :
  - Numéro : `4242 4242 4242 4242`
  - Date : `12/30` (toute date future)
  - CVC : `123`
- **Bouton urgence** : visible mais **ne pas appeler** les vrais numéros 112 / 144 / 117.

---

## 6. Limitations à signaler aux reviewers

| Limite | Raison |
|---|---|
| Pas de support iPad V1 | Pas optimisé tablette pour V1 |
| Mode hors ligne testable mais limité | Synchronisation requise pour QR multi-appareils |
| Email réel envoyé vers `demo@boom.contact` | Boîte démo Groupe NEUKOMM (peut consulter Olivier) |
| Pas de vrai accident à provoquer | Données fictives garanties (cf. `docs/demo-data-for-screenshots.md`) |

---

## 7. URLs à fournir aux reviewers

| Champ | Valeur |
|---|---|
| Marketing URL | https://www.boom.contact/ |
| Privacy Policy | https://www.boom.contact/privacy |
| Terms of Service | https://www.boom.contact/cgu |
| Support email | `contact@boom.contact` |
| Apple App Review notes | cf. `docs/app-review-instructions.md` § Apple |
| Google Play App Review notes | cf. `docs/app-review-instructions.md` § Google |

---

## 8. Statut

| Item | Statut |
|---|---|
| Spécification du compte (ce doc) | ✅ |
| Script SQL préparé (non exécuté) | ✅ `docs/sql/reviewer-account-credits.sql` |
| Mot de passe généré et stocké | ⏳ à faire par Olivier |
| Compte créé en DB production | ⏳ à exécuter par Olivier après backup + validation |
| Compte testé sur prod | ⏳ après création |
| Identifiants saisis dans App Store Connect | ⏳ au moment de la submission |
| Identifiants saisis dans Play Console | ⏳ au moment de la submission |

---

## 9. Sécurité

- Le mot de passe reviewer n'est **jamais** dans ce repo, ni dans les commits, ni dans les logs.
- Apple et Google chiffrent les credentials dans leur console (champ « Demo Account »).
- Après acceptation des apps, **rotation possible** du mot de passe via admin DB (le compte reviewer reste actif tant qu'utile pour les MAJ ultérieures).
- Si suspicion de compromission : reset du mot de passe + invalidation des sessions via `tokenVersion + 1`.

---

## 10. Désactivation post-acceptation

Après acceptation des deux stores et stabilité d'usage (~3 mois) :

```sql
-- À titre informatif, ne pas exécuter sans validation
UPDATE users
SET credits = 0,
    token_version = token_version + 1   -- invalide les sessions JWT
WHERE email = 'reviewer@boom.contact';
```

Le compte reste en DB (pour les MAJ futures) mais sans crédits ni session active.
