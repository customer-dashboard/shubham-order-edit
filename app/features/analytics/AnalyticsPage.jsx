import { useEffect, useState } from "react";
import { LineChart } from "@shopify/polaris-viz";
import { DateRangePickerWeb } from "./components/DateRangePickerWeb";


export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activities, setActivities] = useState([]);

  const [dateRange, setDateRange] = useState(() => {
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const start = new Date(end);
    start.setDate(start.getDate() - 29);
    return { start, end };
  });

  const [totalOrdersRange, setTotalOrdersRange] = useState(0);

  const loadAnalytics = async (range) => {
    shopify.loading(true)
    setLoading(true);
    try {
      const toLocalYMD = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      };
      const rangeStr = `${toLocalYMD(range.start)}--${toLocalYMD(range.end)}`;

      // 1. Fetch Detailed Analytics from Backend
      const response = await fetch('/app/fetch-data', {
        method: 'POST',
        body: (() => {
          const fd = new FormData();
          fd.append("_action", "GET_DETAILED_ANALYTICS");
          fd.append("range", rangeStr);
          return fd;
        })()
      });
      const result = await response.json();

      // 2. Fetch Orders Count via Direct Admin API
      const startISO = range.start.toISOString();
      const endISO = range.end.toISOString();
      const gqlResponse = await fetch('shopify:admin/api/graphql.json', {
        method: 'POST',
        body: JSON.stringify({
          query: `query OrdersCountByDateRange($query: String!) {
            ordersCount(query: $query) {
              count
            }
          }`,
          variables: {
            query: `created_at:>='${startISO}' created_at:<='${endISO}'`
          }
        })
      }).then(r => r.json());

      setTotalOrdersRange(gqlResponse.data?.ordersCount?.count || 0);
      setData(result.data);

    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
      shopify.loading(false)
    }
  };

  const loadRecentActivity = async () => {
    try {
      // 1. Fetch from GraphQL Metafield (Fallback/Sync)
      const gqlResponse = await fetch('shopify:admin/api/graphql.json', {
        method: 'POST',
        body: JSON.stringify({
          query: `query {
            shop {
              metafield(namespace: "order_editing", key: "analytics_30d") {
                value
              }
            }
          }`
        })
      }).then(r => r.json());

      const metaValue = gqlResponse.data?.shop?.metafield?.value;
      if (metaValue) {
        try {
          const parsed = JSON.parse(metaValue);
          if (parsed.last10activity) setActivities(parsed.last10activity);
        } catch (e) { console.error("Metafield parse error:", e); }
      }

      // 2. Fetch from Backend (Primary)
      const response = await fetch('/app/fetch-data', {
        method: 'POST',
        body: (() => {
          const fd = new FormData();
          fd.append("_action", "GET_RECENT_ACTIVITY");
          return fd;
        })()
      });
      const result = await response.json();
      if (result.data?.activities && result.data.activities.length > 0) {
        setActivities(result.data.activities);
      }
    } catch (error) {
      console.error("Error loading recent activity:", error);
    }
  };


  useEffect(() => {
    loadAnalytics(dateRange);
    loadRecentActivity(); // Independent from dateRange
  }, [dateRange]);

  const prepareChartData = (backendData, range) => {
    if (!backendData || !range) return [];

    const filledData = [];
    const statsMap = Object.fromEntries(backendData.map(d => [d.key, d.value]));

    // Helper to get YYYY-MM-DD in local time
    const toLocalYMD = (date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    const curr = new Date(range.start);
    const end = new Date(range.end);
    const endStr = toLocalYMD(end);

    while (true) {
      const dayStr = toLocalYMD(curr);
      filledData.push({
        key: dayStr,
        value: statsMap[dayStr] || 0
      });

      if (dayStr === endStr) break;
      curr.setDate(curr.getDate() + 1);
      if (curr > new Date(end.getTime() + 86400000)) break;
    }

    return filledData;
  };

  if (loading && !data) {
    return null
  }

  return (
    <s-page heading="Detailed Analytics">
      {/* Date Picker Trigger (Top Right) */}
      <s-stack gap="base" justifyContent="start" alignItems="start" paddingBlockEnd="base">
        <DateRangePickerWeb
          value={dateRange}
          onDateRangeSelect={(range) => setDateRange(range)}
        />
      </s-stack>
      <s-grid gridTemplateColumns="1fr 1fr" alignItems="center" gap="base" paddingBlockEnd="base">
        <s-section heading="Total order">
          <s-heading variant="headingLg">{totalOrdersRange}</s-heading>
        </s-section>
        <s-section heading="Total edits">
          <s-heading variant="headingLg">
            {data?.chartData?.reduce((acc, curr) => acc + curr.value, 0) || 0}
          </s-heading>
        </s-section>
      </s-grid>
      <s-section>
        <s-box border="all" borderRadius="base">
          <s-heading variant="headingMd">Total Order Edits</s-heading>
          {loading ? (
            <s-box paddingBlock="large-400">
              <s-skeleton-body-text lines={5} />
            </s-box>
          ) : (
            <s-box minHeight="400px" paddingBlockStart="base">
              {(() => {
                const chartData = prepareChartData(data?.chartData, dateRange);
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
          )}
        </s-box>
      </s-section>
      <s-section heading="Feature Usage">
        <s-box >
          <s-grid gridTemplateColumns="1fr auto" alignItems="center" padding="small-100" gap="base">
            <s-box>
              <s-heading>Shipping Address Editing</s-heading>
            </s-box>
            <s-heading variant="headingLg">{data?.counts?.total_shipping_address_editing || 0}</s-heading>
          </s-grid>
          <s-box paddingInline="small-100">
            <s-divider />
          </s-box>
          <s-grid gridTemplateColumns="1fr auto" alignItems="center" padding="small-100" gap="base">
            <s-box>
              <s-heading>Phone Number Editing</s-heading>
            </s-box>
            <s-heading variant="headingLg">{data?.counts?.total_phone_number_editing || 0}</s-heading>
          </s-grid>
          <s-box paddingInline="small-100">
            <s-divider />
          </s-box>

          <s-grid gridTemplateColumns="1fr auto" alignItems="center" padding="small-100" gap="base">
            <s-box>
              <s-heading>Invoice Download</s-heading>
            </s-box>
            <s-heading variant="headingLg">{data?.counts?.total_invoice_download || 0}</s-heading>
          </s-grid>
          <s-box paddingInline="small-100">
            <s-divider />
          </s-box>
          <s-grid gridTemplateColumns="1fr auto" alignItems="center" padding="small-100" gap="base">
            <s-box>
              <s-heading>Delivery Instructions</s-heading>
            </s-box>
            <s-heading variant="headingLg">{data?.counts?.total_delivery_instructions || 0}</s-heading>
          </s-grid>
          <s-box paddingInline="small-100">
            <s-divider />
          </s-box>
          <s-grid gridTemplateColumns="1fr auto" alignItems="center" padding="small-100" gap="base">
            <s-box>
              <s-heading>Order Line Items Editing</s-heading>
            </s-box>
            <s-heading variant="headingLg">{data?.counts?.total_order_line_items_editing || 0}</s-heading>
          </s-grid>
          <s-box paddingInline="small-100">
            <s-divider />
          </s-box>
          <s-grid gridTemplateColumns="1fr auto" alignItems="center" padding="small-100" gap="base">
            <s-box>
              <s-heading>Adding More Products</s-heading>
            </s-box>
            <s-heading variant="headingLg">{data?.counts?.total_adding_more_products || 0}</s-heading>
          </s-grid>
        </s-box>
      </s-section>

      {activities && activities.length > 0 ? (
        <s-section padding="none">
          <s-box padding="base">
            <s-heading>Recent Activity</s-heading>
          </s-box>
          <s-table >
            <s-table-header-row>
              <s-table-header listSlot="primary">Order</s-table-header>
              <s-table-header>Activity</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {activities.slice(0, 10).map((activity) => (
                <s-table-row key={activity.id}>
                  <s-table-cell>
                    <s-link href={`shopify:admin/orders/${activity.orderId?.split("/").pop()}`}>
                      {activity.orderName || activity.orderId?.split("/").pop()}
                    </s-link>
                  </s-table-cell>
                  <s-table-cell>
                    <s-stack direction="inline" gap="extraTight" alignItems="center">
                      <s-badge tone="info">{activity.message}</s-badge>
                    </s-stack>
                  </s-table-cell>
                </s-table-row>
              ))}
            </s-table-body>
          </s-table>
        </s-section>
      ) : (
        <s-section accessibilityLabel="Empty state section">
          <s-box padding="base">
            <s-heading>Recent Activity</s-heading>
          </s-box>
          <s-grid gap="base" justifyItems="center" paddingBlock="large-400">
            <s-box maxInlineSize="200px" maxBlockSize="200px">
              <s-image
                aspectRatio="1/0.5"
                src="https://cdn.shopify.com/static/images/polaris/patterns/callout.png"
                alt="Empty state graphic"
              />
            </s-box>
            <s-grid justifyItems="center" maxInlineSize="450px" gap="base">
              <s-stack alignItems="center">
                <s-heading>No activity yet</s-heading>
                <s-paragraph>
                  When orders are edited, they will appear here.
                </s-paragraph>
              </s-stack>
            </s-grid>
          </s-grid>
        </s-section>
      )}

      <s-stack alignItems="center" paddingBlock="large">
        <s-text>Learn more about <s-link href="">Order Editing</s-link>.</s-text>
      </s-stack>
    </s-page>
  );
}
