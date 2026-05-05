import { authenticate } from "../shopify.server";
import {
  billingConfig,
  getDatabyQuery,
  GetMongoDB,
  MongoDB_2,
  appPlanUpdateDataToBrevo,
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

  if (name == "free") {
    let getdata = await GetMongoDB(session.shop, "shop_info");
    getdata = JSON.parse(getdata);
    let brevodata = { name: "Free", email: getdata?.email || "" };
    await appPlanUpdateDataToBrevo(brevodata);

    if (planResult.data?.currentAppInstallation?.activeSubscriptions?.[0]) {
      await getDatabyQuery(session, {
        "query": `mutation CancelSubscription($id: ID!) {
          appSubscriptionCancel(id: $id) {
            userErrors {
              field
              message
            }
            appSubscription {
              id
              status
            }
          }
        }`,
        "variables": {
          "id": planResult.data.currentAppInstallation.activeSubscriptions[0].id
        },
      });
    }

    // For free plan, we might not need a confirmation URL, so we return success or a specific flag
    // Update storage for free plan
    const planStorage = {
      shop_name: session.shop,
      ...planObject,
      plan_date: CurrentDate(),
      status: "active",
      active: active,
    };

    const dta = await getDatabyQuery(session, {
      query: `{
        shop {
          id
        }
      }`
    });
    const shopID = dta.data.shop.id;

    await getDatabyQuery(session, {
      "query": `mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          userErrors {
            field
            message
          }
        }
      }`,
      "variables": {
        "metafields": [
          {
            "key": "selected_plan",
            "namespace": "order_edit_pro",
            "ownerId": shopID,
            "type": "json",
            "value": JSON.stringify(planStorage)
          }
        ]
      },
    });

    await MongoDB_2(planStorage, "billing_plan");

    return { data: "success" };
  }

  if (name != "free") {
    // Calculate trial days using trial_management
    const trialDays = await calculateTrialDays(session.shop, 14);
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
        "test": IS_TEST_MODE || test,
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
    };

    await MongoDB_2(planStorage, "billing_plan");

    return { data: dataResult.appSubscriptionCreate.confirmationUrl };
  }
}
