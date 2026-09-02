-- Backs the new category detail page (/finance/categories/[id]) — explains
-- what the category is for, not just its name.
alter table expense_categories add column if not exists description text;
