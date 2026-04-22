import { authenticate, unauthenticated } from "../shopify.server";
import { orderEditBegin, orderEditAddVariant, orderEditCommit } from "../server/graphql";

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
    const { Target, id, updated } = body;

    // Get Admin client for the shop
    const { admin } = await unauthenticated.admin(shopDomain);

    if (Target === "UPDATE_ORDER") {
      const orderId = id;
      const { added_line_items } = updated || {};

      if (!added_line_items || added_line_items.length === 0) {
        return cors(new Response(JSON.stringify({ error: "No items to add" }), { status: 400 }));
      }

      // 1. Begin Edit
      const beginRes = await orderEditBegin(admin, orderId);
      if (beginRes.data?.orderEditBegin?.userErrors?.length > 0) {
        return cors(new Response(JSON.stringify({ status: 400, error: beginRes.data.orderEditBegin.userErrors[0].message }), { status: 400 }));
      }
      const calcOrderId = beginRes.data?.orderEditBegin?.calculatedOrder?.id;

      if (!calcOrderId) {
        return cors(new Response(JSON.stringify({ status: 400, error: "Could not start order edit session." }), { status: 400 }));
      }

      // 2. Add ALL Variants
      for (const item of added_line_items) {
        const addRes = await orderEditAddVariant(admin, calcOrderId, item.variant_id, item.quantity);
        if (addRes.data?.orderEditAddVariant?.userErrors?.length > 0) {
          // If one fails, we might want to continue or abort. Committing what we have might be safer but let's return error for now.
          return cors(new Response(JSON.stringify({ status: 400, error: addRes.data.orderEditAddVariant.userErrors[0].message }), { status: 400 }));
        }
      }

      // 3. Commit Edit
      const commitRes = await orderEditCommit(admin, calcOrderId);
      if (commitRes.data?.orderEditCommit?.userErrors?.length > 0) {
        return cors(new Response(JSON.stringify({ status: 400, error: commitRes.data.orderEditCommit.userErrors[0].message }), { status: 400 }));
      }

      return cors(new Response(JSON.stringify({ status: 200, data: commitRes.data.orderEditCommit.order })));
    }

    return cors(new Response(JSON.stringify({ error: "Invalid Target" }), { status: 400 }));
  } catch (error) {
    console.error("Error in order_update action:", error);
    return cors(new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), { status: 500 }));
  }
};
