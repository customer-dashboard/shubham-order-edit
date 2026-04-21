import { authenticate, unauthenticated } from "../shopify.server";
import { updateOrderNote } from "../server/graphql";

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
    const { orderId, deliveryInstructions } = UpdatedData;

    if (!orderId || deliveryInstructions === undefined) {
      return cors(new Response(JSON.stringify({ error: "Missing required parameters" }), { status: 400 }));
    }

    const { admin } = await unauthenticated.admin(shopDomain);
    const responseJson = await updateOrderNote(admin, orderId, deliveryInstructions);

    if (responseJson.error) {
      throw new Error(responseJson.error);
    }

    const payload = responseJson.data?.orderUpdate;
    if (payload?.userErrors?.length) {
      throw new Error(`Order update failed: ${JSON.stringify(payload.userErrors)}`);
    }

    return cors(new Response(JSON.stringify({
      message: "Delivery instructions updated successfully.",
      data: payload.order,
    })));

  } catch (error) {
    console.error("Error in orderDeliveryInstruction API:", error);
    return cors(new Response(JSON.stringify({
      message: error.message || "Internal Server Error"
    }), { status: 500 }));
  }
};
