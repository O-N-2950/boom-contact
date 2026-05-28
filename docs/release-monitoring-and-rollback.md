# Release monitoring & rollback — boom.contact

> Procédure standard pour chaque déploiement de release candidate ou production.
> Owner : Olivier (release manager). Contact incident : `contact@boom.contact`.

---

## 1. Avant le deploy

### Tagger la release candidate

```bash
# Sur main, après quality:prestore = 0 erreur
git tag -a v1.0.0-rc.1 -m "Release candidate prestore Apple / Google"
git push origin v1.0.0-rc.1

# Noter le commit hash de fallback (commit précédent stable connu)
git rev-parse --short HEAD^   # → commit_fallback
```

> **Stocker `commit_fallback`** dans un brouillon d'incident : c'est l'ancre rollback rapide.

### Snapshot DB

Via Railway dashboard → PostgreSQL service → **Backups** → « Create backup ».
Noter l'ID du snapshot + date.

### Pre-flight commit

- [ ] `quality:prestore` = 0 erreur sur le commit déployé
- [ ] Variables d'env Stripe / Resend / Anthropic / OpenAI / Sentry / PostHog inchangées (ou changement noté)
- [ ] AASA / assetlinks sans placeholder
- [ ] Capture screenshots à jour

---

## 2. Pendant le deploy

### Surveillance Railway

```bash
# Poll automatique du status deploy
curl -s -H "Authorization: Bearer $RAILWAY_TOKEN" \
     -H "User-Agent: railway-cli/3.0.0" \
     -X POST https://backboard.railway.com/graphql/v2 \
     -d '{"query":"query{deployments(first:1,input:{serviceId:\"...\",environmentId:\"...\"}){edges{node{status createdAt}}}}"}'
```

Status attendus : `BUILDING` (90–180 s) → `DEPLOYING` (15–30 s) → `SUCCESS`.

En cas de `FAILED` ou `CRASHED` : récupérer `buildLogs` et `deploymentLogs` immédiatement.

---

## 3. Post-deploy — checklist endpoints

À exécuter dans les **2 minutes** suivant `SUCCESS` :

```bash
DATE=$(date -u '+%Y-%m-%d %H:%M UTC')
echo "Vérif post-deploy : $DATE"
for u in / /health /privacy /cgu /visual-qa /design-preview /pitch.html \
         /.well-known/apple-app-site-association \
         /.well-known/assetlinks.json; do
  echo "$u → $(curl -s -m 10 -o /dev/null -w '%{http_code}' https://www.boom.contact$u)"
done

# robots
curl -s https://www.boom.contact/robots.txt | grep -i disallow
```

Tous **200**. Tout autre code = anomalie → décision rollback.

---

## 4. Monitoring continu

### Sentry (crashes + erreurs)

Console Sentry → projet `boom-contact-server` et `boom-contact-client`.

| Seuil | Action |
|---|---|
| **Crash-free sessions < 99 %** sur 1h | 🟠 Alerte → analyse + plan d'action sous 24h |
| **Crash-free sessions < 95 %** sur 1h | 🔴 Rollback immédiat |
| Pic d'erreurs 5xx (>10/min) | 🔴 Rollback immédiat |
| Nouvelle erreur unique > 50 occurrences sur 1h | 🟠 Investigation |

### PostHog (events produit)

Console PostHog EU → dashboard release.

| Event | Seuil sain | Seuil rouge |
|---|---|---|
| `constat_started` | suivi pour baseline | — |
| `signature_completed / constat_started` | > 60 % | < 30 % |
| `pdf_generated / payment_succeeded` | > 95 % | < 90 % |
| `payment_abandoned` (vs initiated) | < 35 % | > 60 % |

### Stripe webhook logs

Dashboard Stripe → Developers → Webhooks → endpoint `/api/stripe/webhook`.

| Métrique | Seuil sain | Seuil rouge |
|---|---|---|
| Success rate (last 1h) | 100 % | < 98 % |
| Latency p95 | < 1s | > 5s |
| Replays nécessaires | 0 | > 0 (urgence) |

### Resend (email delivery)

Dashboard Resend → analytics.

| Métrique | Seuil sain | Seuil rouge |
|---|---|---|
| Delivery rate (24h) | > 95 % | < 90 % |
| Bounce rate | < 2 % | > 5 % |
| Complaint rate | < 0.1 % | > 0.3 % |

### PDF generation

Logs serveur Railway (recherche `pdf_generated` / `pdf_failed`).

| Métrique | Seuil sain | Seuil rouge |
|---|---|---|
| Success rate | > 98 % | < 95 % |
| Latency p95 | < 8s | > 30s |
| Puppeteer crash | 0 | > 0 |

### OCR / Voice (Anthropic + Whisper)

Logs serveur.

| Métrique | Seuil sain | Seuil rouge |
|---|---|---|
| OCR success rate | > 90 % | < 80 % |
| OCR latency p95 | < 6s | > 15s |
| Whisper success rate | > 95 % | < 85 % |
| Quota Anthropic restant | > 20 % | < 5 % |
| Quota OpenAI restant | > 20 % | < 5 % |

### HTTP 5xx (Railway HTTP logs)

```bash
# via Railway logs
curl -s -H "Authorization: Bearer $RAILWAY_TOKEN" \
     -H "User-Agent: railway-cli/3.0.0" \
     -X POST https://backboard.railway.com/graphql/v2 \
     -d '{"query":"query{deploymentLogs(deploymentId:\"...\",limit:200){message timestamp}}"}'
```

| Métrique | Seuil sain | Seuil rouge |
|---|---|---|
| 5xx rate (1h) | < 0.1 % | > 1 % |
| Hausse subite (>10x baseline) sur 5 min | — | 🔴 Rollback |

---

## 5. Procédure rollback Railway

### Option A — Redeploy d'un commit antérieur (recommandé, <2 min)

Via Railway dashboard → service → **Deployments** → ancien deploy `SUCCESS` → ⋯ → **Redeploy**.

Ou via GraphQL :

```bash
curl -X POST https://backboard.railway.com/graphql/v2 \
  -H "Authorization: Bearer $RAILWAY_TOKEN" \
  -H "User-Agent: railway-cli/3.0.0" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation{deploymentTriggerRedeploy(id:\"DEPLOYMENT_ID_FALLBACK\"){id status}}"}'
```

### Option B — Force push commit_fallback (5 min, plus risqué)

```bash
git checkout main
git reset --hard commit_fallback
git push origin main --force-with-lease
# Railway redéploie automatiquement
```

> Risque B : perte des commits intermédiaires non sauvegardés en branche. À privilégier **Option A**.

### Restauration DB

Si la migration DB a corrompu des données :

1. Railway dashboard → PostgreSQL → **Backups** → snapshot pré-deploy → **Restore**.
2. Communiquer aux utilisateurs : email transactionnel via Resend si données utilisateurs impactées.

---

## 6. Qui contacter — escalation

| Niveau | Personne / canal | Délai cible |
|---|---|---|
| L1 — alerte automatique | Sentry / PostHog → email `contact@boom.contact` | immédiat |
| L2 — décision rollback | Olivier Neukomm (+41 ...) | < 10 min |
| L3 — incident grave (DSAR, panne >30 min) | Olivier + juriste | < 1h |
| L4 — autorité CNIL / FINMA si applicable | Olivier | < 72h (RGPD art. 33) |

---

## 7. Post-incident

- [ ] Post-mortem rédigé sous 72h dans `docs/incidents/<date>-<slug>.md`
- [ ] Liste des actions correctives + responsable + deadline
- [ ] Mise à jour de cette procédure si la cause révèle une lacune

---

## 8. Drill périodique

- **Mensuel** : exécuter un faux rollback (Option A) sur l'environnement RC pour vérifier la procédure.
- **Trimestriel** : tester la restauration DB depuis un snapshot vers une instance temporaire.

---

## 9. Variables / IDs à connaître par cœur

| Élément | Valeur |
|---|---|
| Railway Project ID | `e0085774-c08f-48d0-8183-b6fe11c816cd` |
| Railway Service ID (server) | `4c024cbf-fb0a-4652-85bc-8c7cdedf62e2` |
| Railway Environment ID | `e0247449-5574-4959-974e-c4b636da7419` |
| Production URL | https://www.boom.contact |
| Health endpoint | https://www.boom.contact/health |
| Robots | https://www.boom.contact/robots.txt |
| Last known good commit | (à mettre à jour à chaque deploy) |
