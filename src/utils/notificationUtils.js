import { supabase } from '../lib/supabase';

/**
 * Sends a notification by inserting it into the Supabase notifications table.
 * 
 * @param {Object} params - The notification parameters
 * @param {string} params.recipient_type - 'customer', 'company', or 'super_admin'
 * @param {string|null} params.recipient_id - UUID of the recipient (null for super_admin)
 * @param {string} params.type - Category of notification (e.g., 'new_order', 'payment_verified', 'offer')
 * @param {string} params.title - Short title of the notification
 * @param {string} params.message - Detailed message
 * @param {string|null} params.reference_id - UUID of the related entity (order id, payment id, etc.)
 * @param {string|null} params.reference_type - 'order', 'payment', 'product', etc.
 */
export const sendNotification = async ({
  recipient_type,
  recipient_id,
  type,
  title,
  message,
  reference_id = null,
  reference_type = null
}) => {
  try {
    const { error } = await supabase.from('notifications').insert([{
      recipient_type,
      recipient_id,
      type,
      title,
      message,
      reference_id,
      reference_type,
      is_read: false
    }]);

    if (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  } catch (err) {
    console.error('Failed to send notification:', err);
  }
};

/**
 * Sends notifications to all active customers of a specific company.
 * Useful for fan-out events like new offers.
 */
export const sendFanOutNotificationToCustomers = async ({
  company_id,
  type,
  title,
  message,
  reference_id = null,
  reference_type = null
}) => {
  try {
    // 1. Fetch all active customers for this company
    const { data: customers, error: fetchError } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'customer')
      .eq('company_id', company_id)
      .eq('is_approved', true);

    if (fetchError) throw fetchError;
    if (!customers || customers.length === 0) return;

    // 2. Prepare bulk insert payload
    const notifications = customers.map(customer => ({
      recipient_type: 'customer',
      recipient_id: customer.id,
      type,
      title,
      message,
      reference_id,
      reference_type,
      is_read: false
    }));

    // 3. Bulk insert
    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (insertError) throw insertError;
  } catch (err) {
    console.error('Failed to send fan-out notifications:', err);
  }
};
