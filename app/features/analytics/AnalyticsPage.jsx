import { useEffect, useState } from "react";
import { LineChart } from "@shopify/polaris-viz";
import { DateRangePickerWeb } from "./components/DateRangePickerWeb";


export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const [dateRange, setDateRange] = useState(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return { start, end };
  });

  const loadAnalytics = async (range) => {
    shopify.loading(true)
    setLoading(true);
    try {
      const format = (d) => d.toISOString().split('T')[0];
      const rangeStr = `${format(range.start)}--${format(range.end)}`;

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
      setData(result.data);
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
      shopify.loading(false)
    }
  };

  useEffect(() => {
    loadAnalytics(dateRange);
  }, [dateRange]);

  if (loading && !data) {
    return null
  }

  return (
    <s-page heading="Detailed Analytics">
      {/* Date Picker Trigger (Top Right) */}
      <s-stack gap="base" justifyContent="end" alignItems="end" paddingBlockEnd="base">
        <DateRangePickerWeb
          value={dateRange}
          onDateRangeSelect={(range) => setDateRange(range)}
        />
      </s-stack>
      <s-section>
        <s-box border="all" borderRadius="base">
          <s-heading variant="headingMd">Total Order Edits</s-heading>
          {loading ? (
            <s-box paddingBlock="large-400">
              <s-skeleton-body-text lines={5} />
            </s-box>
          ) : (
            <s-box minHeight="400px" paddingBlockStart="base">
              <LineChart
                data={[
                  {
                    name: "Total Edits",
                    data: data?.chartData || [],
                  }
                ]}
              />
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
              <s-heading>Customer support</s-heading>
            </s-box>
            <s-heading variant="headingLg">{data?.counts?.total_customer_support_chat_initiated || 0}</s-heading>
          </s-grid>
          <s-box paddingInline="small-100">
            <s-divider />
          </s-box>
          <s-grid gridTemplateColumns="1fr auto" alignItems="center" padding="small-100" gap="base">
            <s-box>
              <s-heading>Discount Code</s-heading>
            </s-box>
            <s-heading variant="headingLg">{data?.counts?.total_discount_code || 0}</s-heading>
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
      <s-stack alignItems="center">
        <s-text>Learn more about <s-link href="">creating puzzles</s-link>.</s-text>
      </s-stack>
    </s-page>
  );
}
