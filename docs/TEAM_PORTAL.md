# Portail équipe et ambassadeurs (`/equipe`)

Espace interne web (`app/[locale]/equipe`) et iOS (`TeamMainView`) pour les employés Minerva Flow et les ambassadeurs actifs. Mis en place en octobre 2026.

## Qui voit quoi

| Rôle | Critère | Accès |
| --- | --- | --- |
| Membre d'équipe | `profiles.is_team_member = true` | Tout : métriques internes (restaurants, MRR, désabonnements, visiteurs), entonnoir GTM, objectifs du mois, Académie complète, annuaire des membres |
| Ambassadeur | `flow_ambassadors.status = 'active'` | Académie (sections non `teamOnly`), son propre profil. **Jamais** de revenus, MRR, désabonnements, objectifs ni entonnoir |

La restriction des ambassadeurs est appliquée à trois endroits, à ne pas relâcher : la page, la fonction de données et la route API (`resolveNativeTeamAccess` / `isTeamMember`). Les sections `teamOnly` de l'Académie sont retirées côté serveur (`lib/__tests__/team-academy.test.ts`).

## Connexion

- Web : `/equipe/connexion`, même moteur d'authentification et même design que la connexion normale.
- iOS : pas de connexion séparée. Après la connexion ordinaire, `loadTeamPortalContext` oriente les comptes équipe ou ambassadeur vers `TeamMainView`, avant les espaces propriétaire et client.

## Définitions des chiffres

- **Restaurant activé** : au moins un article de menu non brouillon **et** au moins un client (`team_funnel_counts()`, réservée au rôle service).
- **`restaurants.is_demo`** exclut des chiffres les restaurants de démonstration, de test et internes (le restaurant « Minerva Flow » du fondateur et son « Mon restaurant », migration `0171`). Les autres lignes « Mon restaurant » sont de vraies inscriptions et restent comptées.
- Les mois et jours sont découpés à l'heure de Montréal (`America/Toronto`).
- MRR à 0 $ n'est pas un bogue : la facturation Stripe est volontairement désactivée.

## Code

- Données : `lib/data/team-{portal,metrics,goals,academy,members}.ts`, `lib/team/{contributions,github-activity,gtm-focus,profile-writes}.ts`.
- UI web : `components/team-portal/*`. API pour iOS : `app/api/team/*`. Authentification Bearer : `lib/auth/native-team.ts`.
- Tables : `0168_team_portal_role.sql`, `0169_team_internal_tables.sql`, `0170_team_funnel_and_demo_flag.sql`.
- Tests : `lib/__tests__/{team-academy,contributions,profile-writes,gtm-focus}.test.ts`.

## Configuration optionnelle

- `POSTHOG_PERSONAL_API_KEY` : visiteurs uniques. Sans clé, la carte l'indique au lieu d'afficher un chiffre.
- `GITHUB_ACTIVITY_TOKEN` : augmente la limite de l'API GitHub pour l'activité des profils.

## Réserves sur le contenu

`docs/GTM_GOOGLE_MAPS_STRATEGY.md` contient des « constats terrain » non mesurés (adoption, conversion, CAC, rétention) : ne pas les citer comme résultats. Il décrit aussi une commission « récurrente », alors que le code et la page publique prévoient 10 % de la **première** facture payée seulement.
