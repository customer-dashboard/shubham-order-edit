import { authenticate, unauthenticated } from "../shopify.server";
import { getOrderDetails, fetchProductVariants } from "../server/graphql";

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
    const { Target, id, countryCode } = body;

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

    const orderData = responseJson.data?.order;
    if (!orderData) {
      return cors(new Response(JSON.stringify({
        status: 200,
        data: null
      })));
    }

    // Fetch variants for each line item in parallel
    const lineItems = orderData.lineItems?.edges || [];
    const variantResults = await Promise.all(lineItems.map(async (edge) => {
      const lineItem = edge.node;
      const productId = lineItem.product?.id;
      if (productId) {
        const variants = await fetchProductVariants(admin, productId, countryCode);
        return { id: lineItem.id, variants };
      }
      return null;
    }));

    const variantsMap = {};
    variantResults.forEach(res => {
      if (res) variantsMap[res.id] = res.variants;
    });

    // Fetch shop settings
    const shopResponse = await admin.graphql(`
      query {
        shop {
          metafield(namespace: "custlo_app", key: "app_settings") {
            value
          }
        }
      }
    `);
    const shopSettingsJson = await shopResponse.json();
    const settingsValue = shopSettingsJson.data?.shop?.metafield?.value;
    const settings = settingsValue ? JSON.parse(settingsValue) : null;

    return cors(new Response(JSON.stringify({
      status: 200,
      data: {
        ...orderData,
        variantsMap,
        settings
      }
    })));


  } catch (error) {
    console.error("Error in getOrderDetails API:", error);
    return cors(new Response(JSON.stringify({
      error: error.message || "Internal Server Error"
    }), { status: 500 }));
  }
};
