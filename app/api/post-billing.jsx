import { authenticate } from "../shopify.server";
import {
  billingConfig,
  getDatabyQuery,
  GetMongoDB,
  MongoDB_2,
  dateDiffInDays,
  CurrentDate,
  IS_TEST_MODE,
  calculateTrialDays
} from "../lib/billing.server";

export async function action({ request }) {
  const { session, admin } = await authenticate.admin(request);
  const body = await request.json();
  const { name, planObject, shop, test, price, active, iscustomplan, onboarding, returnPath } = body;

  const data2 = {
    "query": `{
      currentAppInstallation {
        activeSubscriptions {
            status
            id
            returnUrl
            name
            trialDays
            test
            currentPeriodEnd
        }
      }
    }`
  };

  const planResult = await getDatabyQuery(session, data2);

  // Check if store is a development store
  const storePlanQuery = {
    query: `query CheckStorePlan {
      shop {
        plan {
          partnerDevelopment
          publicDisplayName 
        }
      }
    }`
  };
  const storePlanResult = await getDatabyQuery(session, storePlanQuery);
  const isDevelopment = storePlanResult.data?.shop?.plan?.partnerDevelopment || false;

  // Calculate trial days using trial_management
  const trialDays = await calculateTrialDays(session.shop, planObject.trialDays || 14);
  const baseUrl = `https://admin.shopify.com/store/${session.shop.split(".myshopify.com")[0]}/apps/${process.env.SHOPIFY_API_KEY}`;
  let finalReturnPath = returnPath;

  const createBilling = {
    "query": `mutation AppSubscriptionCreate($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $returnUrl: URL!, $trialDays: Int,$test:Boolean) {
    appSubscriptionCreate(name: $name, returnUrl: $returnUrl, lineItems: $lineItems, trialDays: $trialDays,test:$test) {
      userErrors {
        field
        message
      }
      appSubscription {
        id
      }
      confirmationUrl
    }
  }`,
    "variables": {
      "name": name,
      "returnUrl": `${baseUrl}${finalReturnPath}`,
      "test": isDevelopment ? true : (IS_TEST_MODE || test),
      "trialDays": trialDays,
      "lineItems": [
        {
          "plan": {
            "appRecurringPricingDetails": {
              "price": {
                "amount": Number(price),
                "currencyCode": "USD"
              },
              "interval": active == "Yearly" ? 'ANNUAL' : 'EVERY_30_DAYS'
            }
          }
        }
      ]
    }
  };

  const createBillingResult = await getDatabyQuery(session, createBilling);
  const dataResult = createBillingResult.data;

  if (dataResult?.appSubscriptionCreate?.userErrors?.length > 0) {
    return { error: dataResult.appSubscriptionCreate.userErrors[0].message, status: 400 };
  }

  const planStorage = {
    shop_name: session.shop,
    ...planObject,
    plan_date: CurrentDate(),
    status: "pending_approval",
    active: active,
    is_development_store: isDevelopment,
    shop_plan: storePlanResult.data?.shop?.plan?.publicDisplayName
  };

  await MongoDB_2(planStorage, "billing_plan");

  return { data: dataResult.appSubscriptionCreate.confirmationUrl };
}
