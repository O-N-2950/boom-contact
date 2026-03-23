# boom.contact — SUIVI.md
> Dernière mise à jour : 23 Mars 2026 — Fin Session 12

---

## Session 12 — Chrome Puppeteer + OSM + Véhicules — 23 Mars 2026
**Dernier deploy** : SUCCESS 23 Mars 2026 07:08:59

### Commits Session 12
| Commit | Description |
|---|---|
| `195454bf` | feat(sketch): add puppeteer-core |
| `3105980c` | feat(sketch): Dockerfile + Chromium Alpine |
| `119172c2` | feat(sketch): sketch-renderer.service.ts |
| `58f31047` | feat(sketch): sketch-engine.js asset serveur |
| `956cb1d3` | feat(sketch): route sketch.render tRPC |
| `91240b50` | feat(sketch): pdf.service Puppeteer intégré |
| `807b1bd8` | fix(sketch): timeout 30s + capture erreurs JS |
| `0cf44cd3` | fix(sketch): engine JS inline valide |
| `1683a72e` | fix(pdf): import logger manquant |
| `06ecab7a` | fix(build): npm install au lieu de npm ci |
| `39c6312f` | fix(router): sketch.render dans appRouter |
| `cd969342` | feat(osm): Dockerfile + Cairo/canvas OSM |
| `da43106b` | feat(osm): osm-map.service.ts — tuiles OSM + geocoding |
| `e1f839da` | feat(osm): pdf.service fetch carte OSM réelle |
| `aa6298c7` | fix(sketch): supprimer drawRoadScene — OSM pur |
| `81e5a57c` | fix(sketch): véhicules proportionnés zoom 18 |
| `43fd0931` | feat(vehicles): train, tracteur, quad, chantier, bateau |
| `e3fa1fe` | feat(sketch): MapVehiclePlacer obligatoire |
| `4e0edbf0` | feat(sketch): SignaturePad prop disabled |
| `ddc5970e` | fix(renderer): drawVan+Train+Tracteur+Quad+Construction+Boat |
| `e89aff42` | fix(renderer): template literals ctx.font |

### Résultats Session 12

#### Chrome Puppeteer headless
- ✅ Chromium Alpine installé sur Railway (851 MB, 193 packages)
- ✅ Chrome cold start : 720ms
- ✅ sketch.render : 98 KB PNG en 1041ms
- ✅ 0 erreur en prod — SKETCH_DONE confirmé dans les logs

#### Carte OSM server-side
- ✅ osm-map.service.ts — tuiles OSM + Cairo/node-canvas
- ✅ Geocoding Nominatim (fallback si lat/lng absent)
- ✅ Carte rendue en ~600ms pour toutes les adresses testées
- ✅ Coordonnées exactes Bellevue 7 Courgenay : 47.4088, 7.1124

#### 16 types de véhicules — tous avec silhouette
car, suv, van, truck, bus, tram, **train** 🆕, motorcycle, scooter, moped, escooter, bicycle, cargo_bike, pedestrian, **quad** 🆕, **tractor** 🆕, **construction** 🆕, **boat** 🆕

#### MapVehiclePlacer obligatoire
- ✅ diagram → sketch → sign (plus de bypass)
- ✅ Bannière orange + bouton si conducteur arrive sans croquis
- ✅ SignaturePad désactivé tant que sketchImage est vide

#### Tests 10 pays — Session 12
| Pays | Lieu | Véhicules | KB | Logs |
|---|---|---|---|---|
| 🇨🇭 CH-1 | Bellevue 7 Courgenay (47.4088, 7.1124) | VW Golf × Renault Clio | 517 KB | ✅ |
| 🇨🇭 CH-2 | Route de Délémont, Courgenay | John Deere × Volvo FH16 | 484 KB | ✅ |
| 🇫🇷 FR | Rond-point Champs-Élysées Paris | Renault Mégane × Citroën C5X | 1657 KB | ✅ |
| 🇩🇪 DE | Autobahn A9 Munich | BMW M3 × BMW R1250GS (moto) | 1698 KB | ✅ |
| 🇧🇪 BE | Boulevard Anspach Bruxelles | VW Polo × Tramway STIB | 1542 KB | ✅ |
| 🇱🇺 LU | Place Guillaume II Luxembourg | Toyota RAV4 × Yamaha NMAX (scooter) | 1794 KB | ✅ |
| 🇮🇹 IT | Corso Buenos Aires Milano | Alfa Romeo × Trek (vélo) | 1410 KB | ✅ |
| 🇪🇸 ES | Carrer de Provença Barcelone | Mercedes Sprinter (van) × Seat Arona | 1592 KB | ✅ |
| 🇬🇧 GB | London Bridge | Lime E-Scooter × Piéton | 886 KB | ✅ |
| 🇦🇺 AU | Bondi Beach Sydney | CF Moto Quad × Toyota HiLux | 1187 KB | ✅ |

**10/10 ✅ — 0 erreur dans les logs Railway**

---

## Session 13 — PLANIFIÉE
**Objectif** : Authentification, Paiement International, Admin, Réseaux Sociaux

### Prochaines tâches (voir TODO.md Session 13)

