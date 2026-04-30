import { saveSubscription, logActivityToDB } from "../mongodb.server";

export async function getStoreLanguages(graphql) {
  const locals = await graphql(`query { shopLocales { locale name primary published } }`);
  return await locals.json();
}

export async function getStoreThemes(graphql) {
  const themes = await graphql(`query { themes(first: 20) { edges { node { name id role } } } }`);
  return await themes.json();
}

export const getAppStatus = async (session, data) => {
  const { accessToken, shop } = session;
  const app_block_id = "9545152174720515545"; 
  try {
    let array = [];
    for (const theme of data) {
      const themeId = theme.node.id.split("/").pop();
      const response = await fetch(`https://${shop}/admin/api/2024-10/themes/${themeId}/assets.json?asset[key]=config/settings_data.json`, {
          method: "GET",
          headers: { "X-Shopify-Access-Token": accessToken, "Content-Type": "application/json" },
      });
      let json = null;
      try { const text = await response.text(); if (text) json = JSON.parse(text); else continue; } catch (err) { continue; }
      if (json?.asset?.value) {
        try {
          const themeData = JSON.parse(json.asset.value);
          const blocks = themeData?.current?.blocks || {};
          const block = blocks[app_block_id] || { disabled: true };
          theme.node.embed_status_disabled = block.disabled;
          array.push(theme);
        } catch (e) {}
      }
    }
    return array;
  } catch (error) { return []; }
};

export async function logActivity(admin, shop, activity) {
  try {
    await logActivityToDB(shop, activity);
    const shopResponse = await admin.graphql(`{ shop { id metafield(namespace: "order_editing", key: "recent_activity") { value } } }`);
    const shopData = await shopResponse.json();
    const shopGid = shopData.data.shop.id;
    const existingValue = shopData.data.shop.metafield?.value;
    let activities = existingValue ? JSON.parse(existingValue) : [];
    activities.unshift({ ...activity, id: Math.random().toString(36).substr(2, 9), timestamp: new Date().toISOString() });
    activities = activities.slice(0, 10);
    await admin.graphql(
      `#graphql
      mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) { metafields { key value } userErrors { field message } }
      }`,
      { variables: { metafields: [{ key: "recent_activity", namespace: "order_editing", ownerId: shopGid, type: "json", value: JSON.stringify(activities) }] } }
    );
  } catch (error) { console.error("Error logging activity:", error); }
}

export async function getRecentActivity(admin) {
  try {
    const response = await admin.graphql(`#graphql query { shop { metafield(namespace: "order_editing", key: "recent_activity") { value } } }`);
    const result = await response.json();
    const value = result.data?.shop?.metafield?.value;
    return value ? JSON.parse(value) : [];
  } catch (error) { return []; }
}

export async function getBillingInfo(admin) {
  try {
    const response = await admin.graphql(
      `#graphql
      query {
        shop { id name myshopifyDomain plan { shopifyPlus } metafield(namespace: "checkoutextensionspro", key: "billing_plan") { value } }
        app { installation { activeSubscriptions { id name status test lineItems { plan { pricingDetails { ... on AppRecurringPricing { price { amount currencyCode } } } } } } } }
      }`
    );
    const json = await response.json();
    return json.data;
  } catch (error) { return null; }
}

export async function confirmSubscription(admin, shop) {
  try {
    const response = await admin.graphql(`#graphql query { app { installation { activeSubscriptions { id name status lineItems { plan { pricingDetails { ... on AppRecurringPricing { price { amount currencyCode } } } } } } } } shop { id } }`);
    const json = await response.json();
    const activeSub = json.data.app.installation.activeSubscriptions[0];
    const shopId = json.data.shop.id;
    if (activeSub && activeSub.status === "ACTIVE") {
      await saveSubscription(shop, shop.split('.')[0], { plan: activeSub.name, status: "active", activatedAt: new Date(), shopifyId: activeSub.id });
      const planInfo = { id: activeSub.name, name: activeSub.name, price: activeSub.lineItems[0].plan.pricingDetails.price.amount, date: new Date().toISOString(), status: "active" };
      await admin.graphql(
        `#graphql
        mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) { userErrors { field message } }
        }`,
        { variables: { metafields: [{ key: "billing_plan", namespace: "checkoutextensionspro", ownerId: shopId, type: "json", value: JSON.stringify(planInfo) }] } }
      );
      return { success: true };
    }
    return { success: false };
  } catch (error) { return { success: false }; }
}

export async function updateOrderAddress(admin, input) {
  const response = await admin.graphql(
    `#graphql
    mutation OrderUpdate($input: OrderInput!) {
      orderUpdate(input: $input) {
        order { id shippingAddress { firstName lastName address1 address2 city province zip country phone } }
        userErrors { field message }
      }
    }`,
    { variables: { input } },
  );
  return await response.json();
}

export async function getOrderDetails(admin, orderId) {
  const response = await admin.graphql(
    `#graphql
    query getOrderDetails($id: ID!) {
      order(id: $id) {
        id name email createdAt currencyCode
        shippingAddress { firstName lastName address1 address2 city province zip country phone }
        lineItems(first: 50) { edges { node { id name quantity currentQuantity variant { id } image { url } originalUnitPriceSet { shopMoney { amount currencyCode } } } } }
      }
    }`,
    { variables: { id: orderId } }
  );
  return await response.json();
}

export async function searchProducts(admin, query, countryCode) {
    const filter = query ? `title:*${query}*` : "";
    const response = await admin.graphql(
      `#graphql
      query searchProducts($query: String, $country: CountryCode) {
        products(first: 10, query: $query) {
          edges {
            node {
              id title handle featuredImage { url }
              variants(first: 20) {
                edges { node { id title sku image { url } contextualPricing(context: { country: $country }) { price { amount currencyCode } } } }
              }
            }
          }
        }
      }`,
      { variables: { query: filter, country: countryCode } }
    );
    const json = await response.json();
    return json.data?.products?.edges.map(e => ({
      ...e.node,
      variants: e.node.variants.edges.map(ve => ve.node)
    })) || [];
}

export async function orderEditBegin(admin, orderId) {
  const response = await admin.graphql(`#graphql mutation orderEditBegin($id: ID!) { orderEditBegin(id: $id) { calculatedOrder { id } userErrors { field message } } }`, { variables: { id: orderId } });
  return await response.json();
}

export async function orderEditAddVariant(admin, calculatedOrderId, variantId, quantity) {
  const response = await admin.graphql(`#graphql mutation orderEditAddVariant($id: ID!, $variantId: ID!, $quantity: Int!) { orderEditAddVariant(id: $id, variantId: $variantId, quantity: $quantity) { calculatedOrder { id } userErrors { field message } } }`, { variables: { id: calculatedOrderId, variantId, quantity: parseInt(quantity, 10) } });
  return await response.json();
}

export async function orderEditCommit(admin, calculatedOrderId) {
  const response = await admin.graphql(`#graphql mutation orderEditCommit($id: ID!) { orderEditCommit(id: $id, notifyCustomer: true) { order { id } userErrors { field message } } }`, { variables: { id: calculatedOrderId } });
  return await response.json();
}

export async function orderEditSetQuantity(admin, calculatedOrderId, lineItemId, quantity) {
  const response = await admin.graphql(`#graphql mutation orderEditSetQuantity($id: ID!, $lineItemId: ID!, $quantity: Int!) { orderEditSetQuantity(id: $id, lineItemId: $lineItemId, quantity: $quantity) { calculatedOrder { id } userErrors { field message } } }`, { variables: { id: calculatedOrderId, lineItemId, quantity: parseInt(quantity, 10) } });
  return await response.json();
}