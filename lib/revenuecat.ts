const REVENUECAT_SECRET_API_KEY = process.env.REVENUECAT_SECRET_API_KEY ?? '';
const REVENUECAT_API_BASE = 'https://api.revenuecat.com/v1';

export function requireRevenueCatSecretKey(): void {
  if (!REVENUECAT_SECRET_API_KEY) {
    throw new Error('REVENUECAT_SECRET_API_KEY is not configured');
  }
}

// Permanently deletes a subscriber from RevenueCat — cannot be undone.
// RevenueCat's app_user_id is set to ClearSlot's own users.id (via
// Purchases.logIn on mobile), so the two are always the same value, no
// separate lookup needed. Called from the account-deletion route before the
// local users row is deleted, real GDPR/CCPA erasure means RevenueCat's own
// copy has to go too, not just ClearSlot's database.
export async function deleteRevenueCatSubscriber(userId: string): Promise<void> {
  requireRevenueCatSecretKey();

  const res = await fetch(`${REVENUECAT_API_BASE}/subscribers/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${REVENUECAT_SECRET_API_KEY}`,
    },
  });

  // A 404 means RevenueCat has no record of this user (never subscribed,
  // or already deleted) — not a failure worth blocking account deletion on.
  if (!res.ok && res.status !== 404) {
    throw new Error(`RevenueCat subscriber deletion failed with status ${res.status}`);
  }
}
