import { authenticate, unauthenticated } from "../shopify.server";
import { updateOrderPhone, logActivity } from "../server/graphql";

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
    const { Target, UpdatedData } = body;

    if (Target !== "UPDATE_PHONE") {
      return cors(new Response(JSON.stringify({ error: "Invalid target" }), { status: 400 }));
    }

    if (!UpdatedData) {
      return cors(new Response(JSON.stringify({ error: "UpdatedData is required" }), { status: 400 }));
    }

    // Get Admin client for the shop
    const { admin } = await unauthenticated.admin(shopDomain);

    const input = {
      id: UpdatedData.orderId,
      tags: ["CDP_ORDER_EDIT"], // Tracking tag as requested in your snippet
      shippingAddress: {
        phone: UpdatedData.address.phone,
      },
    };

    const responseJson = await updateOrderPhone(admin, input);
    const orderName = UpdatedData.orderName || `#${UpdatedData.orderId.split("/").pop()}`;

    if (responseJson.error) {
      throw new Error(responseJson.error);
    }

    const payload = responseJson.data?.orderUpdate;
    if (payload?.userErrors?.length) {
      return cors(new Response(JSON.stringify({
        error: `Phone update failed: ${payload.userErrors.map(e => e.message).join(", ")}`
      }), { status: 400 }));
    }

    // Log Activity
    await logActivity(admin, shopDomain, {
      type: "PHONE_UPDATE",
      orderId: UpdatedData.orderId,
      orderName: orderName,
      message: `Phone updated`
    });

    return cors(new Response(JSON.stringify({
      status: 200,
      data: payload?.order?.shippingAddress || []
    })));

  } catch (error) {
    console.error("Error in updateOrderPhone API:", error);
    return cors(new Response(JSON.stringify({
      error: error.message || "Internal Server Error"
    }), { status: 500 }));
  }
};
