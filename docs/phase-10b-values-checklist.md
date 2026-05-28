# Phase 10B — Checklist des valeurs externes (boom.contact)

> À remplir au moment de la récupération des valeurs réelles. Ne jamais committer une valeur
> empruntée à une autre app, ni une valeur inventée. Procédure : `docs/phase-10b-well-known-execution-runbook.md`.

- **Apple Team ID** (10 car. alphanum.) : ______________________________
- **Android SHA-256 Play App Signing** (`AB:CD:EF:...`) : ______________________________
- **Upload key SHA-256** (optionnel) : ______________________________
- **Date récupération** : ____________________
- **Source console** (Apple Developer / Play Console > App integrity) : ____________________
- **Validé par** : ____________________
- **Remplacé dans repo** (AASA + assetlinks, JSON valide, 0 placeholder) : ☐ oui  — commit : __________
- **Déployé** (Railway SUCCESS) : ☐ oui  — date : __________
- **Testé live** (curl 200 + 0 placeholder + Apple/Google validators + adb verify + device TestFlight/Internal) : ☐ oui

> Rappels :
> - appID final attendu = `TEAMID.contact.boom.app` · package = `contact.boom.app`
> - valeur principale assetlinks = **Play App Signing key** (pas debug, pas upload seule)
> - placeholders à éliminer : `TEAMID_TO_REPLACE`, `SHA256_CERT_FINGERPRINT_TO_REPLACE`
