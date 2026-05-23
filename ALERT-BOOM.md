# ALERT — boom.contact monitoring

**Date** : 2026-05-23 (mis à jour — alerte persistante depuis 2026-05-02)  
**Heure** : vérification automatique

---

## Résultats

### 1. Health check — ÉCHEC
- URL : https://www.boom.contact/health
- Attendu : `{ok: true}`
- Reçu : **HTTP 403 Forbidden**
- Statut : endpoint inaccessible (WAF, auth requise, ou endpoint absent)

### 2. Derniers commits (OK)
```
eceebbd Legal Pack — questions à passer à Soluris (pré-validation juriste)
bc17bff Phase 1 — Legal Pack v1.0 (8 documents, drafts juriste)
4b04bd4 SUIVI post-audit #5
e6534c1 Post-audit #5 — 3 derniers points code (A1/A2/A3)
e99c9ba SUIVI — audit profond proactif
```

### 3. TypeScript — avertissement
- `tsconfig.json:10` — TS5101 : option `baseUrl` dépréciée (sera supprimée en TS 7.0)
- Aucune erreur bloquante

### 4. Tâches urgentes (TODO.md — état 23 mai 2026)

**🔴 Bloquant soumission stores**
- Runtime natif : IPA/AAB signés + tests iPhone/Android réels (manque Xcode/Android Studio + certificats)
- Validation juridique : claims PDF « légalement valable / 46 pays » → juriste requis

**🔴 Session 16 — Priorité haute**
- API B2B assureurs (REST/tRPC + SDK + dashboard partenaire)
- IA estimation de responsabilité (barème IDA/IRSA)
- PoliceFlow pilote Canton Jura (subdomain + auth + audit trail RGPD)

**⚠️ Legal Pack**
- Questions transmises à Soluris (pré-validation juriste) — en attente de retour

---

## Action requise

Vérifier que `/health` est accessible publiquement sans authentification.  
Contrôler Railway logs + règles WAF/Cloudflare pour l'endpoint `/health`.
