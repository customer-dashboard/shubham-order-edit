// import { billingConfig } from "../../app/routes/billing";
import { DEFAULT_APP_SETTINGS } from "../constants/defaultSettings";

export async function getStoreLanguages(graphql) {
  const locals = await graphql(`
    query {
      shopLocales {
        locale
        name
        primary
        published
      }
    }
  `);
  const response = await locals.json();
  return response;
}

export async function getStoreThemes(graphql) {
  const themes = await graphql(`
    query {
      themes(first: 20) {
        edges {
          node {
            name
            id
            role
          }
        }
      }
    }
  `);
  const response = await themes.json();
  return response;
}

export const getAppStatus = async (session, data) => {
  const { accessToken, shop } = session;
  const app_block_id = "9545152174720515545"; //Livegit
  // const app_block_id = "9545152174720515545";  

  try {
    let array = [];

    for (const theme of data) {
      const themeId = theme.node.id.split("/").pop();

      const response = await fetch(
        `https://${shop}/admin/api/2024-10/themes/${themeId}/assets.json?asset[key]=config/settings_data.json`,
        {
          method: "GET",
          headers: {
            "X-Shopify-Access-Token": accessToken,
            "Content-Type": "application/json",
          },
        }
      );

      let json = null;
      try {
        const text = await response.text();
        if (text) {
          json = JSON.parse(text);
        } else {
          // console.warn(`⚠️ Empty response for theme ${themeId}`);
          continue;
        }
      } catch (err) {
        console.warn(`❌ Failed to parse JSON response for theme ${themeId}:`, err);
        continue;
      }

      // Now parse the asset value safely
      if (json?.asset?.value) {
        try {
          const themeData = JSON.parse(json.asset.value);
          const blocks = themeData?.current?.blocks || {};
          const block = blocks[app_block_id] || { disabled: true };
          theme.node.embed_status_disabled = block.disabled;
          // console.log("✅ Processed theme:", theme.node.name);
          array.push(theme);
        } catch (parseError) {
          console.warn(`❌ Invalid settings_data.json in theme ${themeId}:`, parseError);
        }
      } else {
        console.warn(`⚠️ No settings_data.json found for theme ${themeId}`);
      }
    }

    // console.log("🎉 Final Array:", array);
    return array;
  } catch (error) {
    console.error("💥 Error in getAppStatus:", error);
    return error.message;
  }
};

export async function getShopId(shop, accessToken) {
  const endpoint = `https://${shop}/admin/api/2023-10/graphql.json`;
  const query = `
  {
    shop {
      id
    }
  }
`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query }),
    });

    const result = await response.json();
    return result.data?.shop?.id || null;
  } catch (error) {
    console.error("Error fetching shop ID:", error);
    return null;
  }
}

export async function postMetafileds(admin, formValue, shop, accessToken) {
  let formDatavalue = formValue.get("_postMetafileds");
  let shopGid = await getShopId(shop, accessToken);
  try {
    const metafileds = await admin.graphql(
      `#graphql
      mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            key
            namespace
            value
            createdAt
            updatedAt
          }
          userErrors {
            field
            message
            code
          }
        }
      }`,
      {
        variables: {
          metafields: [
            {
              key: "Settings",
              namespace: "order_editing_mt",
              ownerId: shopGid,
              type: "json",
              value: formDatavalue,
            },
          ],
        },
      },
    );

    const response = await metafileds.json();
    return response;
  } catch (error) {
    // console.error("Error in setTranslation:", error);
    // throw error;
  }
}

export async function getAppConfig(admin) {
  try {
    const response = await admin.graphql(
      `#graphql
      query getShopMetafield {
        shop {
          id
          metafield(namespace: "order_editing", key: "ord_edit_config") {
            value
          }
        }
      }`
    );
    const result = await response.json();
    const value = result.data?.shop?.metafield?.value;
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error("Error fetching app config:", error);
    return null;
  }
}

export async function getAppSettings(admin) {
  try {
    const response = await admin.graphql(
      `#graphql
      query getAppSettingsMetafield {
        shop {
          id
          metafield(namespace: "custlo_app", key: "app_settings") {
            value
          }
        }
      }`
    );
    const result = await response.json();
    const value = result.data?.shop?.metafield?.value;
    
    let currentSettings = {};
    if (value) {
      try {
        currentSettings = JSON.parse(value);
      } catch (e) {
        console.error("Error parsing app_settings JSON:", e);
      }
    }

    // Merge with defaults: if a key is missing in currentSettings, use the one from DEFAULT_APP_SETTINGS
    const mergedSettings = {
      ...DEFAULT_APP_SETTINGS,
      ...currentSettings,
    };

    return mergedSettings;
  } catch (error) {
    console.error("Error fetching app settings:", error);
    return DEFAULT_APP_SETTINGS;
  }
}

export async function setAppConfig(admin, config) {
  try {
    const shopResponse = await admin.graphql(`{ shop { id } }`);
    const shopData = await shopResponse.json();
    const shopGid = shopData.data.shop.id;

    const response = await admin.graphql(
      `#graphql
      mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            key
            namespace
            value
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          metafields: [
            {
              key: "app_settings",
              namespace: "custlo_app",
              ownerId: shopGid,
              type: "json",
              value: JSON.stringify(config),
            },
          ],

        },
      }
    );
    return await response.json();
  } catch (error) {
    console.error("Error setting app config:", error);
    return { error: error.message };
  }
}

export async function updateOrderAddress(admin, input) {
  try {
    const response = await admin.graphql(
      `#graphql
      mutation OrderUpdate($input: OrderInput!) {
        orderUpdate(input: $input) {
          order {
            id
            shippingAddress {
              firstName
              lastName
              address1
              address2
              city
              province
              zip
              country
              phone
            }
          }
          userErrors {
            field
            message
          }
        }
      }`,
      { variables: { input } },
    );
    return await response.json();
  } catch (error) {
    console.error("Error in updateOrderAddress utility:", error);
    return { error: error.message };
  }
}

export async function getOrderDetails(admin, orderId) {
  try {
    const response = await admin.graphql(
      `#graphql
      query getOrderDetails($id: ID!) {
        order(id: $id) {
          id
          name
          email
          createdAt
          currencyCode
          totalPriceSet {
            shopMoney { amount currencyCode }
            presentmentMoney { amount currencyCode }
          }
          shippingAddress {
            firstName
            lastName
            address1
            address2
            city
            province
            zip
            country
            phone
          }
          customer {
            id
            firstName
            lastName
            email
            phone
          }
          lineItems(first: 50) {
            edges {
              node {
                id
                name
                image {
                  altText
                  url
                }
                product {
                  id
                  title
                }
                quantity
                currentQuantity
                variant {
                  id
                }
                originalUnitPriceSet {
                  shopMoney { amount currencyCode }
                  presentmentMoney { amount currencyCode }
                }
              }
            }
          }
        }
      }`,
      { variables: { id: orderId } }
    );
    return await response.json();
  } catch (error) {
    console.error("Error in getOrderDetails utility:", error);
    return { error: error.message };
  }
}

export async function fetchProductVariants(admin, productId, countryCode) {
  try {
    const response = await admin.graphql(
      `#graphql
      query getProductVariants($id: ID!, $country: CountryCode) {
        product(id: $id) {
          variants(first: 100) {
            edges {
              node {
                id
                title
                sku
                contextualPricing(context: { country: $country }) {
                  price {
                    amount
                    currencyCode
                  }
                }
                image { url }
              }
            }
          }
        }
      }`,
      { variables: { id: productId, country: countryCode } }
    );
    const json = await response.json();
    return json.data?.product?.variants?.edges.map(e => e.node) || [];
  } catch (error) {
    console.error("Error in getOrderDetails utility:", error);
    return { error: error.message };
  }
}

export async function orderInvoiceSend(admin, orderId, email) {
  try {
    const response = await admin.graphql(
      `#graphql
      mutation OrderInvoiceSend($orderId: ID!, $email: EmailInput) {
        orderInvoiceSend(id: $orderId, email: $email) {
          order { id }
          userErrors { field message }
        }
      }`,
      {
        variables: {
          orderId,
          email: email ? { to: email } : null,
        },
      }
    );
    return await response.json();
  } catch (error) {
    console.error("Error in orderInvoiceSend utility:", error);
    return { error: error.message };
  }
}

export async function getOrderNote(admin, orderId) {
  try {
    const response = await admin.graphql(
      `#graphql
      query OrderNote($id: ID!) {
        order(id: $id) {
          note
        }
      }`,
      { variables: { id: orderId } }
    );
    return await response.json();
  } catch (error) {
    console.error("Error in getOrderNote utility:", error);
    return { error: error.message };
  }
}

export async function updateOrderNote(admin, orderId, note) {
  try {
    const response = await admin.graphql(
      `#graphql
      mutation OrderUpdate($input: OrderInput!) {
        orderUpdate(input: $input) {
          order {
            id
            note
            tags
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          input: {
            id: orderId,
            note: note,
            tags: ["CDP_ORDER_EDIT"]
          }
        }
      }
    );
    return await response.json();
  } catch (error) {
    console.error("Error in updateOrderNote utility:", error);
    return { error: error.message };
  }
}


export async function updateOrderPhone(admin, input) {
  try {
    const response = await admin.graphql(
      `#graphql
      mutation OrderUpdate($input: OrderInput!) {
        orderUpdate(input: $input) {
          order {
            id
            tags
            shippingAddress {
              phone
            }
          }
          userErrors {
            field
            message
          }
        }
      }`,
      { variables: { input } }
    );
    return await response.json();
  } catch (error) {
    console.error("Error in updateOrderPhone utility:", error);
    return { error: error.message };
  }
}

export async function searchProducts(admin, query, countryCode) {
  try {
    const filter = query ? `title:*${query}*` : "";
    const response = await admin.graphql(
      `#graphql
      query searchProducts($query: String, $country: CountryCode) {
        products(first: 10, query: $query) {
          edges {
            node {
              id
              title
              handle
              featuredImage {
                url
              }
              variants(first: 20) {
                edges {
                  node {
                    id
                    title
                    contextualPricing(context: { country: $country }) {
                      price {
                        amount
                        currencyCode
                      }
                    }
                    sku
                    image { url }
                  }
                }
              }
            }
          }
        }
      }`,
      { variables: { query: filter, country: countryCode } }
    );
    const json = await response.json();
    const products = json.data?.products?.edges.map(e => {
      const p = e.node;
      return {
        ...p,
        variants: p.variants.edges.map(ve => ve.node)
      };
    });
    return products || [];
  } catch (error) {
    console.error("Error in searchProducts utility:", error);
    return [];
  }
}

export async function fetchProductVariants(admin, productId, countryCode) {
  try {
    const response = await admin.graphql(
      `#graphql
      query getVariants($id: ID!, $country: CountryCode) {
        product(id: $id) {
          variants(first: 100) {
            edges {
              node {
                id
                title
                sku
                price
                contextualPricing(context: { country: $country }) {
                  price {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
        }
      }`,
      { variables: { id: productId, country: countryCode } }
    );
    const json = await response.json();
    return json.data?.product?.variants?.edges.map(e => e.node) || [];
  } catch (error) {
    console.error("Error in fetchProductVariants:", error);
    return [];
  }
}

export async function orderEditBegin(admin, orderId) {
  try {
    const response = await admin.graphql(
      `#graphql
      mutation orderEditBegin($id: ID!) {
        orderEditBegin(id: $id) {
          calculatedOrder {
            id
            lineItems(first: 100) {
              edges {
                node {
                  id
                  quantity
                  variant {
                    id
                  }
                }
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }`,
      { variables: { id: orderId } }
    );
    return await response.json();
  } catch (error) {
    console.error("Error in orderEditBegin utility:", error);
    return { error: error.message };
  }
}

export async function orderEditAddVariant(admin, calculatedOrderId, variantId, quantity) {
  try {
    const response = await admin.graphql(
      `#graphql
      mutation orderEditAddVariant($id: ID!, $variantId: ID!, $quantity: Int!) {
        orderEditAddVariant(id: $id, variantId: $variantId, quantity: $quantity) {
          calculatedOrder {
            id
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          id: calculatedOrderId,
          variantId,
          quantity: parseInt(quantity, 10),
        },
      }
    );
    return await response.json();
  } catch (error) {
    console.error("Error in orderEditAddVariant utility:", error);
    return { error: error.message };
  }
}

export async function orderEditCommit(admin, calculatedOrderId) {
  try {
    const response = await admin.graphql(
      `#graphql
      mutation orderEditCommit($id: ID!) {
        orderEditCommit(id: $id, notifyCustomer: true, staffNote: "Added items via Customer Account Dashboard") {
          order {
            id
          }
          userErrors {
            field
            message
          }
        }
      }`,
      { variables: { id: calculatedOrderId } }
    );
    return await response.json();
  } catch (error) {
    console.error("Error in orderEditCommit utility:", error);
    return { error: error.message };
  }
}

export async function orderEditSetQuantity(admin, calculatedOrderId, lineItemId, quantity) {
  try {
    const response = await admin.graphql(
      `#graphql
      mutation orderEditSetQuantity($id: ID!, $lineItemId: ID!, $quantity: Int!) {
        orderEditSetQuantity(id: $id, lineItemId: $lineItemId, quantity: $quantity) {
          calculatedOrder {
            id
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          id: calculatedOrderId,
          lineItemId,
          quantity: parseInt(quantity, 10),
        },
      }
    );
    return await response.json();
  } catch (error) {
    console.error("Error in orderEditSetQuantity utility:", error);
    return { error: error.message };
  }
}

export async function getCodeDiscountByCode(admin, code) {
  try {
    const response = await admin.graphql(
      `#graphql
      query getDiscount($code: String!) {
        codeDiscountNodeByCode(code: $code) {
          id
          codeDiscount {
            ... on DiscountCodeBasic {
              title
              customerGets {
                value {
                  ... on DiscountAmount {
                    amount {
                      amount
                      currencyCode
                    }
                  }
                  ... on DiscountPercentage {
                    percentage
                  }
                }
              }
            }
          }
        }
      }`,
      { variables: { code } }
    );
    return await response.json();
  } catch (error) {
    console.error("Error in getCodeDiscountByCode utility:", error);
    return { error: error.message };
  }
}


export async function orderEditAddLineItemDiscount(admin, calculatedOrderId, lineItemId, discount) {
  try {
    const response = await admin.graphql(
      `#graphql
      mutation orderEditAddLineItemDiscount($id: ID!, $lineItemId: ID!, $discount: OrderEditAppliedDiscountInput!) {
        orderEditAddLineItemDiscount(id: $id, lineItemId: $lineItemId, discount: $discount) {
          calculatedOrder {
            id
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          id: calculatedOrderId,
          lineItemId,
          discount,
        },
      }
    );
    return await response.json();
  } catch (error) {
    console.error("Error in orderEditAddLineItemDiscount utility:", error);
    return { error: error.message };
  }
}

/**
 * Log activity to Metafield and MongoDB
 */
import { logActivityToDB } from "../mongodb.server";

export async function logActivity(admin, shop, activity) {
  try {
    console.log("Activity: Logging to MongoDB...", activity.type);
    // 1. Log to DB
    await logActivityToDB(shop, activity);

    // 2. Sync to Unified Metafield (Analytics + Recent Activity)
    // Small delay to ensure MongoDB indexing
    setTimeout(async () => {
      await syncAnalytics(admin, shop);
    }, 500);

    
  } catch (error) {
    console.error("Error logging activity:", error);
  }
}


/**
 * Increment Analytics counter and update chart data
 */
import { DEFAULT_ANALYTICS } from "../constants/defaultSettings";

import { activities as activitiesCol } from "../mongodb.server";

/**
 * Sync Analytics from MongoDB to Shopify Metafield
 * Ensures Metafield always matches MongoDB source of truth.
 * Only keeps last 30 days of trend data in the Metafield.
 */
export async function syncAnalytics(admin, shopDomain) {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const startOfToday = new Date();
    startOfToday.setHours(0,0,0,0);
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    // 1. Fetch ALL metrics from MongoDB in parallel
    const [
      totalorderedit,
      todayEdits,
      yesterdayEdits,
      shippingCount,
      discountCount,
      phoneCount,
      invoiceCount,
      deliveryCount,
      linesCount,
      addingCount,
      dailyStats,
      recentLogs
    ] = await Promise.all([
      activitiesCol.countDocuments({ shop: shopDomain }),
      activitiesCol.countDocuments({ shop: shopDomain, createdAt: { $gte: startOfToday } }),
      activitiesCol.countDocuments({ shop: shopDomain, createdAt: { $gte: startOfYesterday, $lt: startOfToday } }),
      activitiesCol.countDocuments({ shop: shopDomain, type: "ADDRESS_UPDATE" }),
      activitiesCol.countDocuments({ shop: shopDomain, type: "DISCOUNT_APPLIED" }),
      activitiesCol.countDocuments({ shop: shopDomain, type: "PHONE_UPDATE" }),
      activitiesCol.countDocuments({ shop: shopDomain, type: "INVOICE_GENERATED" }),
      activitiesCol.countDocuments({ shop: shopDomain, type: "DELIVERY_INST_UPDATE" }),
      activitiesCol.countDocuments({ shop: shopDomain, type: { $in: ["ITEM_REMOVED", "ITEM_REPLACED", "QTY_UPDATE", "ORDER_UPDATE"] } }),
      activitiesCol.countDocuments({ shop: shopDomain, type: "PRODUCT_ADDED" }),
      activitiesCol.aggregate([
        { 
          $match: { 
            shop: shopDomain, 
            createdAt: { $gte: thirtyDaysAgo } 
          } 
        },
        {
          $group: {
            _id: { $dateToString: { format: "%d/%m/%Y", date: "$createdAt" } },
            count: { $sum: 1 }
          }
        }
      ]).toArray(),
      activitiesCol.find({ shop: shopDomain }).sort({ createdAt: -1 }).limit(10).toArray()
    ]);

    // 2. Calculate change %
    let change = 0;
    if (yesterdayEdits > 0) {
      change = Math.round(((todayEdits - yesterdayEdits) / yesterdayEdits) * 100);
    } else if (todayEdits > 0) {
      change = 100;
    }

    // 3. Prepare 30-day timeline
    const last30daysdata = {};
    const statsMap = Object.fromEntries(dailyStats.map(s => [s._id, s.count]));

    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const key = `${day}/${month}/${year}`;
      last30daysdata[key] = statsMap[key] || 0;
    }

    // 4. Construct Unified JSON
    const analytics = {
      totalorderedit,
      todayEdits,
      yesterdayEdits,
      change,
      last30daysdata,
      total_shipping_address_editing: shippingCount,
      total_discount_code: discountCount,
      total_phone_number_editing: phoneCount,
      total_invoice_download: invoiceCount,
      total_delivery_instructions: deliveryCount,
      total_order_line_items_editing: linesCount,
      total_adding_more_products: addingCount,
      last10activity: recentLogs.map(log => ({
        id: log._id,
        orderName: log.orderName,
        orderId: log.orderId,
        message: log.message,
        timestamp: log.createdAt
      }))
    };

    // 5. Save to Shopify
    const shopResponse = await admin.graphql(`{ shop { id } }`);
    const shopData = await shopResponse.json();
    const shopGid = shopData.data.shop.id;

    await admin.graphql(
      `#graphql
      mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields { key value }
        }
      }`,
      {
        variables: {
          metafields: [
            {
              key: "analytics_30d",
              namespace: "order_editing",
              ownerId: shopGid,
              type: "json",
              value: JSON.stringify(analytics),
            },
          ],
        },
      }
    );
    return analytics;
  } catch (error) {
    console.error("Analytics: Sync Error:", error);
    return null;
  }
}









/**
 * Get recent activity from Metafield
 */
export async function getRecentActivity(admin) {
  try {
    const response = await admin.graphql(
      `#graphql
      query getRecentActivity {
        shop {
          metafield(namespace: "order_editing", key: "recent_activity") {
            value
          }
        }
      }`
    );
    const result = await response.json();
    const value = result.data?.shop?.metafield?.value;
    return value ? JSON.parse(value) : [];
  } catch (error) {
    console.error("Error fetching recent activity:", error);
    return [];
  }
}
