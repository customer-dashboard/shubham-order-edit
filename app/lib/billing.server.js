import { BillingInterval } from "@shopify/shopify-api";
import { db, activities as activitiesCol } from "../mongodb.server";

export const IS_TEST_MODE = true;

export const billingConfig = {
  "free": {
    id: "plan_free_v1",
    edit_limit: -1,
    amount: 0,
    currencyCode: "USD",
    interval: BillingInterval.Every30Days,
    trialDays: 0
  },
  "starter": {
    id: "plan_starter_v1",
    edit_limit: 50,
    amount: 8.0,
    currencyCode: "USD",
    interval: BillingInterval.Every30Days,
    trialDays: 7
  },
  "growth": {
    id: "plan_growth_v1",
    edit_limit: 100,
    amount: 20.0,
    currencyCode: "USD",
    interval: BillingInterval.Every30Days,
    trialDays: 7
  },
  "enterprise": {
    id: "plan_enterprise_v1",
    edit_limit: -1,
    amount: 40.0,
    currencyCode: "USD",
    interval: BillingInterval.Every30Days,
    trialDays: 7
  },
  "starter_yearly": {
    id: "plan_starter_yearly_v1",
    edit_limit: 50,
    amount: 76.80, // (8 * 12) - 20%
    currencyCode: "USD",
    interval: BillingInterval.Annual,
    trialDays: 7
  },
  "growth_yearly": {
    id: "plan_growth_yearly_v1",
    edit_limit: 100,
    amount: 192.00, // (20 * 12) - 20%
    currencyCode: "USD",
    interval: BillingInterval.Annual,
    trialDays: 7
  },
  "enterprise_yearly": {
    id: "plan_enterprise_yearly_v1",
    edit_limit: -1,
    amount: 384.00, // (40 * 12) - 20%
    currencyCode: "USD",
    interval: BillingInterval.Annual,
    trialDays: 7
  }
};

export async function getDatabyQuery(session, data) {
    const { shop, accessToken } = session;
    const endpoint = `https://${shop}/admin/api/2024-10/graphql.json`;
  
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify(data),
      });
  
      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error in getDatabyQuery:", error);
      return { errors: [{ message: error.message }] };
    }
}

export function dateDiffInDays(a, b) {
  const _MS_PER_DAY = 1000 * 60 * 60 * 24;
  const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((utc2 - utc1) / _MS_PER_DAY);
}

export function CurrentDate() {
  return new Date().toISOString();
}

export async function GetMongoDB(shop, collectionName) {
  try {
    const collection = db.collection(collectionName);
    const result = await collection.findOne({ shop_name: shop });
    console.log(`[MongoDB] Fetching from ${collectionName} for ${shop}:`, result ? "Found" : "Not Found");
    return result ? JSON.stringify(result) : JSON.stringify("");
  } catch (error) {
    console.error(`Error fetching from MongoDB ${collectionName}:`, error);
    return JSON.stringify("");
  }
}

export async function MongoDB_2(data, collectionName) {
  try {
    const collection = db.collection(collectionName);
    const result = await collection.updateOne(
      { shop_name: data.shop_name },
      { $set: data },
      { upsert: true }
    );
    console.log(`[MongoDB] Saved to ${collectionName} for ${data.shop_name}:`, result.upsertedCount > 0 ? "Upserted" : "Updated");
  } catch (error) {
    console.error(`Error saving to MongoDB ${collectionName}:`, error);
  }
}

export async function cancelBillingPlan(shop) {
  try {
    const collection = db.collection("billing_plan");
    await collection.updateOne(
      { shop_name: shop },
      { $set: { status: "cancelled", last_cancelled_at: new Date().toISOString() } }
    );
    console.log(`[MongoDB] Set status to cancelled for ${shop}`);
  } catch (error) {
    console.error(`Error cancelling plan in MongoDB:`, error);
  }
}

export async function DeleteMongoDB(shop, collectionName) {
  try {
    const collection = db.collection(collectionName);
    await collection.deleteOne({ shop_name: shop });
  } catch (error) {
    console.error(`Error deleting from MongoDB ${collectionName}:`, error);
  }
}

export async function confirmBillingPlan(session, chargeId) {
  const { shop } = session;
  console.log(`[Billing] Confirming plan for ${shop} with chargeId: ${chargeId}`);
  const fullId = chargeId.includes("gid://") ? chargeId : `gid://shopify/AppSubscription/${chargeId}`;
  
  const query = {
    query: `query getSubscription($id: ID!) {
      node(id: $id) {
        ... on AppSubscription {
          status
          name
          test
          lineItems {
            plan {
              appRecurringPricingDetails {
                price {
                  amount
                }
              }
            }
          }
        }
      }
    }`,
    variables: { id: fullId }
  };

  const result = await getDatabyQuery(session, query);
  const subscription = result.data?.node;
  console.log(`[Billing] Subscription status for ${shop}:`, subscription?.status || "Not Found");

  if (subscription && subscription.status === 'ACTIVE') {
    // 1. Update MongoDB
    let currentPlan = await GetMongoDB(shop, "billing_plan");
    currentPlan = currentPlan && currentPlan !== '""' ? JSON.parse(currentPlan) : {};
    
    const updatedPlan = {
      ...currentPlan,
      shop_name: shop,
      status: "active",
      id: fullId,
      name: subscription.name.toLowerCase(),
      plan_id: billingConfig[subscription.name.toLowerCase()]?.id || `plan_${subscription.name.toLowerCase()}_v1`,
      edit_limit: billingConfig[subscription.name.toLowerCase()]?.edit_limit || -1,
      test: subscription.test,
      price: subscription.lineItems?.[0]?.plan?.appRecurringPricingDetails?.price?.amount,
      plan_date: new Date().toISOString()
    };
    
    await MongoDB_2(updatedPlan, "billing_plan");
    await startTrialTracking(shop);

    // 2. Update Metafields
    const shopData = await getDatabyQuery(session, { query: `{ shop { id } }` });
    const shopID = shopData.data.shop.id;

    await getDatabyQuery(session, {
      query: `mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          userErrors { field message }
        }
      }`,
      variables: {
        metafields: [{
          key: "selected_plan",
          namespace: "order_edit_pro",
          ownerId: shopID,
          type: "json",
          value: JSON.stringify(updatedPlan)
        }]
      }
    });

    return true;
  } else {
    // If not active or cancelled, clean up
    await DeleteMongoDB(shop, "billing_plan");
    return false;
  }
}

export async function clearBillingMetafield(session, shopID) {
  return await getDatabyQuery(session, {
    query: `mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        userErrors { field message }
      }
    }`,
    variables: {
      metafields: [{
        key: "selected_plan",
        namespace: "order_edit_pro",
        ownerId: shopID,
        type: "json",
        value: JSON.stringify({})
      }]
    }
  });
}

/**
 * Trial Management Logic
 */

export async function initializeTrialManagement(shop) {
  try {
    let trialData = await GetMongoDB(shop, "trial_management");
    trialData = trialData && trialData !== '""' ? JSON.parse(trialData) : null;

    const now = new Date().toISOString();
    if (!trialData) {
      await MongoDB_2({
        shop_name: shop,
        days_used: 0,
        first_install_at: now,
        last_install_at: now,
        status: "installed"
      }, "trial_management");
    } else {
      await MongoDB_2({
        ...trialData,
        last_install_at: now,
        status: "installed"
      }, "trial_management");
    }
  } catch (error) {
    console.error("Error in initializeTrialManagement:", error);
  }
}

export async function calculateTrialDays(shop, planTrialLimit = 14) {
  try {
    let trialData = await GetMongoDB(shop, "trial_management");
    trialData = trialData && trialData !== '""' ? JSON.parse(trialData) : null;

    if (!trialData) {
      console.log(`[Trial] No trial record for ${shop}. Full ${planTrialLimit} days.`);
      return planTrialLimit;
    }

    const usedDays = trialData.days_used || 0;
    const remaining = planTrialLimit - usedDays;
    const result = remaining > 0 ? Math.floor(remaining) : 0;
    console.log(`[Trial] ${shop} has used ${usedDays.toFixed(2)} days. Remaining: ${result}`);
    return result;
  } catch (error) {
    console.error("Error in calculateTrialDays:", error);
    return planTrialLimit;
  }
}

export async function startTrialTracking(shop) {
  try {
    let trialData = await GetMongoDB(shop, "trial_management");
    trialData = trialData && trialData !== '""' ? JSON.parse(trialData) : null;

    const now = new Date();
    if (!trialData) {
      await MongoDB_2({
        shop_name: shop,
        days_used: 0,
        last_started_at: now.toISOString(),
        first_install_at: now.toISOString(),
        last_install_at: now.toISOString(),
        status: "active"
      }, "trial_management");
    } else {
      await MongoDB_2({
        ...trialData,
        last_started_at: now.toISOString(),
        status: "active"
      }, "trial_management");
    }
    console.log(`[Trial] Started tracking for ${shop}`);
  } catch (error) {
    console.error("Error in startTrialTracking:", error);
  }
}

export async function stopTrialTracking(shop) {
  try {
    let trialData = await GetMongoDB(shop, "trial_management");
    trialData = trialData && trialData !== '""' ? JSON.parse(trialData) : null;

    const now = new Date();
    if (trialData && trialData.last_started_at) {
      const startedAt = new Date(trialData.last_started_at);
      const diffDays = (now - startedAt) / (1000 * 60 * 60 * 24);
      
      await MongoDB_2({
        ...trialData,
        days_used: (trialData.days_used || 0) + diffDays,
        last_started_at: null,
        last_uninstalled_at: now.toISOString(),
        status: "uninstalled"
      }, "trial_management");
      console.log(`[Trial] Stopped tracking for ${shop}. Added ${diffDays.toFixed(2)} days to usage.`);
    } else if (trialData) {
      await MongoDB_2({
        ...trialData,
        last_uninstalled_at: now.toISOString(),
        status: "uninstalled"
      }, "trial_management");
    }
  } catch (error) {
    console.error("Error in stopTrialTracking:", error);
  }
}

/**
 * Usage Limit & Status Sync
 */

export async function getCurrentMonthEditCount(shop) {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const count = await activitiesCol.countDocuments({
      shop: shop,
      type: { $in: ["ORDER_UPDATE", "ITEM_REMOVED", "PRODUCT_ADDED", "ITEM_REPLACED"] },
      createdAt: { $gte: startOfMonth }
    });
    return count;
  } catch (error) {
    console.error("Error counting monthly edits:", error);
    return 0;
  }
}

export async function syncUsageStatus(session, admin) {
  try {
    const shop = session.shop;
    let billingPlan = await GetMongoDB(shop, "billing_plan");
    billingPlan = billingPlan && billingPlan !== '""' ? JSON.parse(billingPlan) : null;

    if (!billingPlan) return;

    const limit = billingPlan.edit_limit || -1;
    if (limit === -1) {
      // Unlimited
      await updateUsageMetafield(admin, session, false);
      return;
    }

    const currentCount = await getCurrentMonthEditCount(shop);
    const limitReached = currentCount >= limit;

    await updateUsageMetafield(admin, session, limitReached);
    console.log(`[Usage] ${shop}: ${currentCount}/${limit}. Limit Reached: ${limitReached}`);
  } catch (error) {
    console.error("Error syncing usage status:", error);
  }
}

async function updateUsageMetafield(admin, session, limitReached) {
  const shopData = await getDatabyQuery(session, { query: `{ shop { id } }` });
  const shopID = shopData.data.shop.id;

  await getDatabyQuery(session, {
    query: `mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        userErrors { field message }
      }
    }`,
    variables: {
      metafields: [{
        key: "limit_reached",
        namespace: "order_edit_pro",
        ownerId: shopID,
        type: "boolean",
        value: limitReached ? "true" : "false"
      }]
    }
  });
}
