import { authenticate, unauthenticated } from "../shopify.server";
import { updateOrderAddress, logActivity } from "../server/graphql";

export const loader = async ({ request }) => {
  const { cors } = await authenticate.public.customerAccount(request);
  return cors(new Response(null, { status: 204 }));
};

export const action = async ({ request }) => {
  const { cors, sessionToken } = await authenticate.public.customerAccount(request);
  const shopDomain = sessionToken?.dest;

  if (!shopDomain) {
    return cors(new Response(JSON.stringify({ error: "Invalid shop domain" }), { status: 401 }));
  }

  if (request.method !== "POST") {
    return cors(new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 }));
  }

  try {
    const body = await request.json();
    const { Target, UpdatedData } = body;

    if (Target !== "UPDATE_ADDRESS") {
      return cors(new Response(JSON.stringify({ error: "Invalid target" }), { status: 400 }));
    }

    if (!UpdatedData) {
      return cors(new Response(JSON.stringify({ error: "UpdatedData is required" }), { status: 400 }));
    }

    // Get Admin client for the shop
    const { admin } = await unauthenticated.admin(shopDomain);

    const input = {
      id: UpdatedData.orderId,
      shippingAddress: {
        firstName: UpdatedData.address.firstName,
        lastName: UpdatedData.address.lastName,
        address1: UpdatedData.address.address1,
        address2: UpdatedData.address.address2,
        city: UpdatedData.address.city,
        province: UpdatedData.address.province,
        zip: UpdatedData.address.zip,
        countryCode: UpdatedData.address.territoryCode,
        phone: UpdatedData.address.phone,
      },
    };

    const responseJson = await updateOrderAddress(admin, input);
    const orderName = UpdatedData.orderName || `#${UpdatedData.orderId.split("/").pop()}`;

    if (responseJson.error) {
      throw new Error(responseJson.error);
    }

    const payload = responseJson.data?.orderUpdate;
    if (payload?.userErrors?.length) {
      return cors(new Response(JSON.stringify({
        status: 400,
        userErrors: payload.userErrors,
        error: `Order update failed: ${payload.userErrors.map(e => e.message).join(", ")}`
      }), { status: 400 }));
    }

    // Log Activity
    await logActivity(admin, shopDomain, {
      type: "ADDRESS_UPDATE",
      orderId: UpdatedData.orderId,
      orderName: orderName,
      message: `Address updated`
    });

    return cors(new Response(JSON.stringify({
      status: 200,
      data: payload?.order?.shippingAddress || []
    })));

  } catch (error) {
    console.error("Error in updateOrderCustomerAddress API:", error);
    return cors(new Response(JSON.stringify({
      error: error.message || "Internal Server Error"
    }), { status: 500 }));
  }
};
