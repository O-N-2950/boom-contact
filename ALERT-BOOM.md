# Monitoring — boom.contact

**Dernière vérification réelle** : 2026-06-15T14:39:58Z
**Statut global** : 🟢 OPÉRATIONNEL

---

## Health check — ✅ OK

Vérifié en direct sous plusieurs méthodes et User-Agents :

```
GET  https://www.boom.contact/health      → 200  {"ok":true,"service":"boom.contact","env":"production"}
HEAD https://www.boom.contact/health      → 200
GET  https://www.boom.contact/api/health  → 200
```

Servi directement par Railway (`server: railway-hikari`), sans WAF/Cloudflare intermédiaire.

### Note sur l'ancien "403 persistant" (résolu — faux positif)
L'alerte 403 datée du 2026-05-02 était un **faux positif de l'outil de monitoring**.
Cause identifiée : le domaine apex `https://boom.contact/health` (sans `www`) renvoie un
**301** vers `https://www.boom.contact/health` (redirection voulue et correcte). Un moniteur
qui ne suit pas les redirections, ou qui teste l'apex, peut logger ce non-200 comme un échec.
➡️ **Correctif monitoring** : tester `https://www.boom.contact/health` (avec www) et suivre
les redirections (`curl -L`). Le endpoint est public, sans auth, et répond 200.

---

## Build & qualité

- **TypeScript** : ✅ propre (warning TS5101 `baseUrl` corrigé le 2026-06-15)
- **Derniers commits** : fix brand logo (ratio paysage), boucle virale conducteur B, PDF 50 langues

---

## Vraies tâches restantes (hors code — accès humains requis)

**🔴 Bloquant soumission stores**
- Runtime natif : IPA/AAB signés + tests iPhone/Android réels (certificats Apple/Google — Olivier)
- Validation juridique des claims PDF (« valable N pays ») — juriste/Soluris

**🟠 Session suivante (priorité produit)**
- PoliceFlow pilote Canton Jura (subdomain + auth + audit trail RGPD)
- API B2B assureurs (REST/tRPC + dashboard partenaire)

**⚠️ Legal Pack**
- Questions transmises à Soluris (pré-validation juriste) — en attente de retour
