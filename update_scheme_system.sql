-- 1. Add schema columns to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS scheme_type TEXT DEFAULT 'none'; -- none, percentage, flat, bogo
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS scheme_value NUMERIC DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS scheme_buy_qty INTEGER DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS scheme_get_qty INTEGER DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS scheme_start_date DATE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS scheme_end_date DATE;

-- Drop the old is_special_offer if it exists (Optional, uncomment if needed)
-- ALTER TABLE public.products DROP COLUMN IF EXISTS is_special_offer;

-- 2. Add snapshot columns to order_items table
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS applied_scheme_type TEXT DEFAULT 'none';
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS applied_scheme_value NUMERIC DEFAULT 0;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS free_quantity INTEGER DEFAULT 0;

-- 3. Create or Replace the Server-Side Verification Trigger for Order Items
-- This trigger runs BEFORE INSERT on order_items. It recalculates the price based on active schemes
-- to prevent any tampering from the client side.
CREATE OR REPLACE FUNCTION verify_and_apply_order_item_scheme()
RETURNS TRIGGER AS $$
DECLARE
  v_product RECORD;
  v_free_qty INTEGER := 0;
  v_final_price NUMERIC;
BEGIN
  -- Fetch the product details and lock the row for reading
  SELECT * INTO v_product FROM public.products WHERE id = NEW.product_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  -- Default the final price to the regular product price
  v_final_price := v_product.price;
  
  -- Record the applied scheme as 'none' initially
  NEW.applied_scheme_type := 'none';
  NEW.applied_scheme_value := 0;
  NEW.free_quantity := 0;

  -- Check if there is an active scheme
  IF v_product.scheme_type != 'none' THEN
    -- Check date validity
    IF (v_product.scheme_start_date IS NULL OR CURRENT_DATE >= v_product.scheme_start_date) AND
       (v_product.scheme_end_date IS NULL OR CURRENT_DATE <= v_product.scheme_end_date) THEN
       
       -- Scheme is valid. Apply it.
       NEW.applied_scheme_type := v_product.scheme_type;
       NEW.applied_scheme_value := v_product.scheme_value;

       IF v_product.scheme_type = 'percentage' THEN
         -- Ensure discount doesn't exceed 100%
         IF v_product.scheme_value > 100 THEN
            v_final_price := 0;
         ELSE
            v_final_price := v_product.price * (1 - (v_product.scheme_value / 100.0));
         END IF;
         
       ELSIF v_product.scheme_type = 'flat' THEN
         v_final_price := v_product.price - v_product.scheme_value;
         
       ELSIF v_product.scheme_type = 'bogo' THEN
         -- Calculate free quantity: floor(cart_quantity / buy_qty) * get_qty
         IF v_product.scheme_buy_qty > 0 THEN
            v_free_qty := FLOOR(NEW.quantity / v_product.scheme_buy_qty) * v_product.scheme_get_qty;
            NEW.free_quantity := v_free_qty;
         END IF;
       END IF;

    END IF;
  END IF;

  -- Ensure price doesn't go below 0 and is rounded to 2 decimals
  IF v_final_price < 0 THEN
    v_final_price := 0;
  END IF;
  
  -- Override the price_at_order sent by frontend with our server-calculated price
  NEW.price_at_order := ROUND(v_final_price, 2);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_verify_order_item_scheme ON public.order_items;

-- Create the trigger
CREATE TRIGGER trigger_verify_order_item_scheme
BEFORE INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION verify_and_apply_order_item_scheme();

-- 4. Update the stock deduction trigger to account for free items
CREATE OR REPLACE FUNCTION update_stock_on_order()
RETURNS TRIGGER AS $$
BEGIN
  -- We deduct both the purchased quantity AND the free quantity
  UPDATE public.products
  SET stock_quantity = stock_quantity - (NEW.quantity + COALESCE(NEW.free_quantity, 0))
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update the restock on cancel trigger to restock free items too
CREATE OR REPLACE FUNCTION restock_on_cancel()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    -- Restock all items for this order including free items
    UPDATE public.products
    SET stock_quantity = stock_quantity + (oi.quantity + COALESCE(oi.free_quantity, 0))
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id AND public.products.id = oi.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
