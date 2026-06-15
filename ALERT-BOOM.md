# ALERT — boom.contact monitoring

**Date** : 2026-06-15 (mis à jour — alerte persistante depuis 2026-05-02)  
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
87b67f4 fix(brand): logo header 2x plus present — ratio paysage natif
b3eff5c fix(brand): logo header illisible — extraction du mark
bcdfab2 fix(marketing): autocollants QR — palette canonique
ece7908 marketing: generateur autocollants/carte QR print-ready
0043e90 growth: boucle virale conducteur B — capture post-signature
```

### 3. TypeScript — avertissement
- `tsconfig.json:10` — TS5101 : option `baseUrl` dépréciée (sera supprimée en TS 7.0)
- Aucune erreur bloquante

### 4. Tâches urgentes (TODO.md — état 15 juin 2026)

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
