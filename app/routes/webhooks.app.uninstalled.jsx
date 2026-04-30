import { authenticate, sessionStorage } from "../shopify.server";
import { logUninstallation } from "../mongodb.server";

export const action = async ({ request }) => {
  const { shop, session, topic, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // 1. Mark subscription as uninstalled and log activity in MongoDB
  try {
    await logUninstallation(shop, payload);
    console.log(`Logged uninstallation for ${shop}`);
  } catch (e) {
    console.error(`Failed to log uninstallation for ${shop}:`, e);
  }

  // 2. Clean up sessions
  if (session) {
    const sessions = await sessionStorage.findSessionsByShop(shop);
    const sessionIds = sessions.map((s) => s.id);
    if (sessionIds.length > 0) {
      await sessionStorage.deleteSessions(sessionIds);
    }
  }

  return new Response();
};
