-- Permet d'inviter un employé (fiche HR dans `employees`) à se créer un
-- compte de connexion lié à sa fiche, pour accéder à /mon-espace. Réutilise
-- le flux restaurant_invites existant : quand l'invite porte un
-- employee_id, la redemption lie automatiquement employees.linked_user_id
-- au compte qui vient de rejoindre (lib/data/invites.ts:redeemInvite).

begin;

alter table restaurant_invites add column if not exists employee_id uuid references employees (id) on delete set null;

commit;
