# Phase 10B — Checklist des valeurs externes (boom.contact) — ✅ COMPLÉTÉE

> Valeurs publiques par conception (Team ID figure dans l'AASA public ; SHA-256 figure dans
> l'assetlinks public). Procédure : `docs/phase-10b-well-known-execution-runbook.md`.

- **Apple Team ID** (10 car. alphanum.) : `7YWB99G6Q8`  — entité Apple Developer : **PEP's Swiss SA** (Team ID commun à l'organisation, normal)
- **Android SHA-256 Play App Signing** : `C5:CC:A0:97:AB:BA:95:D2:A1:D5:20:9A:50:0A:D4:4B:C5:1A:84:D2:F7:45:16:FE:B8:04:2B:18:EE:7F:4D:99` — **propre à boom.contact**
- **Upload key SHA-256** (optionnel) : non ajouté (Play App Signing suffit pour les installs Play)
- **Date récupération** : 2026-05-29
- **Source console** : Apple Developer → Membership · Google Play Console → App integrity → App signing key certificate
- **Validé par** : Olivier Neukomm (PEP's Swiss SA)
- **Remplacé dans repo** (AASA + assetlinks, JSON valide, 0 placeholder) : ☑ oui — commit Sprint 10B exécution
- **Déployé** (Railway SUCCESS) : ☑ oui — 2026-05-29
- **Testé live** : ☑ curl 200 + 0 placeholder + Google Statement List Tester OK · ⏳ adb verify + device TestFlight/Internal Testing (au prochain build signé)

> Rappels :
> - appID final = `7YWB99G6Q8.contact.boom.app` · package = `contact.boom.app`
> - valeur assetlinks = Play App Signing key de boom.contact (jamais une autre app)
> - placeholders éliminés : `TEAMID_TO_REPLACE`, `SHA256_CERT_FINGERPRINT_TO_REPLACE`
