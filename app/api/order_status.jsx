import { authenticate, unauthenticated } from "../shopify.server";
import { getOrderDetails } from "../server/graphql";

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

  if (request.method !== "POST") {
    return cors(new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 }));
  }

  try {
    const body = await request.json();
    const { Target, id } = body;

    if (Target !== "GET_ORDER_DETAILS") {
      return cors(new Response(JSON.stringify({ error: "Invalid target" }), { status: 400 }));
    }

    if (!id) {
      return cors(new Response(JSON.stringify({ error: "Order ID is required" }), { status: 400 }));
    }

    // Get Admin client for the shop
    const { admin } = await unauthenticated.admin(shopDomain);

    const responseJson = await getOrderDetails(admin, id);

    if (responseJson.error) {
      throw new Error(responseJson.error);
    }

    return cors(new Response(JSON.stringify({
      status: 200,
      data: responseJson.data?.order || null
    })));

  } catch (error) {
    console.error("Error in getOrderDetails API:", error);
    return cors(new Response(JSON.stringify({
      error: error.message || "Internal Server Error"
    }), { status: 500 }));
  }
};
