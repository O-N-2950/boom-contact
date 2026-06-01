# Mobile Permissions Review (boom.contact)

Audit réel des permissions déclarées (AndroidManifest + iOS Info.plist), justification, fallback manuel, risque de rejet.

| Permission | Android | iOS (UsageDescription) | Usage réel | Justif. utilisateur | Fallback manuel | Risque rejet |
|---|---|---|---|---|---|---|
| **Caméra** | `CAMERA` | `NSCameraUsageDescription` ✅ | Scan OCR documents (carte verte, permis) + photos dégâts | « Scanner vos documents et photographier les dégâts » | Saisie manuelle des champs + import galerie | Faible — justifié, string claire |
| **Micro** | `RECORD_AUDIO` | `NSMicrophoneUsageDescription` ✅ | Description vocale de l'accident (transcription Whisper) | « Décrire l'accident à la voix » | Saisie texte (toujours disponible) | Faible — fallback texte explicite |
| **Photos / galerie** | `READ_MEDIA_IMAGES` (+ `READ_EXTERNAL_STORAGE` maxSdk32, `WRITE_EXTERNAL_STORAGE` maxSdk28) | `NSPhotoLibraryUsageDescription` ✅ | Joindre des photos de dégâts | « Ajouter des photos au constat » | Caméra directe | Faible — scoped storage respecté |
| **Localisation** | `ACCESS_FINE_LOCATION` + `ACCESS_COARSE_LOCATION` | `NSLocationWhenInUseUsageDescription` ✅ | Pré-remplir le lieu de l'accident | « Localiser le lieu de l'accident » | Saisie manuelle de l'adresse | **Moyen** — voir note 1 |
| Réseau | `INTERNET`, `ACCESS_NETWORK_STATE` | (implicite) | Sync session, sauvegarde, OCR/transcription serveur | — | Offline-first + sync à la reconnexion | Nul |

## Notes / corrections recommandées
1. **Localisation (risque moyen)** : Apple/Google exigent que l'usage soit clairement optionnel et non bloquant. ✅ Déjà : `WhenInUse` uniquement (pas de "Always"), fallback saisie manuelle. À vérifier en QA device : le refus de localisation ne bloque JAMAIS la création du constat (P0 dans device-qa-master-checklist).
2. **iOS `NSPhotoLibraryAddUsageDescription`** : non présent. Nécessaire UNIQUEMENT si l'app écrit des images dans la galerie (ex. enregistrer le PDF/photo). Aujourd'hui le PDF est envoyé par email / téléchargé, pas écrit en galerie → non requis. Si une fonction "Enregistrer dans Photos" est ajoutée, ajouter cette clé.
3. **Notifications** : aucune permission notification déclarée → rien à justifier (pas de push). Conforme.
4. **Wording prudent** : toutes les strings décrivent un usage concret, sans claim. ✅
5. **Background location / tracking** : aucun. Pas d'`NSLocationAlwaysUsageDescription`, pas d'IDFA/ATT. Conforme (pas de `NSUserTrackingUsageDescription` requis tant qu'aucun tracking cross-app).

## Verdict
Permissions justifiées, fallback manuel pour micro/localisation/photos, strings conformes. Aucun blocage permission attendu sous réserve de la **QA device** confirmant que tout refus de permission laisse un chemin manuel fonctionnel.
