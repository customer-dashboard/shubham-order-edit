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
    <s-page heading={`Hello, ${shopName}! 👋`}>
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
            Setup usually takes less than a mi  nute and only needs to be done once.
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
          <s-stack gap="small">
            <s-stack gap="tight">
              <s-heading variant="headingMd">Master Your Order Experience</s-heading>
              <s-text color="subdued" variant="bodySm">
                Give customers real-time control over their orders
              </s-text>
            </s-stack>

            <s-stack gap="base">
              {[
                "Quickly update contact details & shipping information",
                "Easily remove products or adjust quantities anytime",
                "Add new items to existing orders in seconds",
                "Automatic refunds handled smoothly in the background"
              ].map(point => (
                <s-stack key={point} direction="inline" gap="small" alignItems="center">
                  <s-icon type="check" tone="success" size="small" />
                  <s-text variant="bodySm">{point}</s-text>
                </s-stack>
              ))}
            </s-stack>

            <s-button variant="primary" href="/settings" fullWidth>
              Customize Order Controls
            </s-button>
          </s-stack>
        </s-section>

        <s-section>
          <s-stack gap="small">
            <s-stack gap="tight">
              <s-heading variant="headingMd">Set Smart Editing Rules</s-heading>
              <s-text color="subdued" variant="bodySm">
                Stay in control by deciding exactly who can edit orders and when.
              </s-text>
            </s-stack>

            <s-stack gap="base">
              {[
                "Flexible editing windows (from 30 minutes up to 24 hours)",
                "Restrict access based on customer tags",
                "Control permissions using order tags",
                "Enable or block editing for specific product tags"
              ].map(point => (
                <s-stack key={point} direction="inline" alignItems="center" gap="small">
                  <s-icon type="check" tone="success" size="small" />
                  <s-text variant="bodySm">{point}</s-text>
                </s-stack>
              ))}
            </s-stack>

            <s-button variant="secondary" href="/settings" fullWidth>
              Configure Rules
            </s-button>
          </s-stack>
        </s-section>
      </s-grid>


      <s-section heading="Recommended apps">
        <s-grid
          gridTemplateColumns="1fr auto"
          alignItems="center"
          paddingBlockEnd="small-400"
        >
        </s-grid>
        <s-grid
          gridTemplateColumns="repeat(auto-fit, minmax(240px, 1fr))"
          gap="base"
        >
          {/* Featured app 1 */}
          <s-clickable
            href="https://apps.shopify.com/customer-dashboard-pro"
            border="base"
            borderRadius="base"
            padding="base"
            inlineSize="100%"
            accessibilityLabel=""
          >
            <s-grid
              gridTemplateColumns="auto 1fr auto"
              alignItems="stretch"
              gap="base"
            >
              <s-thumbnail
                size="small"
                src="https://cdn.shopify.com/app-store/listing_images/ee5b2c78feec2e8755c58cc3056c58f6/icon/CM29wYjDr40DEAE=.png"
                alt="Custlo ‑ Customer accounts app icon"
              />
              <s-box>
                <s-heading>Custlo ‑ Customer accounts app</s-heading>
                <s-paragraph> Free trial available</s-paragraph>
                <s-paragraph>
                  Turn boring customer account pages into Loyalty Suite: smart personalized AI customer account pages..
                </s-paragraph>
              </s-box>
              <s-stack justifyContent="start">
                <s-button
                  href="https://apps.shopify.com/customer-dashboard-pro"
                  icon="download"
                  accessibilityLabel="Custlo ‑ Customer accounts app"
                />
              </s-stack>
            </s-grid>
          </s-clickable>
          {/* Featured app 2 */}
          <s-clickable
            href="https://apps.shopify.com/checkout-extensions-pro"
            border="base"
            borderRadius="base"
            padding="base"
            inlineSize="100%"
            accessibilityLabel="Checkout Extensions Pro ‑ MT"
          >
            <s-grid
              gridTemplateColumns="auto 1fr auto"
              alignItems="stretch"
              gap="base"
            >
              <s-thumbnail
                size="small"
                src="https://cdn.shopify.com/app-store/listing_images/f0744aa7ec85f7d412692b264a7613a6/icon/CLS1jNz6yo0DEAE=.png"
                alt="Checkout Extensions Pro ‑ MT icon"
              />
              <s-box>
                <s-heading>Checkout Extensions Pro ‑ MT</s-heading>
                <s-paragraph>Free trial available</s-paragraph>
                <s-paragraph>
                  Powerful App for Checkout Custom Fields, Rules & Customization, Upsells, Conversion, Branding etc.
                </s-paragraph>
              </s-box>
              <s-stack justifyContent="start">
                <s-button
                  href="https://apps.shopify.com/checkout-extensions-pro"
                  icon="download"
                  accessibilityLabel="Checkout Extensions Pro ‑ MT"
                />
              </s-stack>
            </s-grid>
          </s-clickable>
        </s-grid>
      </s-section>

      <s-stack alignItems="center" paddingBlock="large">
        <s-text color="subdued">
          Learn more about <s-link href="https://help.shopify.com" target="_blank">Order Editing</s-link> or <s-link href="mailto:support@example.com">Contact Support</s-link>.
        </s-text>
      </s-stack>
    </s-page>
  );
}
