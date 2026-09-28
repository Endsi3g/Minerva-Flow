-- Preserve the guest's delivery destination when a paid service quote is
-- atomically converted into its production order.
create or replace function complete_service_quote_payment(
  p_quote_id uuid,
  p_checkout_session_id text,
  p_payment_intent_id text
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_quote service_quotes%rowtype;
  v_order_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_quote_id::text, 0));
  select * into v_quote from service_quotes where id = p_quote_id for update;
  if not found then raise exception 'service_quote_not_found' using errcode = 'P0002'; end if;
  if v_quote.converted_order_id is not null then return v_quote.converted_order_id; end if;
  if v_quote.status <> 'quoted' or v_quote.checkout_session_id is distinct from p_checkout_session_id then
    raise exception 'service_quote_payment_not_expected' using errcode = '22023';
  end if;
  if v_quote.total is null or v_quote.deposit_amount is null or v_quote.deposit_amount <= 0 then
    raise exception 'service_quote_amount_invalid' using errcode = '22023';
  end if;

  insert into orders (
    restaurant_id, status, guest_name, guest_phone, subtotal, tax_amount, total,
    payment_method, payment_status, stripe_payment_intent_id, paid_at,
    fulfillment_mode, delivery_address, is_public_request, customer_id, notes,
    requested_ready_at, order_kind, deposit_paid_amount
  ) values (
    v_quote.restaurant_id, 'confirmee', v_quote.guest_name, v_quote.guest_phone,
    v_quote.subtotal, v_quote.tax_amount, v_quote.total, 'Carte (Stripe)',
    case when v_quote.deposit_amount >= v_quote.total then 'paye'::order_payment_status
      else 'en_attente'::order_payment_status end,
    p_payment_intent_id, now(),
    case when v_quote.fulfillment_mode = 'livraison' then 'livraison' else 'sur_place' end,
    case when v_quote.fulfillment_mode = 'livraison' then v_quote.delivery_address else null end,
    true, v_quote.customer_id,
    concat_ws(E'\n', nullif(v_quote.client_notes, ''), nullif(v_quote.owner_notes, ''),
      case when v_quote.deposit_amount < v_quote.total then 'Acompte encaissé : ' || v_quote.deposit_amount::text || ' ' || v_quote.currency else null end),
    v_quote.event_at,
    case when v_quote.quote_type = 'catering' then 'catering' else 'custom' end,
    v_quote.deposit_amount
  ) returning id into v_order_id;

  insert into order_items (order_id, item_name, unit_price, quantity, notes)
  select v_order_id, l.name, l.unit_price, l.quantity, l.description
  from service_quote_lines l where l.quote_id = p_quote_id order by l.sort_order, l.created_at;

  update service_quotes set
    status = 'converted',
    stripe_payment_intent_id = p_payment_intent_id,
    accepted_at = now(),
    converted_order_id = v_order_id,
    updated_at = now()
  where id = p_quote_id;
  return v_order_id;
end;
$$;

revoke all on function complete_service_quote_payment(uuid, text, text) from public, anon, authenticated;
grant execute on function complete_service_quote_payment(uuid, text, text) to service_role;
