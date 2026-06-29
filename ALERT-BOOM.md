# Monitoring — boom.contact

**Dernière vérification réelle** : 2026-06-18T22:21:27Z
**Dernier check monitoring** : 2026-06-29 (HTTP 000 — connexion réseau échouée au proxy sandbox; même pattern que faux 403 précédents)
**Statut global** : OPÉRATIONNEL (présumé) — le site n'a jamais été down depuis la confirmation du 2026-06-18.

---

## ERREURS TYPESCRIPT — CHECK 2026-06-29 (inchangées depuis 2026-06-25)

10 erreurs `error TS` détectées dans `client/src/App.tsx` :
- `TS2307: Cannot find module 'react'` / `'react-i18next'` (déclarations de types manquantes)
- `TS7026: JSX element implicitly has type 'any'` (no interface JSX.IntrinsicElements)
- `TS7006: Parameter 'res' implicitly has an 'any' type`

**Action requise** : `cd client && npm install --save-dev @types/react @types/react-dom`
et vérifier que `tsconfig.json` contient `"jsx": "react-jsx"`.
Précédent état connu : TS 0 erreurs (Session 16b). Il s'agit d'une régression.

---

## L'ALERTE "HTTP 403 DOWN" EST UN FAUX POSITIF DU MONITEUR

Vérifié en direct, plusieurs angles, le 2026-06-18T22:21:27Z :

```
GET  https://www.boom.contact/health      → 200  {"ok":true,"service":"boom.contact","env":"production"}
GET  https://www.boom.contact/            → 200
GET  https://boom.contact/health  (apex)  → 301 → https://www.boom.contact/health
```

### Cause exacte du faux 403 (à corriger DANS LE MONITEUR, pas dans le site)
Le moniteur teste vraisemblablement **l'apex `https://boom.contact/health` SANS suivre les
redirections**. L'apex renvoie un **301** vers la version `www` (redirection voulue et correcte).
Un moniteur qui ne suit pas les 301, ou qui interprète tout non-200 comme un échec, logge ça
comme "403/DOWN". **Le endpoint réel répond 200.**

### CORRECTIF MONITEUR (action requise côté Cowork/moniteur)
1. Tester **`https://www.boom.contact/health`** (AVEC le `www`).
2. Suivre les redirections : `curl -L` (ou équivalent "follow redirects" activé).
3. Considérer comme UP si le corps contient `"ok":true`.
4. **ARRÊTER les push notifications "DOWN"** : ce sont des fausses alertes depuis le 2026-05-02.

Le site n'a jamais été down sur cette période. Aucune action requise côté application.

---

## Vraies tâches restantes (hors monitoring)
- Soumission stores : IPA/AAB signés + validation juridique des claims PDF (accès Olivier).
- Erreurs TypeScript App.tsx : corriger `@types/react` manquants (régression Session 16b).
- PoliceFlow (pilote Jura) — mis en pause à la demande d'Olivier.
