# Décision /pitch.html — Sprint 9

> Suite à la découverte Sprint 8 que `client/public/pitch.html` contenait 9 claims interdits
> servis live à 200 sur `https://www.boom.contact/pitch.html`, une décision claire doit
> être prise sur le statut futur de ce fichier.

---

## Contexte

`pitch.html` est un **pitch deck commercial 1101 lignes** utilisé par Olivier pour :
- Présentations investisseurs / partenaires B2B
- Démos rapides aux polices cantonales (B2G)
- Liens partagés ponctuellement par email / LinkedIn

Le fichier vit dans `client/public/` donc est servi statiquement par Vite/Express et accessible publiquement à `/pitch.html`.

---

## Options évaluées

### Option A — Garder accessible, clean, Disallow robots ✅ **RECOMMANDÉE**

- Sprint 8 a déjà **assaini** 9 occurrences (« 150+ pays », « PDF certifié », « légalement valide », « valeur légale officielle », « monde entier », « conforme CEA », etc.)
- Sprint 8 a ajouté `Disallow: /pitch.html` dans le `robots.txt` (server route)
- Sprint 9 : le script `npm run check:claims` couvre désormais aussi `client/public/*.html`
- Le fichier reste accessible **à ceux qui ont l'URL directe** (commercial)
- Pas indexé par Google ni crawlers

### Option B — Déplacer hors `client/public`

- Forcerait à servir le pitch via un autre canal (Notion, PDF, Gamma)
- Casserait les liens existants partagés par Olivier
- Perte d'agilité (Olivier ne peut plus mettre à jour le pitch via git)
- ❌ Non recommandé pour V1

### Option C — Protéger ou retirer de production

- Auth requise (mot de passe, lien magique) : ajout de complexité
- Retrait pur : Olivier perd un outil de sales utilisé
- ❌ Surcoût pour bénéfice marginal post-sanitation

---

## Recommandation : **Option A**

| Critère | État actuel | Cible | Statut |
|---|---|---|---|
| Claims interdits | 9 (Sprint 8) | 0 | ✅ corrigé Sprint 8 |
| Disallow robots | non | oui | ✅ ajouté Sprint 8 |
| Couvert par `check:claims` | non | oui | ✅ scope étendu Sprint 9 |
| Linké depuis home publique | ⚠️ **à vérifier** | non | ⏳ contrôle Sprint 9 |
| Wording prudent uniforme | partiel | total | ✅ aligné Sprint 8 |

---

## Vérifications Sprint 9

### Linking depuis pages publiques

```bash
grep -rn "pitch.html\|/pitch\"" client/src 2>/dev/null
```

Si > 0 résultat dans des pages publiques (Landing, Header, Footer) → **retirer le lien**. Le pitch deck est un outil de communication ciblé, pas un asset SEO ni un parcours utilisateur public.

### Couverture `check:claims`

Le script `scripts/check-claims.ts` scanne `client/public/**/*.html` — toute régression future sera détectée :

```bash
npm run check:claims
# A_BLOCKING doit rester à 0
```

### Robots

```bash
curl -s https://www.boom.contact/robots.txt | grep -i pitch
# Attendu : Disallow: /pitch.html
```

---

## Risque résiduel

| Risque | Probabilité | Sévérité | Mitigation |
|---|---|---|---|
| Future régression claim | Faible | Moyenne | `check:claims` permanent (Sprint 9) |
| Indexation Google malgré Disallow | Très faible | Faible | Disallow + jamais linké depuis home |
| Partage du lien à un mauvais destinataire | Faible | Faible | Pas de données sensibles dans le pitch |
| Crawler ignore robots.txt | Très faible | Très faible | Pas de claim → pas de risque |

---

## Statut final

✅ **Option A retenue** — `pitch.html` reste accessible, propre, hors-SEO, sous garde-fou permanent du script `check:claims`. Toute régression future sera attrapée automatiquement avant qu'elle n'atteigne la prod.
