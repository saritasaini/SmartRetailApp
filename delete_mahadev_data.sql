DO $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Get the user ID
  SELECT id INTO target_user_id FROM auth.users WHERE email = 'mahadev123@gmail.com' LIMIT 1;
  
  IF target_user_id IS NOT NULL THEN
    -- Delete related data safely (if ON DELETE CASCADE is missing)
    
    -- 1. Delete order items for this company's orders
    DELETE FROM public.order_items WHERE order_id IN (SELECT id FROM public.orders WHERE company_id = target_user_id);
    
    -- 2. Delete payments
    DELETE FROM public.payments WHERE company_id = target_user_id;
    
    -- 3. Delete orders
    DELETE FROM public.orders WHERE company_id = target_user_id;
    
    -- 4. Delete products
    DELETE FROM public.products WHERE company_id = target_user_id;
    
    -- 5. Delete categories
    DELETE FROM public.categories WHERE company_id = target_user_id;
    
    -- 6. Delete company members (staff)
    DELETE FROM public.company_members WHERE company_id = target_user_id;
    
    -- 7. Delete system logs
    DELETE FROM public.system_logs WHERE company_id = target_user_id;
    
    -- 8. Delete this company's customers (retailers) from profiles and auth.users
    -- (This deletes the customer auth accounts linked to this company)
    DELETE FROM auth.users WHERE id IN (SELECT id FROM public.profiles WHERE company_id = target_user_id);
    DELETE FROM public.profiles WHERE company_id = target_user_id;
    
    -- 9. Delete the company profile itself
    DELETE FROM public.profiles WHERE id = target_user_id;
    
    -- 10. Delete the company from authentication
    DELETE FROM auth.users WHERE id = target_user_id;
    
    RAISE NOTICE 'Successfully deleted mahadev123@gmail.com and all associated data.';
  ELSE
    RAISE NOTICE 'User mahadev123@gmail.com not found.';
  END IF;
END $$;
