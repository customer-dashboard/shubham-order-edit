import { authenticate, unauthenticated } from "../shopify.server";
import { orderEditBegin, orderEditCommit, getCodeDiscountByCode, orderEditAddLineItemDiscount } from "../server/graphql";

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
    const { orderId, code } = body;

    if (!orderId || !code) {
      return cors(new Response(JSON.stringify({ error: "Missing orderId or discount code." }), { status: 400 }));
    }

    // Get Admin client for the shop
    const { admin } = await unauthenticated.admin(shopDomain);

    // 1. Get Discount Info
    const discountRes = await getCodeDiscountByCode(admin, code);
    
    if (discountRes.error) {
       return cors(new Response(JSON.stringify({ error: "Error fetching discount info." }), { status: 500 }));
    }

    const codeDiscountNode = discountRes.data?.codeDiscountNodeByCode;
    const codeDiscount = codeDiscountNode?.codeDiscount;

    if (!codeDiscount) {
      return cors(new Response(JSON.stringify({ error: "Invalid discount code." }), { status: 400 }));
    }

    const discountValue = codeDiscount.customerGets?.value;
    let discountToApply = {};

    if (discountValue?.amount) {
      discountToApply = {
        fixedValue: {
          amount: discountValue.amount.amount,
          currencyCode: discountValue.amount.currencyCode
        },
        description: `Discount Code: ${code}`
      };
    } else if (discountValue?.percentage !== undefined) {
      discountToApply = {
        percentValue: parseFloat(discountValue.percentage) * 100, // percentage field in mutation expects Float (e.g. 10.0 for 10%)
        description: `Discount Code: ${code}`
      };
      if (discountValue.percentage < 1) {
          discountToApply.percentValue = discountValue.percentage * 100;
      }
    } else {
      return cors(new Response(JSON.stringify({ error: "Unsupported discount type." }), { status: 400 }));
    }

    // 2. Begin Edit
    const beginRes = await orderEditBegin(admin, orderId);
    if (beginRes.data?.orderEditBegin?.userErrors?.length > 0) {
      return cors(new Response(JSON.stringify({ error: beginRes.data.orderEditBegin.userErrors[0].message }), { status: 400 }));
    }
    
    const calcOrderId = beginRes.data?.orderEditBegin?.calculatedOrder?.id;
    const lineItems = beginRes.data?.orderEditBegin?.calculatedOrder?.lineItems?.edges || [];
    
    // Find the first line item that is not "removed" (quantity > 0)
    const activeLineItem = lineItems.find(edge => edge.node.quantity > 0)?.node;

    if (!calcOrderId || !activeLineItem) {
      return cors(new Response(JSON.stringify({ error: "Cannot edit this order or order has no active line items." }), { status: 400 }));
    }

    // 3. Apply Discount
    const addDiscountRes = await orderEditAddLineItemDiscount(admin, calcOrderId, activeLineItem.id, discountToApply);
    
    if (addDiscountRes.data?.orderEditAddLineItemDiscount?.userErrors?.length > 0) {
       return cors(new Response(JSON.stringify({ error: addDiscountRes.data.orderEditAddLineItemDiscount.userErrors[0].message }), { status: 400 }));
    }

    // 4. Commit Edit
    const commitRes = await orderEditCommit(admin, calcOrderId);
    
    if (commitRes.data?.orderEditCommit?.userErrors?.length > 0) {
       return cors(new Response(JSON.stringify({ error: commitRes.data.orderEditCommit.userErrors[0].message }), { status: 400 }));
    }

    return cors(new Response(JSON.stringify({ status: 200, message: "Discount applied successfully!" })));

  } catch (error) {
    console.error("Error in discount_apply action:", error);
    return cors(new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), { status: 500 }));
  }
};
