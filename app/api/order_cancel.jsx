import { authenticate, unauthenticated } from "../shopify.server";
import { orderCancel, logActivity } from "../server/graphql";

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
    const { orderId, reason, note, orderName } = body;

    if (!orderId) {
      return cors(new Response(JSON.stringify({ error: "Order ID is required" }), { status: 400 }));
    }

    // Get Admin client for the shop
    const adminContext = await unauthenticated.admin(shopDomain);
    if (!adminContext) {
      return cors(new Response(JSON.stringify({ error: "Session not found for this shop. Please re-open the app." }), { status: 401 }));
    }
    const { admin } = adminContext;

    // Call orderCancel mutation
    const cancelRes = await orderCancel(admin, orderId, reason, note);

    if (cancelRes.errors) {
      return cors(new Response(JSON.stringify({ 
        status: 400, 
        error: cancelRes.errors[0].message 
      }), { status: 400 }));
    }

    if (cancelRes.data?.orderCancel?.userErrors?.length > 0) {
      return cors(new Response(JSON.stringify({ 
        status: 400, 
        error: cancelRes.data.orderCancel.userErrors[0].message 
      }), { status: 400 }));
    }

    if (!cancelRes.data?.orderCancel?.job) {
       return cors(new Response(JSON.stringify({ 
        status: 400, 
        error: "Failed to cancel order. It may be fulfilled or already cancelled." 
      }), { status: 400 }));
    }

    // Log Activity
    await logActivity(admin, shopDomain, {
      type: "ORDER_CANCELLED",
      orderId: orderId,
      orderName: orderName || `#${orderId.split("/").pop()}`,
      message: `Order cancelled by customer. Reason: ${reason}`
    });

    return cors(new Response(JSON.stringify({ 
      status: 200, 
      data: { success: true, jobId: cancelRes.data.orderCancel.job?.id }
    })));

  } catch (error) {
    console.error("Error in order_cancel action:", error);
    return cors(new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), { status: 500 }));
  }
};
