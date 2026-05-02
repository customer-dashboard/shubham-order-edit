import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider as ShopifyAppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate } from "../shopify.server";
import { useEffect, useState } from "react";
import { AppProvider as PolarisProvider } from "@shopify/polaris";
import translations from "@shopify/polaris/locales/en.json";


export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
  };
};

export default function App() {
  const { apiKey } = useLoaderData();
  const [config, setConfig] = useState(null);
  const [defSetting, setDefSetting] = useState([]);
  const [billingNew, setBillingNew] = useState([]);
  const [storeLanguages, setStorelanguages] = useState([]);

  useEffect(() => {
    async function initApp() {
      try {
        // Direct API Access for Config
        const response = await fetch('shopify:admin/api/graphql.json', {
          method: 'POST',
          body: JSON.stringify({
            query: `
              query getAppConfig {
                shop {
                  metafield(namespace: "custlo_app", key: "app_settings") {
                    value
                  }
                }
              }
            `,
          }),
        });

        const { data } = await response.json();
        const value = data?.shop?.metafield?.value;
        
        if (value) {
          setConfig(JSON.parse(value));
        } else {
          // Default config if metafield missing
          const { DEFAULT_APP_SETTINGS } = await import("../constants/defaultSettings");
          setConfig(DEFAULT_APP_SETTINGS);
        }

      } catch (error) {
        console.error("Error initializing app via Direct API:", error);
      }
    }

    initApp();
    getLocals();
  }, []);

  const getLocals = async () => {
    let formdata = new FormData();
    formdata.append("_action", "GET_LOCALS");
    try {
      const response = await fetch("/app/fetch-data", {
        method: "POST",
        body: formdata,
      });
      const responseJson = await response.json();
      if (responseJson.status == 200) {
        const { locals } = responseJson.data;
        setStorelanguages(locals?.shopLocales);
      }
    } catch (error) {
      console.error("Error fetching locals:", error);
    }
  };

  if (!config) {
    return (
      <ShopifyAppProvider embedded apiKey={apiKey}>
        <s-page>
           <s-box paddingBlock="large-400">
              <s-skeleton-body-text lines={10} />
           </s-box>
        </s-page>
      </ShopifyAppProvider>
    );
  }

  return (
    <ShopifyAppProvider embedded apiKey={apiKey}>
      <PolarisProvider i18n={translations}>
        <s-app-nav>
          <s-link href="/" rel="home">Home</s-link>
          <s-link href="/analytics">Analytics</s-link>
          <s-link href="/settings">Settings</s-link>
        </s-app-nav>


        <Outlet
          context={{
            defSetting,
            setDefSetting,
            config,
            setConfig,
            billingNew,
            storeLanguages,
          }}
        />
      </PolarisProvider>
    </ShopifyAppProvider>
  );

}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
