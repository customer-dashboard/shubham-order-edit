import { useEffect, useState } from "react";
import { LineChart } from "@shopify/polaris-viz";

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const response = await fetch('/app/fetch-data', {
          method: 'POST',
          body: (() => {
            const fd = new FormData();
            fd.append("_action", "GET_DETAILED_ANALYTICS");
            return fd;
          })()
        });
        const result = await response.json();
        setData(result.data);
      } catch (error) {
        console.error("Error loading analytics:", error);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <s-page heading="Detailed Analytics">
        <s-section>
          <s-box paddingBlock="large-400">
             <s-skeleton-body-text lines={10} />
          </s-box>
        </s-section>
      </s-page>
    );
  }

  return (
    <s-page heading="Detailed Analytics">
      <s-section>
        <s-box padding="base" border="all" borderRadius="base">
          <s-heading variant="headingMd">Historical Order Edits</s-heading>
          <s-paragraph color="subdued">Detailed breakdown of order edits over time from your database.</s-paragraph>
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
        </s-box>
      </s-section>
    </s-page>
  );
}
