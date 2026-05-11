import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { shop, topic, payload } = await authenticate.webhook(request);


  // Shopify requires a 200 response within 5 seconds
  return new Response();
};
