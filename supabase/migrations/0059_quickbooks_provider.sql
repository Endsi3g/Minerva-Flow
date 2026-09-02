-- Adds QuickBooks as a pos_connections provider — same OAuth-token-in-Vault
-- pattern as Square/Lightspeed, used here for expense sync rather than
-- point-of-sale, matching how "Comptes & Intégrations" already treats
-- pos_connections as the general external-financial-source table.
alter type pos_provider add value if not exists 'quickbooks';
