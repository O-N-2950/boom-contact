# Fleet B2B — Security & Privacy Review

_Analyse des risques et stratégie. Mise à jour : 2026-05-29._

## 1. Risques identifiés et réponses
| # | Risque | Réponse |
| --- | --- | --- |
| 1 | Un chauffeur voit-il tous les véhicules ? | **Non.** Il voit ses véhicules perso + ceux des organisations où il est membre `active`. Jamais les véhicules d'autres orgs. Filtrage côté serveur (jamais côté client). |
| 2 | Un ancien employé peut-il encore accéder aux constats ? | **Non si retiré correctement.** Retrait = `organization_members.status='removed'` + `removedAt`. Toute requête flotte exige `status='active'`. Les constats déjà créés par lui restent à l'org (preuve), il n'y a plus accès. |
| 3 | Un fleet_admin voit-il des données personnelles sensibles du chauffeur ? | **Minimisé.** L'admin voit les **métadonnées** du constat (véhicule d'org, date, statut PDF) et le PDF si destinataire. Il ne voit pas le garage **personnel** du chauffeur ni ses constats perso. |
| 4 | Comment retirer un membre ? | Action `fleet_admin`/`owner` → `status='removed'`. Révocation immédiate des accès flotte. Invitations en attente révocables (`organization_invites` supprimable). |
| 5 | Droits après départ d'un employé | Idem #2 : plus aucun accès flotte ; ses véhicules **perso** restent à lui ; les véhicules **d'org** restent à l'org. |
| 6 | Qui peut recevoir un PDF ? | Le conducteur **toujours** ; les `fleet_report_recipients` **actifs** de l'org du véhicule. Personne d'autre. Liste gérée par `fleet_admin`/`owner`. |
| 7 | Qui voit l'historique ? | `owner`/`fleet_admin` : métadonnées des constats **de l'org**. `driver` : ses propres constats. Aucun accès croisé entre orgs. |
| 8 | Chauffeur utilise un véhicule d'org hors autorisation | Le constat est tout de même valable (preuve d'accident) ; l'event est **loggé** (`auditLog`) ; l'admin le voit dans le dashboard et peut traiter en interne. boom.contact ne juge pas l'autorisation d'usage. |
| 9 | Logs d'accès | `auditLog` (existant) : qui consulte/exporte quoi, quand, IP. Réutilisé pour la flotte. |
| 10 | RGPD / nLPD | Base légale : exécution du contrat B2B + intérêt légitime (gestion sinistres). Données minimisées, consentement marketing distinct (déjà en place sur `users`). |
| 11 | Conservation données entreprise | Soft-delete (`deletedAt`) + politique de rétention configurable ; constats conservés pour la durée légale des procédures, puis purge. |
| 12 | Suppression compte vs conservation légale | Suppression du compte user → anonymisation des constats (le PDF reste à l'org comme preuve, sans rattachement nominatif si exigé). À arbitrer avec juriste. |

## 2. Stratégie — principes
1. **Moindre privilège** : chaque rôle n'a que le strict nécessaire (matrice §3).
2. **Filtrage serveur systématique** : aucune liste de véhicules/constats n'est filtrée côté client.
   Toute procédure tRPC flotte vérifie l'appartenance + le rôle avant de répondre.
3. **Séparation stricte perso / org** : un véhicule `organizationId=NULL` n'est jamais visible par un
   admin flotte ; un véhicule d'org n'apparaît jamais dans le garage d'un non-membre.
4. **Audit log** : création/suppression d'org, invitation, retrait, ajout véhicule, sélection véhicule
   dans constat, envoi PDF, consultation dashboard → tous loggés (`auditLog.detail` sans PII brute).
5. **Consentements** : le chauffeur est informé que les constats sur véhicule d'org sont partagés avec
   les responsables flotte (notice à l'étape de sélection « véhicule d'entreprise »).
6. **Notification destinataires** : tout envoi de PDF à un responsable est tracé ; le conducteur sait
   qui reçoit (transparence).

## 3. Matrice de permissions (MVP)
| Action | owner | fleet_admin | driver | broker_viewer¹ | insurer_viewer¹ |
| --- | :-: | :-: | :-: | :-: | :-: |
| Créer/supprimer l'org | ✓ | — | — | — | — |
| Gérer facturation / wallet | ✓ | lecture | — | — | — |
| Inviter / retirer membres | ✓ | ✓ | — | — | — |
| Ajouter / éditer véhicules d'org | ✓ | ✓ | — | — | — |
| Définir destinataires rapport | ✓ | ✓ | — | — | — |
| Utiliser véhicule d'org dans constat | ✓ | ✓ | ✓ | — | — |
| Voir métadonnées constats de l'org | ✓ | ✓ | (les siens) | lecture restreinte | lecture restreinte |
| Recevoir PDF | si destinataire | si destinataire | ✓ (le sien) | si destinataire | si destinataire |
| Voir garage perso d'un autre membre | — | — | — | — | — |

¹ Viewers = hors MVP (phase 12 mois), listés pour cadrer les droits dès maintenant.

## 4. Données sensibles — règles
- **Stockées (org)** : nom org, pays, véhicules (plaque/VIN dans `vehicles`, déjà chiffrées en transit),
  emails destinataires, ledger wallet.
- **Jamais dans l'audit log ni l'analytics** : plaque, VIN, email, contenu PDF, détails d'accident,
  adresse exacte (cf. analytics-event-taxonomy + sanitizeProps).
- **Accès constat** : strictement contrôlé par appartenance + rôle ; tout accès loggé.

## 5. À valider avec un juriste avant commercialisation B2B
- Contrat de sous-traitance RGPD (DPA) entre PEP's Swiss SA et l'entreprise cliente.
- Durées de rétention par juridiction (CH nLPD / UE RGPD).
- Sort des constats à la suppression d'un compte chauffeur (anonymisation vs conservation preuve).
