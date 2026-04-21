// import { billingConfig } from "../../app/routes/billing";

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
              key: "ord_edit_config",
              namespace: "order_editing",
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
                originalUnitPriceSet {
                  shopMoney { amount currencyCode }
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

export async function fetchProductVariants(admin, productId) {
  try {
    const response = await admin.graphql(
      `#graphql
      query getProductVariants($id: ID!) {
        product(id: $id) {
          variants(first: 100) {
            edges {
              node {
                id
                title
                sku
                price
                image { url }
              }
            }
          }
        }
      }`,
      { variables: { id: productId } }
    );
    const json = await response.json();
    return json.data?.product?.variants?.edges.map(e => e.node) || [];
  } catch (error) {
    console.error("Error in fetchProductVariants utility:", error);
    return [];
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