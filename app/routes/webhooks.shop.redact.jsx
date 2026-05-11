import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { shop, topic, payload } = await authenticate.webhook(request);


  return new Response();
};
