import { authenticate } from "../shopify.server";
import { getAppStatus, getStoreLanguages, getStoreThemes } from "../server/graphql";


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


