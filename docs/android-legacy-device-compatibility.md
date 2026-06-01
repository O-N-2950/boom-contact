# Android Legacy Device Compatibility (boom.contact)

> Audit READ-ONLY (2026-06-01). Cible : chauffeurs, PME, flottes, livreurs, transporteurs, véhicules de service, utilisateurs non technophiles — **parc d'appareils Android de 7–8 ans**. AUCUNE config Android modifiée par cet audit.

## A. État actuel (faits)
| Élément | Valeur | Remarque |
|---|---|---|
| 1. minSdkVersion | **23** (Android 6.0) | Installable dès Android 6 |
| 2. targetSdkVersion | 35 (Android 15) | Conforme exigence Google Play 2025 |
| 3. compileSdkVersion | 35 | |
| 4. Android Gradle Plugin | 8.7.2 (Gradle 8.11.1) | Récent, OK |
| 5. Capacitor Android | 8.3.1 | ⚠️ Capacitor 8 documente **minSdk 24 / compile+target 36** comme minimums. Notre config (23/35/35) = minimums Capacitor **7**. |
| 6. WebView minimale réelle | Rendu dans **Android System WebView** ; bundle Vite ciblé ≈ **Chrome 87+** (pas de `build.target` explicite → défaut Vite) | Décisif : voir §C |
| androidx-webkit | 1.12.1 | Aide la compat WebView |
| Caméra/photos/géoloc | **API web** (`getUserMedia`, `input type=file capture`, `navigator.geolocation`) — PAS les plugins natifs Capacitor | Impact fort sur vieux WebView (§C) |
| Bundle | ≈ **447 KB JS gzip**, 3.6 MB assets, **embarqué dans l'app** | L'UI charge en local (pas de réseau) → bon pour vieux appareils |

## B. Versions Android — politique de support recommandée
- ✅ **Officiellement supporté (qualité premium garantie)** : **Android 8.0 (API 26) et +**. Modèle de permissions runtime mature, WebView Chrome récent disponible.
- 🟡 **Installable, best-effort (non garanti)** : **Android 7.0–7.1 (API 24–25)** — c'est le minimum aligné Capacitor 8.
- 🔴 **Non recommandé** : **Android 6 (API 23)** — installable aujourd'hui (minSdk 23) mais **sous le minimum documenté de Capacitor 8 (24)** et WebView souvent figé.

## C. Risques par version
| Version | Risque principal | Gravité |
|---|---|---|
| Android 6 (23) | WebView souvent non mis à jour → bundle ciblé Chrome 87 peut **ne pas rendre** (écran blanc). En-dessous du min Capacitor 8. | 🔴 P1 |
| Android 7 (24–25) | WebView mis à jour via Play Store = OK ; mais sur appareils figés (sans Play Services à jour), risque de rendu. `getUserMedia` parfois capricieux. | 🟠 P1 |
| Android 8–9 (26–28) | Généralement OK si WebView à jour. Perf CPU/RAM plus faible (parse JS plus lent). | 🟡 P2 |
| Android 10+ (29+) | Bon. Scoped storage déjà géré (`READ_MEDIA_IMAGES`, maxSdk sur storage legacy). | 🟢 |

**Point central** : Capacitor rend l'UI dans le **System WebView**, qui se met à jour **indépendamment de l'OS** via le Play Store. Un Android 7/8 avec WebView récent (Chrome 100+) rend parfaitement ; un appareil **figé** (WebView ancien, Play Services bloqués — fréquent sur parc pro vieillissant) est le vrai risque. Mitigation recommandée (NON appliquée) : abaisser la cible build Vite (`build.target: ['es2015','chrome61']`) + browserslist large pour élargir le support WebView ancien.

## D. Liste des tests sur vieux appareils (à exécuter)
Android 8 ou 9 réel (prioritaire), Android 10 milieu de gamme. Pour chacun : lancement sans crash, rendu UI complet (pas d'écran blanc = test WebView), compte/magic link, garage, véhicule entreprise, **caméra** (+ fallback `input file`), **galerie**, **micro** (+ fallback texte), **localisation** (+ fallback adresse), **QR participant**, **OCR**, **PDF** (génération/téléchargement), **paiement test**, **offline→reconnect**, **redémarrage app** (état session), **rotation écran**, **faible mémoire**, **réseau lent 3G/4G**.

## E. Fallback manuel OBLIGATOIRE
Sur vieux appareils, chaque capacité doit avoir un chemin manuel garanti — **non négociable (P0)** :
- Caméra/OCR échoue → **saisie manuelle** des champs + `input type=file` (déjà présent).
- Micro indispo → **saisie texte** (déjà présent).
- Localisation refusée/indispo → **adresse manuelle** (déjà présent).
- Aucun blocage du parcours constat si une capacité échoue.

## F. Performance budget (cible vieux appareils)
- JS gzip total ≤ ~500 KB (actuel ≈ 447 KB ✅) ; chunk d'entrée le plus lourd (`ConstatFlow` 262 KB non compressé) → surveiller.
- Démarrage à froid cible ≤ ~4 s sur Android 8 milieu de gamme.
- RAM : éviter de tout charger ; le code-splitting par route est déjà en place ✅.
- Pas de dépendance réseau pour afficher l'UI (bundle embarqué) ✅.

## G. Recommandations Store listing
- Indiquer un **minimum recommandé Android 8.0+** dans la description (sans bloquer l'installation sous 8).
- Mentionner « fonctionne sur appareils anciens » comme argument (chauffeurs/flottes), avec la nuance « WebView à jour recommandé ».
- Ne PAS promettre un fonctionnement parfait sur Android 6.

## H. Recommandations QA
- Tester en priorité **un Android 8 ou 9 réel** (le plus représentatif du parc pro vieillissant) + 1 Android 10 milieu de gamme.
- Inclure un test **« écran blanc »** (rendu WebView) comme **P0** sur chaque vieux appareil.
- Tester avec **WebView volontairement non mis à jour** si possible (cas pire réaliste).

## I. Score Android Legacy Compatibility : **62/100**
Architecture favorable (bundle embarqué, fallbacks manuels présents, code-splitting, androidx-webkit) MAIS : minSdk 23 sous le minimum Capacitor 8 (24), cible JS ≈ Chrome 87 risquée sur WebView figé, capacités via API web (pas de plugins natifs), **non encore testé sur appareil ancien réel**. Le score montera après QA réelle sur Android 8/9 + décision sur minSdk + (éventuellement) abaissement de la cible build.

## Réponse directe : minSdk 23 est-il OK pour un produit premium ?
**Théoriquement installable, mais risqué en pratique.** minSdk 23 laisse installer sur Android 6, or (a) c'est **sous le minimum documenté de Capacitor 8 (24)**, et (b) ces appareils ont souvent un WebView figé incompatible avec le bundle. **Recommandation premium** : aligner sur Capacitor 8 → **minSdk 24** (Android 7), **support officiel Android 8+**. Décision à valider par Olivier (changement de config = hors de cet audit).
