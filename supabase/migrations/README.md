# Migrations Supabase

Numérotation séquentielle `NNNN_description.sql`, une migration par changement, idempotente dans la mesure du possible (`if not exists`, `or replace`, `on conflict`).

## Points à connaître

- Le registre `supabase_migrations.schema_migrations` de la base utilise des versions horodatées pour les migrations appliquées via l'outil Supabase; les fichiers de ce dossier utilisent la numérotation séquentielle. Les noms correspondent, pas les versions : ne pas supposer qu'un fichier est appliqué parce que son numéro est absent du registre.
- **Doublon historique** : `0102_menu_and_offer_review_photos.sql` et `0102_pos_item_mappings_and_orders_idempotency.sql` (déjà appliquées toutes deux). Ne pas les renommer.
- **`0167_blog_posts.sql` n'est pas appliquée** à la base de production (état au 2026-10-03). Elle appartient au chantier blog/SEO.
- Les migrations `0168` à `0173` (portail équipe, drapeau `is_demo`, audience du changelog, droits des fonctions internes) ont été appliquées directement en base puis consignées ici. Elles ont été renumérotées pour lever un doublon `0167`.
- `0174` à `0177` (coordonnées de démonstration, fréquence « Fréquent », bonus d'installation de l'app, notes de convives réservées à l'équipe) ont aussi été appliquées directement en base.
- `0178` (protection des colonnes de solde d'une fiche client) a été appliquée directement en base.
- `0179` (colonne `customers.preferred_language`, `fr` par défaut, `fr|en`) a été appliquée directement en base le 2026-10-05. Les courriels et notifications destinés aux clients doivent la lire; aucune route ne l'alimente encore.
- `0185` (déclencheur de stock bas : un article d'inventaire sans seuil `par_level` ne doit plus échouer) appliquée directement en base le 2026-10-10 après test avec la session propriétaire.
- `0186` (`device_push_tokens.apns_environment` : l'app indique si son jeton APNs est « sandbox » ou « production ») appliquée directement en base le 2026-10-10. Colonne nullable : les anciens jetons gardent le comportement par défaut (variable `APNS_ENVIRONMENT`, puis essai de l'autre serveur).
- `0187` (`owner_overview_insights(restaurant, jours)` : série quotidienne des ventes, heures de pointe, meilleurs articles et activité de la semaine pour l'Aperçu iOS; `SECURITY INVOKER`, donc soumise aux RLS) appliquée directement en base le 2026-10-10.
- `0188` (`owner_finance_summary(restaurant, jours)` : série quotidienne revenus/dépenses, dépenses par catégorie, comparaison à la période précédente et transactions récentes pour l'écran Finances iOS; `SECURITY INVOKER`) appliquée directement en base le 2026-10-10.
- `0189` (`orders.owner_message`, `owner_message_at`, `review_requested_at` : note du propriétaire au client et demande d'avis Google 30 min après « Prête ») appliquée directement en base le 2026-10-10.
- `0190` (`offers.announced_at` : une offre publiée depuis le téléphone ne notifie les clients qu'une seule fois) appliquée directement en base le 2026-10-10.
- `0191_changelog_owner_app_1_2_DRAFT.sql` : **brouillon, non appliqué**. Entrée de journal des mises à jour (propriétaire) à publier avec la version, après vérification du build exact.
- Un seul prochain numéro à la fois : vérifier `ls supabase/migrations | tail` avant d'en créer une, pour ne pas dupliquer un numéro.

## Autres fichiers SQL

- `supabase/staging/full_staging_schema.sql` : script consolidé des 133 premières migrations pour le projet de préproduction `lhosxxtvgmedwarwgjhb`. Il est figé et n'est **pas** à jour (il y a désormais plus de 170 migrations); la source de vérité est ce dossier.
- `scripts/db/apply_staging_migrations.py` : applique les migrations manquantes via l'API de gestion Supabase (HTTPS, jeton `SUPABASE_ACCESS_TOKEN`).
- `scripts/db/apply-migration-0125.sh` : ancien script ponctuel, **déjà joué**. Il exécute `supabase db push --linked`, qui appliquerait **toutes** les migrations en attente, y compris `0167_blog_posts.sql`. Ne pas le relancer.
