-- Persists the Finance "Simulateur de Seuil de Rentabilité" assumptions
-- (fixed costs, gross margin %, average basket) per restaurant so the
-- simulator survives a reload and — per the product spec — the daily
-- client target it computes can be reflected back on Overview. Previously
-- this simulator was pure client-side useState with hardcoded defaults,
-- so adjusting it on /finance had no effect anywhere else in the app.
-- Nullable: a restaurant that hasn't touched the simulator yet falls back
-- to the same sensible defaults the component always used.
alter table restaurants add column if not exists break_even_fixed_costs numeric;
alter table restaurants add column if not exists break_even_gross_margin_pct numeric;
alter table restaurants add column if not exists break_even_avg_basket numeric;
