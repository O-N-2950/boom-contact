# Legal / Store — Final Checklist (boom.contact)

Sources : `legal-handoff-final.md`, `legal-handoff-for-lawyer.md`. Validation **juriste requise** avant lancement public.

| Élément | État | Note |
|---|---|---|
| CGU accessibles in-app | ✅ vue `cgu` | Confirmer lien depuis onboarding + compte |
| Politique de confidentialité | ✅ vue `?privacy=true` + sitemap | Doit couvrir audio/photos/localisation/flotte/processors |
| Rétention & suppression données | ⚠️ | Documenter durées + **bouton suppression compte** (exigé Apple 5.1.1(v) & Google) — P0 |
| Disclaimer urgence | ✅ requis | "Ne remplace pas la police, les secours, l'assureur ou un avocat" visible |
| Consentements (caméra/micro/localisation/signature/paiement) | ✅ natif + in-app | Vérifier wording et timing du consentement analytics — P0 |
| Wording PDF horodaté | ✅ neutralisé | "horodaté" / "à transmettre à l'assureur" ; éviter toute formulation de portée juridique absolue, de validation officielle ou de couverture géographique universelle |
| Absence de claim interdit | ✅ check:claims vert | A_BLOCKING=0 dans quality gate |
| Signature électronique | ⚠️ | Présenter comme accord entre parties, pas comme signature légalement qualifiée |
| Données B2B / flotte | ⚠️ | CGU doivent couvrir le partage org (membres, crédits) |
| Paiement Stripe | ✅ | L'app ne stocke pas de carte ; mentionner Stripe comme processor |

## Points bloquants avant public (P0)
1. **Bouton suppression de compte** in-app fonctionnel.
2. **Consentement analytics** effectif avant tout event (PostHog/GA4).
3. **Validation juriste** des CGU/Privacy (couverture audio/localisation/flotte/processors + disclaimers).

## Non bloquant pour TestFlight/Internal Testing
Les tests internes peuvent démarrer avant la validation juriste finale, mais **pas la soumission publique**.
