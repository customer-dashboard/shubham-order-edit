import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider as ShopifyAppProvider } from "@shopify/shopify-app-react-router/react";
import { AppProvider as PolarisAppProvider } from "@shopify/polaris";
import en from "@shopify/polaris/locales/en.json";
import { authenticate } from "../shopify.server";
import { useEffect, useState } from "react";

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData();
  const [allThemes, setAllThemes] = useState([]);
  const [liveTheme, setLiveTheme] = useState([]);
  const [enableTheme, setEnableTheme] = useState();
  const [appStatusOnTheme, setAppStatusOnTheme] = useState(false);
  const [defSetting, setDefSetting] = useState([]);
  const [onBoarding, setOnBoarding] = useState(true);
  const [billingNew, setBillingNew] = useState([]);
  const [isShopifyPlus, setIsShopifyPlus] = useState("");
  const [storeLanguages, setStorelanguages] = useState([]);


    useEffect(()=>{
      getLocals();
      getThemes();
      app_status_on_theme();
      // Database();
      // customerStatus();
  },[])

    useEffect(() => {
    app_status_on_theme();
    // shopData();
    if (!appStatusOnTheme) {
      setEnableTheme(liveTheme);
    }
  }, [appStatusOnTheme, liveTheme]);

  // get data on installation and charge id
  //   useEffect(() => {
  //   const fetchData = async () => {
  //     const queryParameters = new URLSearchParams(window.location.search);
  //     const charge_id = queryParameters.get("charge_id");
  //     // console.log("charge_id", charge_id);
  //     if (charge_id) {
  //       // setProgress2(true);
  //       const data = await paymentCheck();
  //       await getbilling();
  //       await customerStatus();
  //       let newShop = data.replace(".myshopify.com", "");
  //       window.open(
  //         "https://admin.shopify.com/store/" + newShop + "/apps/customer-account-verification",
  //         "_top"
  //       );
  //     }else{
  //       get_AllSettings();
  //     }
  //     await get_AllSettings();
  //   };
  //   fetchData();
  // }, []);

    const getLocals = async() =>{
    let formdata = new FormData();
      formdata.append("_action", "GET_LOCALS");
      try {
        const response = await fetch("/app/fetch-data", {
          method: "POST",
          body: formdata,
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const responseJson = await response.json();
        if(responseJson.status==200) {
          const { locals } = responseJson.data;
          console.log("locals", locals);
          setStorelanguages(locals?.shopLocales);
        }
      } catch (error) {
        console.error("An error occurred:", error.message);
      }
  }

  const getThemes = async() =>{
    let formdata = new FormData();
      formdata.append("_action", "GET_THEMES");
      try {
        const response = await fetch("/app/fetch-data", {
          method: "POST",
          body: formdata,
        });
        const responseJson = await response.json();
        if(responseJson.status==200) {
          const { themes } = responseJson.data;
          const allThemes = themes.themes.edges;
          console.log("allThemes", allThemes);
          setAllThemes(allThemes);
          allThemes.forEach(ele => {
            if (ele.node.role === "MAIN") {
                setLiveTheme({ name: ele.node.name, value: (ele.node.id).replace(/^.*\//, ""), role: ele.node.role });
            }
        });
        }
      } catch (error) {
        console.error("An error occurred:", error.message);
      }
  }

  const app_status_on_theme = async() =>{
  let formdata = new FormData();
  formdata.append("_action", "app_status");
  formdata.append("allthemes", JSON.stringify(allThemes));
  const response = await fetch("/app/fetch-data", {method: "POST", body: formdata});
  const responseJson = await response.json();
  const enabledThemes = [];

  responseJson?.app_status.forEach(ele => {
    if (ele.node.embed_status_disabled === false) {
      const themeData = {
        name: ele.node.name,
        value: ele.node.id.replace(/^.*\//, ""),
        role: ele.node.role,
      };
      enabledThemes.push(themeData);
    }
  });

  if (enabledThemes.length > 0) {
    setAppStatusOnTheme(true);      
    setEnableTheme(enabledThemes[0]);     
  }
    return (responseJson?.app_status);
}

console.log("appstatusonTheme", appStatusOnTheme);
console.log("enableTheme", enableTheme);

  return (
    <PolarisAppProvider i18n={en}>
      <ShopifyAppProvider embedded apiKey={apiKey}>
        <s-app-nav>
          <s-link href="/app">Dashboard</s-link>
          <s-link href="/app/plans">Plans</s-link>
        </s-app-nav>
        <Outlet context={{
          allThemes,
          defSetting,
          setDefSetting,
          enableTheme,
          liveTheme,
          onBoarding,
          setOnBoarding,
          appStatusOnTheme,
          isShopifyPlus,
          billingNew,
          storeLanguages
        }} />
      </ShopifyAppProvider>
    </PolarisAppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
