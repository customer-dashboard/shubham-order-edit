// Centralized App Bridge accessor for frontend usage.
// Use this in client-side code:
//   import { shopify, waitForShopify } from "../lib/shopify.client";

function getGlobalShopify() {
  if (typeof window === "undefined") return undefined;
  return window.shopify;
}

export function getShopify() {
  return getGlobalShopify();
}

export function requireShopify() {
  const instance = getGlobalShopify();
  if (!instance) {
    throw new Error(
      "Shopify App Bridge is not ready on window.shopify yet. Use waitForShopify() before accessing it.",
    );
  }
  return instance;
}

export function waitForShopify({ timeoutMs = 10000, pollMs = 50 } = {}) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      const instance = getGlobalShopify();
      if (instance) {
        resolve(instance);
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        reject(
          new Error(
            "Timed out waiting for window.shopify. Ensure this runs inside the embedded app context.",
          ),
        );
        return;
      }

      setTimeout(check, pollMs);
    };

    check();
  });
}

// Global proxy so you can do:
//   import { shopify } from "../lib/shopify.client";
//   shopify.toast.show("Saved");
export const shopify = new Proxy(
  {},
  {
    get(_, prop) {
      const instance = requireShopify();
      const value = instance[prop];
      return typeof value === "function" ? value.bind(instance) : value;
    },
  },
);
