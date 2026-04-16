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