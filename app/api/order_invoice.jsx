import { authenticate, unauthenticated } from "../shopify.server";
import { orderInvoiceSend, logActivity } from "../server/graphql";

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
    const { orderId, option, email } = body;

    if (!orderId || !option) {
      return cors(new Response(JSON.stringify({ error: "Missing required parameters" }), { status: 400 }));
    }

    if (option.includes("email")) {
      const { admin } = await unauthenticated.admin(shopDomain);
      const responseJson = await orderInvoiceSend(admin, orderId, email);
      const orderName = body.orderName || `#${orderId.split("/").pop()}`;

      if (responseJson.error) {
        throw new Error(responseJson.error);
      }

      const payload = responseJson.data?.orderInvoiceSend;
      if (payload?.userErrors?.length) {
        throw new Error(`Invoice send failed: ${JSON.stringify(payload.userErrors)}`);
      }

      // Log Activity
      await logActivity(admin, shopDomain, {
        type: "INVOICE_SENT",
        orderId: orderId,
        orderName: orderName,
        message: `Invoice sent — Order ${orderName}`
      });

      return cors(new Response(JSON.stringify({
        message: `Invoice sent successfully to ${email || "customer"}.`
      })));
    } else {
      return cors(new Response(JSON.stringify({ error: `Invalid invoice option: ${option}` }), { status: 400 }));
    }

  } catch (error) {
    console.error("Error in orderInvoice API:", error);
    return cors(new Response(JSON.stringify({
      message: error.message || "Internal Server Error"
    }), { status: 500 }));
  }
};
