# ALERT — boom.contact monitoring — 2026-06-18

## 🔴 Health check : ÉCHEC (persistant depuis 2026-05-02)

| Endpoint | Attendu | Obtenu |
|---|---|---|
| `https://www.boom.contact/health` | `{ok: true}` | HTTP 403 Forbidden |
| `https://www.boom.contact` | 200 OK | HTTP 403 Forbidden |

**Le site retourne 403 sur toutes les routes.** Hypothèses :
- Cloudflare/Railway WAF bloquant l'IP du monitoring
- Misconfiguration middleware (auth/IP whitelist trop restrictive)
- Deployment Railway en erreur

**Action requise** : vérifier le dashboard Railway + logs Express + règles WAF/Cloudflare.

---

## ⚠️ TypeScript : erreurs détectées

Les erreurs TS dans `client/src/App.tsx` semblent liées à des `node_modules` manquants
dans l'environnement sandbox (react non installé localement). À confirmer en CI/Railway.

```
client/src/App.tsx(6,79): error TS2307: Cannot find module 'react'
client/src/App.tsx(7,32): error TS2307: Cannot find module 'react-i18next'
client/src/App.tsx(44,5): error TS7026: JSX element implicitly has type 'any'
client/src/App.tsx(241,23): error TS7006: Parameter 'res' implicitly has type 'any'
client/src/App.tsx(285,21): error TS7006: Parameter 'res' implicitly has type 'any'
```

---

## 📋 Derniers commits

```
dd3fbed fix: email magic link '15 min'→'1 heure' + purge sessions cassee
dcbf0f4 fix(auth): magic link robuste — TTL 15min trop court + erreur sans issue
2f3994f i18n(email): emails transactionnels 50/50 langues
d609ad9 feat(placer): ecran placement vehicules premium
2df556f feat(pdf): croquis accident de qualite production
```

---

## 📌 TODO urgents (TODO.md)

- **Bloquant soumission stores** : IPA/AAB signés + tests iPhone/Android réels
- **Décision juridique** : claims PDF « légalement valable / 46 pays » → juriste requis
- **Session 16 P. haute** : API B2B assureurs, IA estimation responsabilité, PoliceFlow

---

*Généré automatiquement par le monitoring boom.contact — 2026-06-18*
