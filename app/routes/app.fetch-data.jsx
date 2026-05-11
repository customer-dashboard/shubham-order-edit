import { authenticate } from "../shopify.server";
import { getAppStatus, getStoreLanguages, getStoreThemes } from "../server/graphql";
import { activities as activitiesCol } from "../mongodb.server";


export async function action({ request }) {
  const { admin, session } = await authenticate.admin(request);
  let status= 200;
  let data= [];
  const formValue = await request.formData();
  let _action = formValue.get("_action");

  try {
      switch (_action) {
        case "GET_SHOP_NAME":
          const shopResponse = await admin.graphql(`
            query {
              shop {
                name
              }
            }
          `);
          const shopJson = await shopResponse.json();
          data = { shop: shopJson?.data?.shop || null };
          return { data, status };

        case "GET_LOCALS":
          const locals = await getStoreLanguages(admin.graphql);
          data = {locals:locals?.data,};
          return {data,status}

        case "GET_THEMES":
          const themes = await getStoreThemes(admin.graphql);
          data = {themes:themes?.data,};
          return {data,status}

        case "app_status":
            const allthemesStr = formValue.get("allthemes");
            let allthemesEC = [];
            try {
                allthemesEC = JSON.parse(allthemesStr);
            } catch (e) {
                console.error("Invalid JSON in allthemes:", e);
            }
            const app_status = await getAppStatus(session,allthemesEC);
            // console.log("App status", app_status);
            return {app_status,status:200}
        case "GET_DASHBOARD_METRICS":
            // Fetch Metafield Directly for Dashboard (Metafield-driven)
            const response = await admin.graphql(
              `#graphql
              query getAnalytics {
                shop {
                  metafield(namespace: "order_editing", key: "analytics_30d") {
                    value
                  }
                }
              }`
            );
            const result = await response.json();
            const metaValue = result.data?.shop?.metafield?.value;
            
            let analytics = null;
            if (metaValue) {
              try {
                analytics = JSON.parse(metaValue);
              } catch (e) {
                console.error("Error parsing analytics metafield:", e);
              }
            }

            // Trigger sync in background to keep it fresh for next visit
            const { syncAnalytics } = await import("../server/graphql");
            syncAnalytics(admin, session.shop);

            return {
              data: {
                analytics: analytics || {},
                // Minimal metrics for legacy support if needed, but primarily driven by analytics object
                metrics: analytics ? { 
                  totalEdits: analytics.totalorderedit, 
                  todayEdits: analytics.todayEdits, 
                  yesterdayEdits: analytics.yesterdayEdits, 
                  change: analytics.change 
                } : { totalEdits: 0, todayEdits: 0, yesterdayEdits: 0, change: 0 }
              },
              status: 200
            };        case "GET_DETAILED_ANALYTICS":
            const range = formValue.get("range"); // "YYYY-MM-DD--YYYY-MM-DD"
            let start = new Date();
            start.setDate(start.getDate() - 30);
            let end = new Date();

            if (range) {
              const [startStr, endStr] = range.split("--");
              if (startStr) {
                // Parse as YYYY-MM-DD and set to 00:00:00 local time
                const [y, m, d] = startStr.split('-').map(Number);
                start = new Date(y, m - 1, d, 0, 0, 0, 0);
              }
              if (endStr) {
                const [y, m, d] = endStr.split('-').map(Number);
                end = new Date(y, m - 1, d, 23, 59, 59, 999);
              }
            }

            const [detailedStats, summaryCounts] = await Promise.all([
              activitiesCol.aggregate([
                { 
                  $match: { 
                    shop: session.shop, 
                    createdAt: { $gte: start, $lte: end } 
                  } 
                },
                {
                  $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 }
                  }
                },
                { $sort: { _id: 1 } }
              ]).toArray(),
              activitiesCol.aggregate([
                { 
                  $match: { 
                    shop: session.shop, 
                    createdAt: { $gte: start, $lte: end } 
                  } 
                },
                {
                  $group: {
                    _id: "$type",
                    count: { $sum: 1 }
                  }
                }
              ]).toArray()
            ]);

            const s = Object.fromEntries(summaryCounts.map(item => [item._id, item.count]));

            return {
              data: {
                chartData: detailedStats.map(s => ({
                  key: s._id,
                  value: s.count
                })),
                counts: {
                  total_shipping_address_editing: s["ADDRESS_UPDATE"] || 0,

                  total_phone_number_editing: s["PHONE_UPDATE"] || 0,
                  total_invoice_download: (s["INVOICE_GENERATED"] || 0) + (s["INVOICE_SENT"] || 0),
                  total_delivery_instructions: s["DELIVERY_INST_UPDATE"] || 0,
                  total_order_line_items_editing: (s["ITEM_REMOVED"] || 0) + (s["ITEM_REPLACED"] || 0) + (s["QTY_UPDATE"] || 0) + (s["ORDER_UPDATE"] || 0),
                  total_adding_more_products: s["PRODUCT_ADDED"] || 0
                }
              },
              status: 200
            };

        case "GET_RECENT_ACTIVITY":
            const recentActivities = await activitiesCol
              .find({ shop: session.shop })
              .sort({ createdAt: -1 })
              .limit(10)
              .toArray();
            
            return {
              data: {
                activities: recentActivities.map(a => ({
                  id: a._id,
                  orderId: a.orderId,
                  orderName: a.orderName,
                  message: a.message,
                  type: a.type,
                  createdAt: a.createdAt
                }))
              },
              status: 200
            };

        case "GET_BILLING": {
          const { getDatabyQuery, GetMongoDB, MongoDB_2, billingConfig } = await import("../lib/billing.server");
          let billingPlan = await GetMongoDB(session.shop, "billing_plan");
          billingPlan = billingPlan && billingPlan !== '""' ? JSON.parse(billingPlan) : null;

          if (billingPlan && billingPlan.status === 'active') {
            let trialInfo = await GetMongoDB(session.shop, "trial_management");
            trialInfo = trialInfo && trialInfo !== '""' ? JSON.parse(trialInfo) : null;
            return { data: { ...billingPlan, trial_info: trialInfo }, status: 200 };
          }

          const data2 = {
            query: `{
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
            await MongoDB_2(activePlan, "billing_plan");
            return { data: activePlan, status: 200 };
          }

          return { data: { shop_name: session.shop, status: 'none', name: 'none' }, status: 200 };
        }

        case "POST_BILLING": {
          const {
            billingConfig,
            getDatabyQuery,
            MongoDB_2,
            CurrentDate,
            IS_TEST_MODE,
            calculateTrialDays
          } = await import("../lib/billing.server");
          
          const body = JSON.parse(formValue.get("body"));
          const { name, planObject, test, price, active, returnPath } = body;

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

          const trialDays = await calculateTrialDays(session.shop, planObject.trialDays || 14);
          const baseUrl = `https://admin.shopify.com/store/${session.shop.split(".myshopify.com")[0]}/apps/${process.env.SHOPIFY_API_KEY}`;

          const createBilling = {
            query: `mutation AppSubscriptionCreate($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $returnUrl: URL!, $trialDays: Int,$test:Boolean) {
            appSubscriptionCreate(name: $name, returnUrl: $returnUrl, lineItems: $lineItems, trialDays: $trialDays,test:$test) {
              userErrors { field message }
              appSubscription { id }
              confirmationUrl
            }
          }`,
            variables: {
              name: name,
              returnUrl: `${baseUrl}${returnPath}`,
              test: isDevelopment ? true : (IS_TEST_MODE || test),
              trialDays: trialDays,
              lineItems: [{
                plan: {
                  appRecurringPricingDetails: {
                    price: { amount: Number(price), currencyCode: "USD" },
                    interval: active == "Yearly" ? 'ANNUAL' : 'EVERY_30_DAYS'
                  }
                }
              }]
            }
          };

          const createBillingResult = await getDatabyQuery(session, createBilling);
          const dataResult = createBillingResult.data;

          if (dataResult?.appSubscriptionCreate?.userErrors?.length > 0) {
            return { data: { error: dataResult.appSubscriptionCreate.userErrors[0].message }, status: 400 };
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
          return { data: { confirmationUrl: dataResult.appSubscriptionCreate.confirmationUrl }, status: 200 };
        }

        default:
          break;
        }
  } catch (error) {
    data=error.message;
    status=500;
  }
  return {data,status}
}


// export const onAppInstall = async (admin,session) => {
//     var data = await getShopData(admin,session);
//     let { shop, accessToken } = session;
//     const CustomerCount = await getCustomersData(shop, accessToken,'count');
//     // console.log("CustomerCount",CustomerCount);
//     // console.log("data",data.data.shop);
//     data=data.data.shop;
//     const resData = {
//       shop: session.shop,
//       email: data.email,
//       phone: data.billingAddress.phone,
//       shop_owner: data.shopOwnerName,
//       customer: CustomerCount,
//       date: CurrentDate(),
//       status: 1,
//     }
//     const result = await MongoDB(resData,"shop_info");
//     // console.log("result", result);
//     return resData;
//   }


