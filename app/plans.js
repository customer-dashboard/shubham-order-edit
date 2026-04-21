import { BillingInterval } from "@shopify/shopify-app-react-router/server";

/**
 * UNIQUE PLAN HANDLES
 * Use versioned names (e.g. _v1) to allow for grandfathering 
 * existing merchants when you change plans in the future.
 */
export const FREE_PLAN_ID = "FREE";
export const STANDARD_PLAN_V1 = "Monthly Standard Plan V1";
export const PREMIUM_PLAN_V1 = "Monthly Premium Plan V1";

export const ALL_PLANS = [
  {
    id: FREE_PLAN_ID,
    title: "0-500 orders/m",
    price: "$0",
    amount: 0,
    desc: "25 edits/upsells free every month",
    features: [
      "Access to all features",
      "Self Service Order Editing",
      "Post Purchase Upsell (Increase AOV)",
      "Address Validation (powered by Google)",
      "Customizable editing window",
      "Add/replace items",
      "Apply Discounts + Automated Refunds",
      "24*7 Chat Support",
    ],
    active: true, // Whether this plan is shown to new merchants
  },
  {
    id: STANDARD_PLAN_V1,
    title: "500-5000 orders/m",
    price: "$49",
    amount: 49,
    currencyCode: "USD",
    interval: BillingInterval.Every30Days,
    trialDays: 14,
    desc: "unlimited order edits + upsells",
    features: [
      "Access to all features",
      "Unlimited Self Service Order Editing",
      "Post Purchase Upsell (Increase AOV)",
      "Address Validation (powered by Google)",
      "Customizable editing window",
      "Add/replace items",
      "Apply Discounts + Automated Refunds",
      "24*7 Chat Support",
      "Priority Support - Chat + Slack",
      "WMS/3PL Integrations",
      "White glove onboarding",
    ],
    active: false,
  },
  {
    id: PREMIUM_PLAN_V1,
    title: "5000-15000 orders/m",
    price: "$129",
    amount: 129,
    currencyCode: "USD",
    interval: BillingInterval.Every30Days,
    trialDays: 14,
    desc: "unlimited order edits + upsells",
    features: [
      "Access to all features",
      "Unlimited Self Service Order Editing",
      "Post Purchase Upsell (Increase AOV)",
      "Address Validation (powered by Google)",
      "Customizable editing window",
      "Add/replace items",
      "Apply Discounts + Automated Refunds",
      "24*7 Chat Support",
      "Priority Support - Chat + Slack",
      "WMS/3PL Integrations",
      "White glove onboarding",
      "Phone-call Support",
      "Dedicated Success Manager",
    ],
    active: false,
  },
];

/**
 * Helper to get the Shopify Billing Configuration object.
 * Subscription plans MUST use the lineItems structure.
 */
export function getBillingConfig() {
  return {};
}

/**
 * Filter to get only plans currently available for new subscriptions.
 */
export const ACTIVE_PLANS = ALL_PLANS.filter((p) => p.active);
