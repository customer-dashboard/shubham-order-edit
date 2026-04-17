import { authenticate, sessionStorage } from "../shopify.server";

export const action = async ({ request }) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

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
