# boom.contact — Contexte Produit

## Problème résolu
Chaque année, des millions d'accidents de voiture donnent lieu à un constat papier :
- Rempli à la main, sous le choc
- Souvent illisible ou incomplet
- Langue barrière entre conducteurs étrangers
- Perdu, mouillé, déchiré
- Pas d'équivalent numérique officiel universel

## Solution
Une PWA + app mobile qui remplace le constat papier :
1. OCR des documents officiels → zéro saisie manuelle
2. Session QR partagée → les deux conducteurs connectés
3. 42 langues → barrière linguistique éliminée
4. Signatures digitales → valeur légale
5. PDF CEA → accepté par tous les assureurs européens

## Marché
- Europe : ~1.8M constats/an (CEA)
- Marché mondial des InsurTech : $10.4B en 2025
- Cible : assureurs (B2B) + conducteurs (B2C)
- Modèle : freemium + partenariats assureurs

## Porteur de projet
PEP's Swiss SA — Groupe NEO
Fondateur : Olivier Neukomm
Site futur : https://boom.contact

## Documents officiels par pays (à scanner)
| Pays        | Doc véhicule               | Doc assurance              |
|-------------|---------------------------|---------------------------|
| 🇨🇭 CH      | Permis de circulation      | Carte verte internationale |
| 🇫🇷 FR      | Carte grise (CG)           | Attestation assurance      |
| 🇩🇪 DE      | Zulassungsbescheinigung    | Grüne Versicherungskarte   |
| 🇮🇹 IT      | Libretto di circolazione   | Carta verde                |
| 🇪🇸 ES      | Permiso de circulación     | Carta verde                |
| 🇬🇧 UK      | V5C logbook                | Certificate of insurance   |
| 🌍 50+ pays | Document immatriculation   | Green Card (CEA standard)  |

## Roadmap
- [x] Phase 1 : Branding & naming (boom.contact)
- [x] Phase 2 : Landing page
- [ ] Phase 3 : Repo & structure (en cours)
- [ ] Phase 4 : OCR Engine (Claude Vision)
- [ ] Phase 5 : Session QR + formulaire CEA
- [ ] Phase 6 : Car diagram + sketch canvas
- [ ] Phase 7 : Double signature + PDF generator
- [ ] Phase 8 : Deploy Railway + boom.contact

## Marchés émergents prioritaires

### 🇨🇳 Chine — 350M+ véhicules (1er mondial)
- **Mandarin simplifié** (`zh`) — 920M locuteurs
- **Traditionnel** (`zh-tw`) — Taïwan, Hong Kong, Macao
- **Cantonais** (`yue`) — 85M locuteurs, Guangdong + HK
- Note : l'app peut fonctionner sur WeChat Mini Program à terme

### 🇮🇳 Inde — 300M+ véhicules (3ème mondial, croissance +8%/an)
- **Hindi** (`hi`) — 600M locuteurs
- **Bengali** (`bn`) — 230M (Bengale Occidental + Bangladesh)
- **Telugu** (`te`) — 95M (Andhra Pradesh, Telangana)
- **Punjabi** (`pa`) — 125M (Punjab, Haryana — fort taux motorisation)
- **Marathi** (`mr`) — 83M (Maharashtra, Mumbai — hub automobile)
- **Gujarati** (`gu`) — 55M (Gujarat — industrie auto Tata, Maruti)
- **Tamil** (`ta`) — 80M (Tamil Nadu — Chennai = "Detroit indien")
- **Kannada** (`kn`) — 45M (Karnataka — Bangalore)

### 🌍 Afrique subsaharienne — marché en forte croissance
- **Swahili** (`sw`) — 200M locuteurs (Kenya, Tanzanie, Ouganda)
- **Hausa** (`ha`) — 100M (Nigeria, Niger, Ghana)
- **Yoruba** (`yo`) — 45M (Nigeria — Lagos 25M hab.)
