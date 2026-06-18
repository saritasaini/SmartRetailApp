-- Function to permanently delete a company and ALL related data
CREATE OR REPLACE FUNCTION public.delete_company_permanently(target_company_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Delete all payments related to the company
  DELETE FROM public.payments WHERE company_id = target_company_id;

  -- 2. Delete all system logs
  DELETE FROM public.system_logs WHERE company_id = target_company_id;

  -- 3. Delete order items (through orders)
  DELETE FROM public.order_items WHERE order_id IN (SELECT id FROM public.orders WHERE company_id = target_company_id);

  -- 4. Delete orders
  DELETE FROM public.orders WHERE company_id = target_company_id;

  -- 5. Delete products
  DELETE FROM public.products WHERE company_id = target_company_id;

  -- 6. Delete categories
  DELETE FROM public.categories WHERE company_id = target_company_id;

  -- 7. Delete customers (profiles associated with this company)
  DELETE FROM public.profiles WHERE company_id = target_company_id AND role = 'customer';

  -- 8. Delete company members
  DELETE FROM public.company_members WHERE company_id = target_company_id;

  -- 9. Finally, delete the company's own user record from auth.users
  -- (This will also automatically delete their own row in public.profiles due to the ON DELETE CASCADE we usually have)
  DELETE FROM auth.users WHERE id = target_company_id;
END;
$$;
