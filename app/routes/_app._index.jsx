import { useEffect, useState } from "react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useRouteError } from "react-router";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(false);
  const [shopName, setShopName] = useState("");

  useEffect(() => {
    // Client-side pe window.shopify global object access kar sakte ho
    if (typeof window !== "undefined" && window.shopify) {
      console.log("Shopify instance in Dashboard:", window.shopify);
      console.log("App Config:", window.shopify.config);
      // Example toast
      // window.shopify.toast.show('Dashboard Loaded!');
    }
  }, []);
  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  const featureUsageData = [
    { feature: "Edit Shipping Address", icon: "location", count: 0, percentage: 0 },
    { feature: "Add a Product to Your Order", icon: "plus", count: 0, percentage: 0 },
    { feature: "Change Product Quantities", icon: "edit", count: 0, percentage: 0 },
    { feature: "Replace a Product", icon: "horizontal-arrows", count: 0, percentage: 0 },
    { feature: "Change Product Options", icon: "settings", count: 0, percentage: 0 },
    { feature: "Apply a Discount Code", icon: "discount", count: 0, percentage: 0 },
    { feature: "Select a Shipping Method", icon: "delivery", count: 0, percentage: 0 },
    { feature: "Request Order Cancellation", icon: "delete", count: 0, percentage: 0 },
    { feature: "Change Contact Information", icon: "phone", count: 0, percentage: 0 },
    { feature: "Download Invoice", icon: "note", count: 0, percentage: 0 },
  ];

  const topPerformingFeatures = [
    "Edit Shipping Address",
    "Add a Product to Your Order",
    "Change Product Quantities",
    "Replace a Product",
    "Change Product Options",
  ];

  const featuresNeedingAttention = [
    { name: "Edit Shipping Address", uses: 0 },
    { name: "Add a Product to Your Order", uses: 0 },
    { name: "Change Product Quantities", uses: 0 },
    { name: "Replace a Product", uses: 0 },
    { name: "Change Product Options", uses: 0 },
  ];

  const usageInsights = {
    highAdoption: [],
    growthOpportunity: [],
    monitorClosely: [],
  };

  useEffect(() => {
    const fetchShopData = async () => {
      try {
        const formData = new FormData();
        formData.append("_action", "GET_SHOP_NAME");

        const response = await fetch("/app/fetch-data", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          console.error("Network response was not ok", response.status, response.statusText);
          return;
        }

        const responseData = await response.json();
        const name = responseData?.data?.shop?.name || "";
        setShopName(name);
        console.log("Shop name:", name);
      } catch (error) {
        console.error("Error fetching shop data", error);
      }
    };

    fetchShopData();
  }, []);
  return (
    <s-page heading="Dashboard">
      <s-section>
        <s-banner heading="Some app extensions are not enabled" tone="warning">
          The following required app extensions are not enabled: <strong>Order status page</strong>.
          Please enable them from Shopify theme editor.
        </s-banner>
      </s-section>

      <s-section>
        <s-stack direction="inline" gap="base" align-items="center">
          <s-text color="subdued">Track order usage and customer engagement</s-text>
          {shopName ? <s-text color="subdued">Shop: {shopName}</s-text> : null}
          <s-button variant="secondary">Last 7 days</s-button>
          <s-button variant="primary" disabled={isLoading} onClick={handleRefresh}>
            {isLoading ? "Refreshing..." : "Refresh"}
          </s-button>
        </s-stack>
      </s-section>

      <s-section>
        <s-banner heading="Secondary payment" tone="info">
          Edited orders may create a secondary payment needing manual capture, all edits sync in real
          time.
        </s-banner>
      </s-section>

      <s-section>
        <s-box border="base" border-radius="base">
          <s-box padding="base">
            <s-heading>Feature Usage Overview</s-heading>
          </s-box>
          <s-divider />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
            {[
              { label: "Total Orders", value: "0" },
              { label: "Total Edited Orders", value: "0" },
              { label: "Active Features", value: "0 / 10" },
            ].map((stat, idx) => (
              <div
                key={idx}
                style={{ padding: "16px", borderRight: idx < 2 ? "1px solid #e1e3e5" : "none" }}
              >
                <s-text color="subdued">{stat.label}</s-text>
                <s-heading>{stat.value}</s-heading>
              </div>
            ))}
          </div>
        </s-box>
      </s-section>

      <s-section>
        <s-box border="base" border-radius="base" padding="base">
          <s-stack direction="block" gap="base">
            <s-heading>Recent order activities</s-heading>
            <s-stack direction="block" gap="base" style={{ alignItems: "center" }}>
              <s-text type="strong">No order history yet</s-text>
              <s-text color="subdued">
                Once you start editing orders, your history will appear here.
              </s-text>
            </s-stack>
          </s-stack>
        </s-box>
      </s-section>

      <s-section>
        <s-box border="base" border-radius="base">
          <s-box padding="base">
            <s-heading>Feature Usage Statistics</s-heading>
          </s-box>
          <s-divider />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 160px 150px",
              padding: "8px 16px",
              background: "#F9FAFB",
              borderBottom: "1px solid #e1e3e5",
            }}
          >
            <s-text color="subdued">Feature</s-text>
            <s-text color="subdued" style={{ textAlign: "center" }}>
              Usage Count
            </s-text>
            <s-text color="subdued" style={{ textAlign: "right" }}>
              Adoption Rate
            </s-text>
          </div>
          {featureUsageData.map((item, index) => (
            <div
              key={index}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 160px 150px",
                padding: "10px 16px",
                borderBottom: index < featureUsageData.length - 1 ? "1px solid #f1f3f5" : "none",
                alignItems: "center",
              }}
            >
              <s-stack direction="inline" gap="base" align-items="center">
                <s-icon type={item.icon} />
                <s-text>{item.feature}</s-text>
              </s-stack>
              <s-text color="subdued" style={{ textAlign: "center" }}>
                {item.count}
              </s-text>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    flex: 1,
                    height: 8,
                    borderRadius: 999,
                    background: "#e5e7eb",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${item.percentage}%`,
                      height: "100%",
                      background: "#008060",
                    }}
                  />
                </div>
                <s-text color="subdued">{item.percentage}%</s-text>
              </div>
            </div>
          ))}
        </s-box>
      </s-section>

      <s-section>
        <s-grid grid-template-columns="1fr 1fr" gap="base">
          <s-box border="base" border-radius="base">
            <s-box padding="base">
              <s-heading>Top Performing Features</s-heading>
            </s-box>
            <s-divider />
            <s-box padding="base">
              <s-stack direction="block" gap="base">
                {topPerformingFeatures.map((feature, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 0",
                      borderBottom: index < topPerformingFeatures.length - 1 ? "1px solid #f1f3f5" : "none",
                    }}
                  >
                    <s-stack direction="inline" gap="base" align-items="center">
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          background: "#e1e3e5",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                      >
                        {index + 1}
                      </div>
                      <s-text>{feature}</s-text>
                    </s-stack>
                    <s-text color="subdued">0 uses</s-text>
                  </div>
                ))}
              </s-stack>
            </s-box>
          </s-box>

          <s-box border="base" border-radius="base">
            <s-box padding="base">
              <s-heading>Features Needing Attention</s-heading>
            </s-box>
            <s-divider />
            <s-box padding="base">
              <s-stack direction="block" gap="base">
                {featuresNeedingAttention.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 0",
                      borderBottom:
                        index < featuresNeedingAttention.length - 1 ? "1px solid #f1f3f5" : "none",
                    }}
                  >
                    <s-stack direction="inline" gap="base" align-items="center">
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          background: "#e1e3e5",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                      >
                        {index + 1}
                      </div>
                      <s-text>{item.name}</s-text>
                    </s-stack>
                    <s-text color="subdued">0 uses</s-text>
                  </div>
                ))}
              </s-stack>
            </s-box>
          </s-box>
        </s-grid>
      </s-section>

      <s-section>
        <s-box border="base" border-radius="base">
          <s-box padding="base">
            <s-heading>Usage Insights</s-heading>
          </s-box>
          <s-divider />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
            {[
              { label: "High Adoption", color: "#008060", items: usageInsights.highAdoption },
              { label: "Growth Opportunity", color: "#458fcc", items: usageInsights.growthOpportunity },
              { label: "Monitor Closely", color: "#b47c00", items: usageInsights.monitorClosely },
            ].map((col, idx) => (
              <div
                key={idx}
                style={{ padding: "16px", borderRight: idx < 2 ? "1px solid #e1e3e5" : "none" }}
              >
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: col.color,
                    marginBottom: 10,
                  }}
                >
                  {col.label}
                </p>
                {col.items.length === 0 ? (
                  <s-text color="subdued">No data yet</s-text>
                ) : (
                  col.items.map((item, i) => <s-text key={i}>{item}</s-text>)
                )}
              </div>
            ))}
          </div>
        </s-box>
      </s-section>
    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
