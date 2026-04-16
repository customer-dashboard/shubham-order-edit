import { postMetafileds } from "../server/graphql";
import { authenticate } from "../shopify.server";
// import { GetCollectionMongoDB } from "../server/mongodb";


export const loader = async ({ request }) => {
  let { searchParams } = new URL(request.url);
  let shop = searchParams.get("shop");
//   const users = await GetCollectionMongoDB("shopify_sessions",shop);
//   const sessionArray = JSON.parse(users);
//   const accessToken = sessionArray.accessToken;
  let variables = {};

  return json(shop);
};


export const action = async ({ request }) => {
  const reqbody = await request.json();
  // console.log("reqbody", reqbody);
  let { searchParams } = new URL(request.url);
  let target = reqbody.target;
  let shop = searchParams.get("shop");
//   const users = await GetCollectionMongoDB("shopify_sessions",shop);
  const { admin, session } = await authenticate.public.appProxy(request);
  const sessionArray = JSON.parse(users);
  const accessToken = sessionArray.accessToken;
  // var setting = await getMetafieldsData(admin);
  // setting = JSON.parse(setting);
var setting;

    switch (target) {
    
  case "app-status-on-theme":
    if (( setting.app_status === true)) {
      return true;
    }
    setting.app_status = false;
    let formdata = new FormData();
    formdata.append("_postMetafileds", JSON.stringify(setting));
    const postData = await postMetafileds(admin,formdata,shop,accessToken);
    return false;
      
      default:
      break;
  }

  return { message: true };
};