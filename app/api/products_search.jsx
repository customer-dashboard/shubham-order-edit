import { authenticate, unauthenticated } from "../shopify.server";
import { searchProducts } from "../server/graphql";

export const loader = async ({ request }) => {
  const { cors } = await authenticate.public.customerAccount(request);
  return cors(new Response(null, { status: 204 }));
};

export const action = async ({ request }) => {
  const { shop, cors, sessionToken } = await authenticate.public.customerAccount(request);
  const shopDomain = shop || sessionToken?.dest;

  if (!shopDomain) {
    return cors(new Response(JSON.stringify({ error: "Invalid shop domain" }), { status: 401 }));
  }

  try {
    const body = await request.json();
    const { query, countryCode } = body;

    // Get Admin client for the shop
    const { admin } = await unauthenticated.admin(shopDomain);

    const products = await searchProducts(admin, query, countryCode);
    return cors(new Response(JSON.stringify({ status: 200, data: products })));
  } catch (error) {
    console.error("Error in products_search action:", error);
    return cors(new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), { status: 500 }));
  }
};
