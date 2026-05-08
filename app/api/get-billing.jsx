import { authenticate } from "../shopify.server";
import { getDatabyQuery, GetMongoDB, MongoDB_2, billingConfig } from "../lib/billing.server";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);

  // 1. Check MongoDB first for active plan
  let billingPlan = await GetMongoDB(session.shop, "billing_plan");
  billingPlan = billingPlan && billingPlan !== '""' ? JSON.parse(billingPlan) : null;

  if (billingPlan && billingPlan.status === 'active') {
    let trialInfo = await GetMongoDB(session.shop, "trial_management");
    trialInfo = trialInfo && trialInfo !== '""' ? JSON.parse(trialInfo) : null;
    
    const response = {
      ...billingPlan,
      trial_info: trialInfo
    };
    console.log("Plan fetched from MongoDB:", response.name);
    return response;
  }

  // 2. Fallback: Get active subscriptions from Shopify and sync to MongoDB
  const data2 = {
    "query": `{
      currentAppInstallation {
        activeSubscriptions {
            status
            id
            name
            test
        }
      }
    }`
  };

  const planResult = await getDatabyQuery(session, data2);
  const activeSub = planResult.data?.currentAppInstallation?.activeSubscriptions?.[0];

  if (activeSub && activeSub.status === 'ACTIVE') {
    const activePlan = {
      shop_name: session.shop,
      status: 'active',
      name: activeSub.name.toLowerCase(),
      id: activeSub.id,
      test: activeSub.test,
      plan_id: billingConfig[activeSub.name.toLowerCase()]?.id || `plan_${activeSub.name.toLowerCase()}_v1`,
      edit_limit: billingConfig[activeSub.name.toLowerCase()]?.edit_limit || -1,
      plan_date: new Date().toISOString()
    };
    
    // Sync to MongoDB
    await MongoDB_2(activePlan, "billing_plan");
    console.log("Plan synced from Shopify to MongoDB:", activePlan.name);
    return activePlan;
  }

  // 3. Default to none if nothing found
  const noPlan = {
    shop_name: session.shop,
    status: 'none',
    name: 'none'
  };

  return noPlan;
}
