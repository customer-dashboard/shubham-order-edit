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
      {config?.limit_reached && (
        <s-box paddingBlockEnd="base">
          <s-banner
            heading="Monthly Edit Limit Reached"
            tone="critical"
          >
            You have reached your monthly order edit limit. Extensions are currently disabled for customers.
            <s-button slot="primary-action" variant="primary" href="/plans">
              Upgrade Plan
            </s-button>
          </s-banner>
        </s-box>
      )}

      {isOrderEditActive ? (
        <s-section>
          <s-grid
            gridTemplateColumns="1fr auto"
            alignItems="center"
            gap="base"
          >
            <s-box>
              <s-heading>Order Editing is Live! 🎉</s-heading>
              <s-paragraph color="subdued">
                Your customers can now fix their own order mistakes. You can manage features and rules in the settings.
              </s-paragraph>
            </s-box>
            <s-badge tone="success">Active</s-badge>
          </s-grid>
        </s-section>
      ) : (
        <s-section>
          <s-grid
            gridTemplateColumns="1fr auto"
            alignItems="center"
            gap="base"
          >
            <s-box>
              <s-heading>Unlock Self-Service Order Editing</s-heading>
              <s-paragraph color="subdued">
                Give your customers the power to fix mistakes instantly without contacting support. Setup takes less than 2 minutes.
              </s-paragraph>
            </s-box>
            <s-button
              variant="primary"
              href={`shopify:admin/settings/checkout/editor?page=order-status&context=apps&app=${shopify.config.apiKey}`}
            >
              Add Block
            </s-button>
          </s-grid>
        </s-section>
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
              'phone_number_editing',
              'invoice_download',
              'delivery_instructions',
              'order_line_items_editing',
              'adding_more_products'
            ].filter(key => config?.[key]?.status === 'enable').length} / 6
          </s-heading>
        </s-section>
      </s-grid>


      {/* Analytics Chart Section */}
      <s-section>
        <s-grid gap="base">
          <s-grid gridTemplateColumns="1fr auto" alignItems="center">
            <s-box>
              <s-heading variant="headingLg">Performance Overview</s-heading>
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
        <s-section heading="Empower Your Customers">
          <s-stack gap="small">
            <s-text color="subdued">
              Reduce support volume by allowing customers to fix shipping details, swap items, or add products themselves.
            </s-text>

            <s-stack gap="base">
              {[
                "Update shipping address & phone",
                "Remove items or adjust quantities",
                "Add new products to existing orders"
              ].map(text => (
                <s-stack key={text} direction="inline" gap="small" alignItems="center">
                  <s-icon type="check" tone="success" size="small" />
                  <s-text variant="bodySm">{text}</s-text>
                </s-stack>
              ))}
            </s-stack>

            <s-button variant="primary" href="/settings" fullWidth>
              Enable Edit Features
            </s-button>
          </s-stack>
        </s-section>

        <s-section heading="Automate Your Workflow">
          <s-stack gap="small">
            <s-text color="subdued">
              Define smart time windows and restrictions to ensure order editing fits your fulfillment process perfectly.
            </s-text>

            <s-stack gap="base">
              {[
                "Set custom editing time windows",
                "Restrict by customer or order tags",
                "Provide instant invoice downloads"
              ].map(text => (
                <s-stack key={text} direction="inline" gap="small" alignItems="center">
                  <s-icon type="check" tone="success" size="small" />
                  <s-text variant="bodySm">{text}</s-text>
                </s-stack>
              ))}
            </s-stack>

            <s-button variant="secondary" href="/settings" fullWidth>
              Setup Global Rules
            </s-button>
          </s-stack>
        </s-section>
      </s-grid>


      <s-section heading="Recommended apps">
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
          >
            <s-grid
              gridTemplateColumns="auto 1fr auto"
              alignItems="stretch"
              gap="base"
            >
              <s-thumbnail
                size="small"
                src="https://cdn.shopify.com/app-store/listing_images/ee5b2c78feec2e8755c58cc3056c58f6/icon/CM29wYjDr40DEAE=.png"
                alt="Custlo icon"
              />
              <s-box>
                <s-heading>Custlo ‑ Customer accounts app</s-heading>
                <s-paragraph>
                  Turn boring customer account pages into smart personalized AI portals.
                </s-paragraph>
              </s-box>
              <s-stack justifyContent="start">
                <s-button
                  href="https://apps.shopify.com/customer-dashboard-pro"
                  icon="download"
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
          >
            <s-grid
              gridTemplateColumns="auto 1fr auto"
              alignItems="stretch"
              gap="base"
            >
              <s-thumbnail
                size="small"
                src="https://cdn.shopify.com/app-store/listing_images/f0744aa7ec85f7d412692b264a7613a6/icon/CLS1jNz6yo0DEAE=.png"
                alt="Checkout Extensions icon"
              />
              <s-box>
                <s-heading>Checkout Extensions Pro ‑ MT</s-heading>
                <s-paragraph>
                  Powerful app for checkout custom fields, rules, and upsells.
                </s-paragraph>
              </s-box>
              <s-stack justifyContent="start">
                <s-button
                  href="https://apps.shopify.com/checkout-extensions-pro"
                  icon="download"
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
