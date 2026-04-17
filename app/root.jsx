import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
export const links = () => [];

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <meta name="shopify-api-key" content="ee0d8eb337181cafaf7912854e760d1d" />
        <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
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
