import { authenticate, unauthenticated } from "../shopify.server";
import { orderEditBegin, orderEditAddVariant, orderEditCommit, orderEditSetQuantity } from "../server/graphql";

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
      const {
        added_line_items = [],
        changed_line_items = [],
        removed_line_items = [],
        replacements = []
      } = updated || {};

      if (!added_line_items.length && !changed_line_items.length && !removed_line_items.length && !replacements.length) {
        return cors(new Response(JSON.stringify({ error: "No changes to apply" }), { status: 400 }));
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

      // Map variants to calculated line item IDs
      const lineItemMap = {};
      const edges = beginRes.data.orderEditBegin.calculatedOrder.lineItems?.edges || [];
      edges.forEach(edge => {
        if (edge.node.variant?.id) {
          lineItemMap[edge.node.variant.id] = edge.node.id;
        }
      });
      console.log("Calculated Line Item Map:", JSON.stringify(lineItemMap));

      // 2. Process Removals (Set qty to 0)
      for (const item of removed_line_items) {
        const lineItemId = lineItemMap[item.variant_id] || item.id;
        console.log(`Removing item. Original: ${item.id}, Calculated: ${lineItemId}`);
        const res = await orderEditSetQuantity(admin, calcOrderId, lineItemId, 0);
        if (res.data?.orderEditSetQuantity?.userErrors?.length > 0) {
          return cors(new Response(JSON.stringify({ status: 400, error: res.data.orderEditSetQuantity.userErrors[0].message }), { status: 400 }));
        }
      }

      // 3. Process Quantity Changes
      for (const item of changed_line_items) {
        const lineItemId = lineItemMap[item.variant_id] || item.id;
        console.log(`Updating qty. Original: ${item.id}, Calculated: ${lineItemId} to ${item.quantity}`);
        const res = await orderEditSetQuantity(admin, calcOrderId, lineItemId, item.quantity);
        if (res.data?.orderEditSetQuantity?.userErrors?.length > 0) {
          return cors(new Response(JSON.stringify({ status: 400, error: res.data.orderEditSetQuantity.userErrors[0].message }), { status: 400 }));
        }
      }

      // 4. Process Replacements (Remove old, add new)
      for (const item of replacements) {
        // Remove old
        const lineItemId = lineItemMap[item.variant_id] || item.old_line_item_id;
        console.log(`Replacing item. Original: ${item.old_line_item_id}, Calculated: ${lineItemId}`);
        const remRes = await orderEditSetQuantity(admin, calcOrderId, lineItemId, 0);
        if (remRes.data?.orderEditSetQuantity?.userErrors?.length > 0) {
          return cors(new Response(JSON.stringify({ status: 400, error: remRes.data.orderEditSetQuantity.userErrors[0].message }), { status: 400 }));
        }
        // Add new
        const addRes = await orderEditAddVariant(admin, calcOrderId, item.new_item.variant_id, item.new_item.quantity);
        if (addRes.data?.orderEditAddVariant?.userErrors?.length > 0) {
          return cors(new Response(JSON.stringify({ status: 400, error: addRes.data.orderEditAddVariant.userErrors[0].message }), { status: 400 }));
        }
      }

      // 5. Process Additions
      for (const item of added_line_items) {
        const addRes = await orderEditAddVariant(admin, calcOrderId, item.variant_id, item.quantity);
        if (addRes.data?.orderEditAddVariant?.userErrors?.length > 0) {
          return cors(new Response(JSON.stringify({ status: 400, error: addRes.data.orderEditAddVariant.userErrors[0].message }), { status: 400 }));
        }
      }

      // 6. Commit Edit
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
