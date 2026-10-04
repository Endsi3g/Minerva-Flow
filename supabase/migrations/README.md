# Migrations Supabase

Numérotation séquentielle `NNNN_description.sql`, une migration par changement, idempotente dans la mesure du possible (`if not exists`, `or replace`, `on conflict`).

## Points à connaître

- Le registre `supabase_migrations.schema_migrations` de la base utilise des versions horodatées pour les migrations appliquées via l'outil Supabase; les fichiers de ce dossier utilisent la numérotation séquentielle. Les noms correspondent, pas les versions : ne pas supposer qu'un fichier est appliqué parce que son numéro est absent du registre.
- **Doublon historique** : `0102_menu_and_offer_review_photos.sql` et `0102_pos_item_mappings_and_orders_idempotency.sql` (déjà appliquées toutes deux). Ne pas les renommer.
- **`0167_blog_posts.sql` n'est pas appliquée** à la base de production (état au 2026-10-03). Elle appartient au chantier blog/SEO.
- Les migrations `0168` à `0173` (portail équipe, drapeau `is_demo`, audience du changelog, droits des fonctions internes) ont été appliquées directement en base puis consignées ici. Elles ont été renumérotées pour lever un doublon `0167`.
- `0174` à `0177` (coordonnées de démonstration, fréquence « Fréquent », bonus d'installation de l'app, notes de convives réservées à l'équipe) ont aussi été appliquées directement en base.
- Un seul prochain numéro à la fois : vérifier `ls supabase/migrations | tail` avant d'en créer une, pour ne pas dupliquer un numéro.

## Autres fichiers SQL

- `supabase/staging/full_staging_schema.sql` : script consolidé des 133 premières migrations pour le projet de préproduction `lhosxxtvgmedwarwgjhb`. Il est figé et n'est **pas** à jour (il y a désormais plus de 170 migrations); la source de vérité est ce dossier.
- `scripts/db/apply_staging_migrations.py` : applique les migrations manquantes via l'API de gestion Supabase (HTTPS, jeton `SUPABASE_ACCESS_TOKEN`).
- `scripts/db/apply-migration-0125.sh` : ancien script ponctuel, **déjà joué**. Il exécute `supabase db push --linked`, qui appliquerait **toutes** les migrations en attente, y compris `0167_blog_posts.sql`. Ne pas le relancer.
