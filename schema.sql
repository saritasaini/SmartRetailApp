-- 1. Create company_members table
CREATE TABLE IF NOT EXISTS public.company_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Staff',
    salary TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    join_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Setup RLS for company_members
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies can view their own members" 
ON public.company_members FOR SELECT 
USING (auth.uid() = company_id);

CREATE POLICY "Companies can insert their own members" 
ON public.company_members FOR INSERT 
WITH CHECK (auth.uid() = company_id);

CREATE POLICY "Companies can update their own members" 
ON public.company_members FOR UPDATE 
USING (auth.uid() = company_id);

CREATE POLICY "Companies can delete their own members" 
ON public.company_members FOR DELETE 
USING (auth.uid() = company_id);


-- 2. Create system_logs table
CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    details TEXT NOT NULL,
    user_name TEXT NOT NULL DEFAULT 'System',
    type TEXT NOT NULL DEFAULT 'info', -- success, warning, info, error
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Setup RLS for system_logs
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies can view their own logs" 
ON public.system_logs FOR SELECT 
USING (auth.uid() = company_id);

CREATE POLICY "Companies can insert their own logs" 
ON public.system_logs FOR INSERT 
WITH CHECK (auth.uid() = company_id);

-- 3. Database Triggers for Automatic Stock Management
-- This function automatically deducts stock when a new order item is inserted
CREATE OR REPLACE FUNCTION update_stock_on_order()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.products
  SET stock_quantity = stock_quantity - NEW.quantity
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_stock_on_order ON public.order_items;

CREATE TRIGGER trigger_update_stock_on_order
AFTER INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION update_stock_on_order();

-- This function automatically restores stock if an order is cancelled
CREATE OR REPLACE FUNCTION restock_on_cancel()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    -- Restock all items for this order
    UPDATE public.products
    SET stock_quantity = stock_quantity + oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id AND public.products.id = oi.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_restock_on_cancel ON public.orders;

CREATE TRIGGER trigger_restock_on_cancel
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION restock_on_cancel();


-- Create automatic payment for COD orders when delivered
CREATE OR REPLACE FUNCTION create_payment_on_cod_delivery()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' AND NEW.payment_method = 'cod' THEN
    INSERT INTO public.payments (company_id, customer_id, amount, payment_method, status, notes)
    VALUES (NEW.company_id, NEW.customer_id, NEW.total_amount, 'cash', 'verified', 'Auto-generated for Order ' || left(NEW.id::text, 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_payment_on_delivery ON public.orders;

CREATE TRIGGER trigger_payment_on_delivery
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION create_payment_on_cod_delivery();


-- Add order_id to payments
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;

-- Update COD Trigger to link order_id
CREATE OR REPLACE FUNCTION create_payment_on_cod_delivery()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' AND NEW.payment_method = 'cod' THEN
    INSERT INTO public.payments (company_id, customer_id, amount, payment_method, status, notes, order_id)
    VALUES (NEW.company_id, NEW.customer_id, NEW.total_amount, 'cash', 'verified', 'Auto-generated for Order ' || left(NEW.id::text, 8), NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reject pending and verified payments if order is cancelled
CREATE OR REPLACE FUNCTION reject_payment_on_order_cancel()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    UPDATE public.payments 
    SET status = 'rejected', notes = COALESCE(notes, '') || ' (Order Cancelled)' 
    WHERE order_id = NEW.id AND status IN ('pending', 'verified');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_reject_payment ON public.orders;
CREATE TRIGGER trigger_reject_payment
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION reject_payment_on_order_cancel();

-- ==========================================
-- UAT FIXES: Cascade Deletes & Constraints
-- ==========================================

-- Fix Point 3: Negative Price and Stock Validation
ALTER TABLE public.products ADD CONSTRAINT products_price_check CHECK (price >= 0);
ALTER TABLE public.products ADD CONSTRAINT products_stock_check CHECK (stock_quantity >= 0);

-- Fix Point 2: Cascading Deletes for Company
-- When a company is deleted from auth.users, automatically delete all related data

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_company_id_fkey;
ALTER TABLE public.products ADD CONSTRAINT products_company_id_fkey FOREIGN KEY (company_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_company_id_fkey;
ALTER TABLE public.orders ADD CONSTRAINT orders_company_id_fkey FOREIGN KEY (company_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_company_id_fkey;
ALTER TABLE public.categories ADD CONSTRAINT categories_company_id_fkey FOREIGN KEY (company_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_company_id_fkey;
ALTER TABLE public.payments ADD CONSTRAINT payments_company_id_fkey FOREIGN KEY (company_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_company_id_fkey;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_company_id_fkey FOREIGN KEY (company_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Ensure order_items cascade when an order is deleted
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_order_id_fkey;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

-- Fix Point 1: Duplicate Phone Protection
ALTER TABLE public.profiles ADD CONSTRAINT profiles_phone_key UNIQUE (phone);

-- Fix Point 4: Product Soft Delete
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- ==========================================
-- DEEP SECURITY SCENARIO FIXES
-- ==========================================

-- 1. Negative Quantity Protection
ALTER TABLE public.order_items ADD CONSTRAINT order_items_quantity_check CHECK (quantity > 0);

-- 2. Secure Server-Side Order Placement (RPC)
-- This ensures total amount is calculated securely on the server and orders/items/payments are atomic
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
  v_item_price DECIMAL(10,2);
BEGIN
  -- 1. Calculate the total amount securely from the database
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INT)
  LOOP
    IF v_item.quantity <= 0 THEN
      RAISE EXCEPTION 'Quantity must be greater than 0';
    END IF;

    SELECT * INTO v_product FROM public.products WHERE id = v_item.product_id AND is_active = true FOR UPDATE;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product % not found or inactive', v_item.product_id;
    END IF;

    IF v_product.stock_quantity < v_item.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for product %', v_product.name;
    END IF;

    v_total_amount := v_total_amount + (v_product.price * v_item.quantity);
  END LOOP;

  -- 2. Create the order
  INSERT INTO public.orders (customer_id, company_id, total_amount, status, payment_method)
  VALUES (p_customer_id, p_company_id, v_total_amount, 'pending', p_payment_method)
  RETURNING id INTO v_order_id;

  -- 3. Create order items
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INT)
  LOOP
    SELECT price INTO v_item_price FROM public.products WHERE id = v_item.product_id;
    
    INSERT INTO public.order_items (order_id, product_id, quantity, price_at_order)
    VALUES (v_order_id, v_item.product_id, v_item.quantity, v_item_price);
    -- Note: The trigger update_stock_on_order will automatically run and deduct stock.
  END LOOP;

  -- 4. Create UPI Payment record if applicable
  IF p_payment_method = 'upi' THEN
    INSERT INTO public.payments (company_id, customer_id, amount, payment_method, status, notes, order_id)
    VALUES (
      p_company_id, 
      p_customer_id, 
      v_total_amount, 
      'upi', 
      'pending', 
      'Ref: ' || COALESCE(p_upi_ref, 'N/A') || ' - For Order ' || left(v_order_id::text, 8),
      v_order_id
    );
  END IF;

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
