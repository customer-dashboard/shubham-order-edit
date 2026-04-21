import { authenticate, sessionStorage } from "../shopify.server";
import { cancelSubscription } from "../mongodb.server";

export const action = async ({ request }) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Cancel subscription in MongoDB
  try {
    await cancelSubscription(shop);
    console.log(`Cancelled subscription for ${shop} in MongoDB`);
  } catch (e) {
    console.error(`Failed to cancel subscription for ${shop} in MongoDB:`, e);
  }

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // If this webhook already ran, the session may have been deleted previously.
  if (session) {
    const sessions = await sessionStorage.findSessionsByShop(shop);
    const sessionIds = sessions.map((s) => s.id);
    if (sessionIds.length > 0) {
      await sessionStorage.deleteSessions(sessionIds);
    }
  }

  return new Response();
};
