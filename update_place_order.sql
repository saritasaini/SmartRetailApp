-- Update the place_order RPC to calculate the total amount from the discounted order items.
CREATE OR REPLACE FUNCTION place_order(
  p_customer_id UUID,
  p_company_id UUID,
  p_payment_method TEXT,
  p_items JSONB,
  p_upi_ref TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_order_id UUID;
  v_total_amount DECIMAL(10,2) := 0;
  v_item RECORD;
  v_product RECORD;
BEGIN
  -- 1. Validate stock and items
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INT)
  LOOP
    IF v_item.quantity <= 0 THEN
      RAISE EXCEPTION 'Quantity must be greater than 0';
    END IF;

    SELECT * INTO v_product FROM public.products WHERE id = v_item.product_id AND is_active = true FOR UPDATE;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product % not found or inactive', v_item.product_id;
    END IF;

    -- Note: We only check basic stock here. The trigger will handle free quantity deduction.
    IF v_product.stock_quantity < v_item.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for product %', v_product.name;
    END IF;
  END LOOP;

  -- 2. Create the order with 0 total initially
  INSERT INTO public.orders (customer_id, company_id, total_amount, status, payment_method)
  VALUES (p_customer_id, p_company_id, 0, 'pending', p_payment_method)
  RETURNING id INTO v_order_id;

  -- 3. Create order items (The trigger on order_items will compute the correct price_at_order and free_quantity)
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INT)
  LOOP
    INSERT INTO public.order_items (order_id, product_id, quantity, price_at_order)
    VALUES (v_order_id, v_item.product_id, v_item.quantity, 0); 
  END LOOP;

  -- 4. Calculate the actual total amount based on the prices set by the trigger
  SELECT COALESCE(SUM(quantity * price_at_order), 0) INTO v_total_amount
  FROM public.order_items
  WHERE order_id = v_order_id;

  -- Update the order with the correct total amount
  UPDATE public.orders SET total_amount = v_total_amount WHERE id = v_order_id;

  -- 5. Create UPI Payment record if applicable
  IF p_payment_method = 'upi' THEN
    INSERT INTO public.payments (company_id, customer_id, amount, payment_method, status, notes, order_id)
    VALUES (p_company_id, p_customer_id, v_total_amount, p_payment_method, 'pending', 'UPI Ref: ' || p_upi_ref, v_order_id);
  END IF;

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
