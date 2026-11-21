export const sendOrderStatusNotification = async (
  customerEmail: string,
  customerName: string,
  pizzaName: string,
  status: 'accepted' | 'rejected'
): Promise<boolean> => {
  try {
    console.log(`[Notification Service] Sending email to ${customerEmail}...`);
    console.log(
      `[Email Preview] Hi ${customerName}, your order for "${pizzaName}" has been ${status.toUpperCase()} by the pizzeria kitchen!`
    );
    return true;
  } catch (error) {
    console.error('[Notification Service] Error sending email notification:', error);
    return false;
  }
};
