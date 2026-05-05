import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import { LineChart } from "@shopify/polaris-viz";
import { DEFAULT_ANALYTICS } from "../../constants/defaultSettings";




export default function DashboardPage() {
  const [metrics, setMetrics] = useState({ totalEdits: 0, todayEdits: 0, yesterdayEdits: 0, change: 0 });
  const [shopName, setShopName] = useState("");
  const [loading, setLoading] = useState(true);
  const [isOrderEditActive, setIsOrderEditActive] = useState(false);
  const [isExtensionsLoading, setIsExtensionsLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState(DEFAULT_ANALYTICS);

  const [totalOrders, setTotalOrders] = useState(0);
  const { config } = useOutletContext();



  const [visible, setVisible] = useState({
    banner: true,
    setupGuide: true,
    calloutCard: true,
    featuredApps: true,
  });

  useEffect(() => {
    const loaddata = async () => {
      shopify.loading(true)
      try {
        // Direct API Access for Shopify Data
        const shopPromise = fetch('shopify:admin/api/graphql.json', {
          method: 'POST',
          body: JSON.stringify({
            query: `query {
              shop {
                name
                metafield(namespace: "order_editing", key: "analytics_30d") {
                  value
                }
              }
              ordersCount {
                count
              }
            }`

          })
        }).then(r => r.json());


        // Independent Backend calls for MongoDB Data
        const metricsPromise = fetch('/app/fetch-data', {
          method: 'POST',
          body: (() => {
            const fd = new FormData();
            fd.append("_action", "GET_DASHBOARD_METRICS");
            return fd;
          })()
        }).then(r => r.json());

        const [shopResp, metricsResp] = await Promise.all([
          shopPromise,
          metricsPromise
        ]);

        // 1. Handle Shop & Metafield Data
        if (shopResp.data?.shop) {
          setShopName(shopResp.data.shop.name);
          const metaValue = shopResp.data.shop.metafield?.value;
          if (metaValue) {
            try {
              const parsed = JSON.parse(metaValue);
              setAnalyticsData(prev => ({ ...prev, ...parsed }));
            } catch (e) { console.error("Metafield parse error:", e); }
          }
        }

        if (shopResp.data?.ordersCount) {
          setTotalOrders(shopResp.data.ordersCount.count);
        }

        // 2. Handle Backend Metrics (Fallback/Sync)
        if (metricsResp.data?.analytics) {
          setAnalyticsData(prev => ({ ...prev, ...metricsResp.data.analytics }));
        }

        // 4. Handle Extensions Status (Non-blocking)
        try {
          const extensions = await shopify.app.extensions();
          const result = extensions.find(item => item.handle === "order-edit");
          setIsOrderEditActive(!!(result && result.activations.length > 0));
        } catch (e) {
          console.warn("App Bridge Extensions API error:", e);
        } finally {
          setIsExtensionsLoading(false);
        }


      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setIsExtensionsLoading(false);
        setLoading(false);
        shopify.loading(false)
      }
    }
    loaddata()
  }, [])

  const prepareChartData = (backendData) => {
    const filledData = [];
    const statsMap = backendData || {};

    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = String(d.getDate()).padStart(2, '0');
      const monthStr = String(d.getMonth() + 1).padStart(2, '0');
      const yearStr = d.getFullYear();
      const key = `${dayStr}/${monthStr}/${yearStr}`;

      const value = statsMap[key];
      filledData.push({
        key,
        value: typeof value === 'object' && value !== null ? (value.totaledits || 0) : (Number(value) || 0)
      });
    }
    return filledData;
  };

  if (loading || isExtensionsLoading) {
    return null
  }

  return (
    <s-page heading={`Welcome, ${shopName}`}>
      {isOrderEditActive ? (
        <s-banner
          heading="Order edits are active"
          tone="success"
          dismissible
        >
          Your app is connected and order edits are enabled on the order status page.
          <s-paragraph color="subdued">
            Customers can now fix mistakes after checkout without contacting support.
          </s-paragraph>
        </s-banner>
      ) : (
        <s-banner heading="Enable order edits on your store" tone="warning">
          <s-paragraph>
            Turn on order editing so customers can update items after checkout instead of
            cancelling and re‑ordering.
          </s-paragraph>
          <s-paragraph color="subdued">
            Setup usually takes less than a minute and only needs to be done once.
          </s-paragraph>

          <s-button
            slot="secondary-actions"
            variant="secondary"
            href="shopify:admin/settings/checkout/editor?page=order-status&context=apps&app=ee0d8eb337181cafaf7912854e760d1d"
          >
            Open checkout settings
          </s-button>
        </s-banner>
      )}

      {/* Summary Metrics Section */}
      <s-grid gridTemplateColumns="1fr 1fr 1fr" gap="base" paddingBlockEnd="base">
        <s-section heading="Total Orders">
          <s-heading variant="headingLg">{totalOrders}</s-heading>
        </s-section>
        <s-section heading="Total Edited Orders">
          <s-heading variant="headingLg">{analyticsData?.totalorderedit || metrics?.totalEdits || 0}</s-heading>
        </s-section>




        <s-section heading="Active Features">
          <s-heading variant="headingLg">
            {[
              'shipping_address_editing',
              'discount_code',
              'phone_number_editing',
              'invoice_download',
              'delivery_instructions',
              'order_line_items_editing',
              'adding_more_products'
            ].filter(key => config?.[key]?.status === 'enable').length} / 7
          </s-heading>
        </s-section>


      </s-grid>


      {/* Analytics Chart Section */}
      <s-section>
        <s-grid gap="base">
          <s-grid gridTemplateColumns="1fr auto" alignItems="center">
            <s-box>
              <s-heading variant="headingLg">Overview</s-heading>
              <s-text color="subdued">Last 30 days</s-text>
            </s-box>
            <s-link href="/analytics">Detailed analytics →</s-link>
          </s-grid>

          <s-box minHeight="300px" paddingBlockStart="base">
            {(() => {
              const chartData = prepareChartData(analyticsData?.last30daysdata);
              const maxVal = Math.max(0, ...chartData.map(d => d.value));
              return (
                <LineChart
                  data={[
                    {
                      name: "Total Edits",
                      data: chartData,
                      showPoints: false,
                    },
                  ]}
                  showLegend={false}
                  yAxisOptions={{
                    integersOnly: true,
                  }}
                />
              );
            })()}
          </s-box>
        </s-grid>
      </s-section>


      {/* Feature Highlights Section */}
      <s-grid gridTemplateColumns="1fr 1fr" gap="base" paddingBlockEnd="base">
        <s-section>
          <s-stack gap="loose">
            <s-stack gap="tight">
              <s-heading variant="headingMd">Master Order Management</s-heading>
              <s-text color="subdued" variant="bodySm">Give your customers full control over their orders with advanced editing features.</s-text>
            </s-stack>

            <s-stack gap="base">
              {[
                "Effortless contact & shipping info updates",
                "Smart product removals & quantity adjustments",
                "Instant adding of new items to existing orders",
                "Seamless automated refund processing"
              ].map(point => (
                <s-stack key={point} direction="inline" gap="extraTight" alignItems="center">
                  <s-icon type="checkmark" tone="success" size="small" />
                  <s-text variant="bodySm">{point}</s-text>
                </s-stack>
              ))}
            </s-stack>

            <s-button variant="primary" href="/settings" fullWidth>
              Configure Features
            </s-button>
          </s-stack>
        </s-section>

        <s-section>
          <s-stack gap="loose">
            <s-stack gap="tight">
              <s-heading variant="headingMd">Control Editing Windows</s-heading>
              <s-text color="subdued" variant="bodySm">Set precise time limits and rules for when orders can be modified.</s-text>
            </s-stack>

            <s-stack gap="base">
              {[
                "Custom editing limits (30 mins to 24 hours)",
                "Tag-based and customer-based restrictions",
                "Automatic order status & tag synchronization",
                "Real-time expiration tracking for customers"
              ].map(point => (
                <s-stack key={point} direction="inline" gap="extraTight" alignItems="center">
                  <s-icon type="checkmark" tone="success" size="small" />
                  <s-text variant="bodySm">{point}</s-text>
                </s-stack>
              ))}
            </s-stack>

            <s-button variant="secondary" href="/settings" fullWidth>
              Manage Time Settings
            </s-button>
          </s-stack>
        </s-section>
      </s-grid>

      {/* Recommended Apps Section */}
      <s-section>
        <s-grid
          gridTemplateColumns="1fr auto"
          alignItems="center"
          paddingBlockEnd="small-400"
        >
          <s-heading>Recommended apps</s-heading>
        </s-grid>
        <s-grid
          gridTemplateColumns="repeat(auto-fit, minmax(240px, 1fr))"
          gap="base"
        >
          <s-clickable
            href="https://apps.shopify.com/customer-dashboard-pro"
            border="base"
            borderRadius="base"
            padding="base"
            inlineSize="100%"
          >
            <s-grid gridTemplateColumns="auto 1fr auto" alignItems="stretch" gap="base">
              <s-thumbnail
                size="small"
                src="https://cdn.shopify.com/s/files/1/0667/0067/3266/files/Custlo_logo_design020.png?v=1749099271"
                alt="Custlo icon"
              />
              <s-box>
                <s-heading>Custlo : Customer Account Pro</s-heading>
                <s-paragraph>Customize the customer account page with ease.</s-paragraph>
              </s-box>
            </s-grid>
          </s-clickable>
        </s-grid>
      </s-section>

      <s-stack alignItems="center" paddingBlock="large">
        <s-text color="subdued">
          Learn more about <s-link href="https://help.shopify.com" target="_blank">Order Editing</s-link>.
        </s-text>
      </s-stack>
    </s-page>
  );
}
