# boom.contact — Modèle de Feedback Testeur (Android Interne)

> Copie ce bloc, remplis-le, renvoie-le. **Un formulaire par appareil.**

```
Nom du testeur :
Téléphone (modèle) :
Version Android :
Date :

Installation OK : oui / non
Connexion (magic link) OK : oui / non
Garage (véhicule perso) OK : oui / non
Véhicule entreprise OK : oui / non / n.a.
Constat complet OK : oui / non
Caméra / scan OK : oui / non
Galerie / photos OK : oui / non
Micro (vocal) OK : oui / non / n.a.
Localisation OK : oui / non / n.a.
Fallback manuel (si permission refusée) OK : oui / non
QR participant OK : oui / non / n.a.
Signature OK : oui / non
PDF OK : oui / non
Email reçu OK : oui / non
Paiement test OK : oui / non / n.a.
Suppression de compte OK : oui / non
Offline → reconnexion OK : oui / non / n.a.
Permissions OK (pas de blocage) : oui / non

Bug rencontré :
Étapes pour reproduire :
1.
2.
3.
Capture écran / vidéo : (jointe ? oui/non)
Gravité proposée : P0 / P1 / P2 / P3
Commentaire :
```

### Rappel gravités
- **P0** : bloque tout (n'installe pas, n'ouvre pas, crash, connexion/constat/PDF impossible, paiement débité sans crédit, perte de données).
- **P1** : bloque le lancement public (garage inutilisable, permission sans fallback, signature cassée, PDF incomplet, email non reçu, perf catastrophique sur vieil appareil, traduction critique manquante).
- **P2** : polish (UI, wording, alignement, lenteur modérée, confusion mineure).
- **P3** : amélioration future.
