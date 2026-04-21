import { authenticate, unauthenticated } from "../shopify.server";
import { getOrderNote } from "../server/graphql";

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
    const { UpdatedData } = body;
    const { orderId } = UpdatedData;

    if (!orderId) {
      return cors(new Response(JSON.stringify({ error: "Order ID is required" }), { status: 400 }));
    }

    const { admin } = await unauthenticated.admin(shopDomain);
    const responseJson = await getOrderNote(admin, orderId);

    if (responseJson.error) {
      throw new Error(responseJson.error);
    }

    const note = responseJson.data?.order?.note || "";

    return cors(new Response(JSON.stringify({ note })));

  } catch (error) {
    console.error("Error in fetchOrderNote API:", error);
    return cors(new Response(JSON.stringify({
      error: error.message || "Internal Server Error"
    }), { status: 500 }));
  }
};
