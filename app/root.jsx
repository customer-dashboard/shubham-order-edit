import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "react-router";

import globalStyles from "./styles/global.css?url";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import polarisVizStyles from "@shopify/polaris-viz/build/esm/styles.css?url";

export const links = () => [
  { rel: "stylesheet", href: polarisStyles },
  { rel: "stylesheet", href: polarisVizStyles },
  { rel: "stylesheet", href: globalStyles },
];

export const loader = async () => {
  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
  };
};

export default function App() {
  const { apiKey } = useLoaderData();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        />
        <link
          rel="preconnect"
          href="https://cdn.shopify.com/"
        />
        <meta
          name="shopify-api-key"
          content={apiKey}
        />

        <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>

        <script
          dangerouslySetInnerHTML={{
            __html: `
              function processWebVitals(metrics) {
                const data = JSON.stringify(metrics);
                console.log("Metrics", metrics);
              }

              if (
                window.shopify &&
                window.shopify.webVitals &&
                window.shopify.webVitals.onReport
              ) {
                window.shopify.webVitals.onReport(processWebVitals);
              }
            `,
          }}
        />

        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />

        <Meta />
        <Links />
      </head>

      <body>
        <Outlet />

        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}