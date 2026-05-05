import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);
  console.log("Payload:", JSON.stringify(payload, null, 2));

  // Shopify requires a 200 response within 5 seconds
  return new Response();
};
