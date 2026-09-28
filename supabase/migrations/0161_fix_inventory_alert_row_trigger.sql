-- Repair staging databases that applied 0159 before its row-level trigger
-- clause was corrected. The trigger reads NEW/OLD inventory row values.
drop trigger if exists inventory_notify_low_stock on public.inventory_items;
create trigger inventory_notify_low_stock
  after insert or update of quantity_on_hand, par_level on public.inventory_items
  for each row
  execute function public.notify_inventory_low_stock();
