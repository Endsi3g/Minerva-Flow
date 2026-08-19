-- ═══════════════════════════════════════════════════════════════════════
-- Prospects — audit du site web du prospect
--
-- Rapport best-effort (vitesse, mobile, menu en ligne, réservation en
-- ligne, etc.) généré à la demande par un admin depuis la fiche prospect,
-- pour servir d'argument de vente. Stocké tel quel (jsonb) plutôt que
-- normalisé — c'est un instantané jetable, pas une donnée interrogée.
-- ═══════════════════════════════════════════════════════════════════════

alter table prospects
  add column if not exists audit_report jsonb,
  add column if not exists audit_generated_at timestamptz;
