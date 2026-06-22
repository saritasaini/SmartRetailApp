import { supabase } from './supabase';

/**
 * Log actions for a specific company (System Logs)
 */
export const logCompanyAction = async ({ companyId, action, details, userName = 'System', type = 'info' }) => {
  try {
    const { error } = await supabase.from('system_logs').insert([{
      company_id: companyId,
      action,
      details,
      user_name: userName,
      type
    }]);

    if (error) {
      console.error("Failed to insert company log:", error);
    }
  } catch (err) {
    console.error("Exception logging company action:", err);
  }
};

/**
 * Log actions for Super Admin (Audit Trail)
 */
export const logSuperAdminAction = async ({ type, title, desc, userInitials = 'SA', color = 'blue', icon = 'fas fa-info-circle' }) => {
  try {
    const { error } = await supabase.from('super_admin_logs').insert([{
      type,
      title,
      "desc": desc,
      user_initials: userInitials,
      color,
      icon
    }]);

    if (error) {
      console.error("Failed to insert super admin log:", error);
    }
  } catch (err) {
    console.error("Exception logging super admin action:", err);
  }
};
