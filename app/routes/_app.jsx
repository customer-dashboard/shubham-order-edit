import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider as ShopifyAppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate } from "../shopify.server";
import { useEffect, useState } from "react";
import { getAppConfig } from "../server/graphql";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const resetOnboarding = url.searchParams.get("test") === "onobarding_reset";

  let config = await getAppConfig(admin);

  if (!config || resetOnboarding) {
    config = {
      onboarding: { step: 0, completed: false },
      settings: {
        edit_shipping_address: true,
        edit_phone_number: true,
        show_line_items: true,
        update_quantity: true,
        replace_line_item: true,
        change_delivery_instruction: true,
        apply_discount: false,
        download_invoice: true
      }
    };
  }

  // eslint-disable-next-line no-undef
  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
    config
  };
};

export default function App() {
  const { apiKey, config: initialConfig } = useLoaderData();
  const [config, setConfig] = useState(initialConfig);
  const [defSetting, setDefSetting] = useState([]);
  const [onBoarding, setOnBoarding] = useState(true);
  const [billingNew, setBillingNew] = useState([]);
  const [isShopifyPlus, setIsShopifyPlus] = useState("");
  const [storeLanguages, setStorelanguages] = useState([]);

  useEffect(() => {
    getLocals();
    // Database();
    // customerStatus();
  }, []);


  const getLocals = async () => {
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
      if (responseJson.status == 200) {
        const { locals } = responseJson.data;
        setStorelanguages(locals?.shopLocales);
      }
    } catch (error) {
      console.error("An error occurred:", error.message);
    }
  };



  return (
    <ShopifyAppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/" rel="home">Home</s-link>
      </s-app-nav>
      <Outlet
        context={{
          defSetting,
          setDefSetting,
          config,
          setConfig,
          isShopifyPlus,
          billingNew,
          storeLanguages,
        }}
      />
    </ShopifyAppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
