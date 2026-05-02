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
              if (startStr) start = new Date(startStr);
              if (endStr) {
                end = new Date(endStr);
                end.setHours(23, 59, 59, 999);
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
                  total_discount_code: s["DISCOUNT_APPLIED"] || 0,
                  total_phone_number_editing: s["PHONE_UPDATE"] || 0,
                  total_invoice_download: s["INVOICE_GENERATED"] || 0,
                  total_delivery_instructions: s["DELIVERY_INST_UPDATE"] || 0,
                  total_order_line_items_editing: (s["ITEM_REMOVED"] || 0) + (s["ITEM_REPLACED"] || 0) + (s["QTY_UPDATE"] || 0) + (s["ORDER_UPDATE"] || 0),
                  total_adding_more_products: s["PRODUCT_ADDED"] || 0
                }
              },
              status: 200
            };

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


